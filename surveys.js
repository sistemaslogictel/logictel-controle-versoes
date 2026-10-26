// =====================================================
// EDITOR DE SURVEYS (botão "7" na topbar)
// =====================================================
// Fluxo:
//  1) sobe o ZIP e informa os números dos surveys (um por linha)
//  2) cada XML das pastas "moradia" recebe um número no campo <gravado>
//  3) edita cada survey ou faz edições em lote (roteiro, logradouro, baixos, fachada...)
//  4) gera um novo ZIP com tudo aplicado
// Nada é enviado para servidor: o zip é lido e gerado no próprio navegador.
import { temPermissao } from './session.js';
import {
    listarCampos, aplicarOp, aplicarOps, definirGravado, gravadoAtual,
    montarCatalogo, ATALHOS, ehPastaMoradia, compararNatural, lerNumeros,
    decodificarBytes, codificarBytes, normalizar, GRAVADO
} from './surveys-xml.js';

const S = {
    zip: null,
    nomeZip: '',
    arquivos: [],      // { path, pasta, nome, date, enc, bom, original, ops, atual, saida, survey, gravadoOriginal, sel, aberto, filtro, rascunho }
    catalogo: new Map(),
    historico: [],     // lotes aplicados
    seq: 0,
    inicializado: false
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MAX_CAMPOS_PAINEL = 300;

// ---------- Botão da topbar ----------
export function atualizarBotaoSurvey() {
    const btn = $('btn-survey-topbar');
    if (btn) btn.style.display = temPermissao('surveys') ? '' : 'none';
}

// ---------- Mensagens ----------
function msg(texto, tipo = 'info') {
    const el = $('sv-msg');
    if (!el) return;
    const cor = tipo === 'erro' ? 'var(--danger)' : tipo === 'ok' ? 'var(--success)' : tipo === 'aviso' ? 'var(--gold)' : 'var(--text-muted)';
    el.style.color = cor;
    el.textContent = texto || '';
}

// ---------- Cálculo ----------
function recalcular(f) {
    f.atual = aplicarOps(f.original, f.ops);
    f.saida = f.survey ? definirGravado(f.atual, f.survey) : f.atual;
}

function recalcularCatalogo() {
    S.catalogo = montarCatalogo(S.arquivos.map((f) => f.atual));
}

// ---------- Leitura do ZIP ----------
async function lerZip(file) {
    if (!file) return;
    if (!window.JSZip) {
        msg('A biblioteca JSZip não carregou. Verifique a conexão com a internet e recarregue a página.', 'erro');
        return;
    }
    msg('Lendo o ZIP...');
    try {
        const zip = await window.JSZip.loadAsync(file);
        let entradas = Object.values(zip.files).filter((e) =>
            !e.dir && /\.xml$/i.test(e.name) && !/(^|\/)__MACOSX\//i.test(e.name) && !/(^|\/)\._/.test(e.name));
        if (!entradas.length) {
            msg('Nenhum arquivo .xml encontrado dentro do ZIP.', 'erro');
            return;
        }
        let aviso = '';
        const emMoradia = entradas.filter((e) => ehPastaMoradia(e.name));
        if (emMoradia.length) {
            entradas = emMoradia;
        } else {
            aviso = 'Nenhuma pasta com "moradia" no nome foi encontrada; considerei todos os XMLs do ZIP.';
        }
        entradas.sort((a, b) => compararNatural(a.name, b.name));

        const arquivos = [];
        for (const e of entradas) {
            const bytes = await e.async('uint8array');
            const { texto, enc, bom } = decodificarBytes(bytes);
            const i = e.name.lastIndexOf('/');
            const f = {
                path: e.name,
                pasta: i >= 0 ? e.name.slice(0, i) : '',
                nome: e.name.slice(i + 1),
                date: e.date,
                enc, bom,
                original: texto,
                ops: [],
                survey: '',
                gravadoOriginal: gravadoAtual(texto),
                sel: false, aberto: false, filtro: '', rascunho: {}
            };
            recalcular(f);
            arquivos.push(f);
        }
        S.zip = zip;
        S.nomeZip = file.name;
        S.arquivos = arquivos;
        S.historico = [];
        atribuirNumeros(false);
        recalcularCatalogo();
        $('sv-workspace').style.display = '';
        renderTudo();
        msg(`${arquivos.length} XML(s) carregado(s) de "${file.name}". ${aviso}`.trim(), aviso ? 'aviso' : 'ok');
    } catch (err) {
        console.error(err);
        msg('Não foi possível ler esse arquivo como ZIP: ' + (err?.message || err), 'erro');
    }
}

// ---------- Numeração dos surveys ----------
function atribuirNumeros(avisar = true) {
    const nums = lerNumeros($('sv-numeros').value);
    S.arquivos.forEach((f, i) => { f.survey = nums[i] ?? ''; recalcular(f); });
    const dup = nums.filter((n, i) => nums.indexOf(n) !== i);
    const total = S.arquivos.length;
    let info = `${nums.length} número(s) informado(s) para ${total} XML(s).`;
    if (nums.length < total && total) info += ` ${total - nums.length} XML(s) ficarão sem número (gravado não será alterado).`;
    if (nums.length > total && total) info += ` ${nums.length - total} número(s) sobrando serão ignorados.`;
    if (dup.length) info += ` Atenção: número(s) repetido(s): ${[...new Set(dup)].join(', ')}.`;
    $('sv-num-info').textContent = info;
    if (avisar) { renderLista(); renderResumo(); msg('Números aplicados na ordem das pastas.', 'ok'); }
}

// ---------- Renderização ----------
function renderTudo() {
    renderResumo();
    renderLote();
    renderHistorico();
    renderLista();
}

function renderResumo() {
    const n = S.arquivos.length;
    const comNum = S.arquivos.filter((f) => f.survey).length;
    const semGravado = S.arquivos.filter((f) => f.gravadoOriginal === null).length;
    const editados = S.arquivos.filter((f) => f.ops.length).length;
    let t = `<strong>${n}</strong> XML(s) · <strong>${comNum}</strong> com número de survey · <strong>${editados}</strong> com edições`;
    if (semGravado) t += ` · <span style="color:var(--gold)">${semGravado} sem o campo &lt;gravado&gt; (número não será gravado)</span>`;
    $('sv-resumo').innerHTML = t;
}

function renderLote() {
    // datalist com todos os campos
    const campos = [...S.catalogo.values()].sort((a, b) => compararNatural(a.tag, b.tag));
    $('sv-tags').innerHTML = campos.map((c) => `<option value="${esc(c.tag)}">${c.total} ocorrência(s)</option>`).join('');

    // atalhos
    const chips = [];
    for (const a of ATALHOS) {
        const achados = campos.filter((c) => a.re.test(normalizar(c.tag)));
        if (!achados.length) continue;
        achados.forEach((c) => chips.push(
            `<button type="button" class="sv-chip" data-act="escolher-campo" data-tag="${esc(c.tag)}">${esc(a.rotulo)}: <code>${esc(c.tag)}</code> <small>(${c.total})</small></button>`));
    }
    $('sv-atalhos').innerHTML = chips.length
        ? chips.join('')
        : '<span class="sv-note">Nenhum campo com nome parecido com roteiro/logradouro/baixo/fachada. Use a lista de campos acima.</span>';
    renderValoresCampo();
}

function renderValoresCampo() {
    const tag = $('sv-lote-campo').value.trim();
    const c = S.catalogo.get(tag);
    const box = $('sv-lote-valores');
    if (!tag) { box.innerHTML = ''; return; }
    if (!c) { box.innerHTML = '<span class="sv-note" style="color:var(--danger)">Campo não encontrado nos XMLs carregados.</span>'; return; }
    const top = [...c.valores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    box.innerHTML = `<span class="sv-note">${c.total} ocorrência(s) em ${c.arquivos.size} survey(s). Valores atuais (clique para usar como "valor atual"/"localizar"):</span><div class="sv-chips">`
        + top.map(([v, n]) => `<button type="button" class="sv-chip" data-act="usar-valor" data-v="${esc(v)}">${v === '' ? '<em>(vazio)</em>' : esc(v.length > 40 ? v.slice(0, 40) + '…' : v)} <small>(${n})</small></button>`).join('')
        + '</div>';
}

function renderHistorico() {
    const box = $('sv-historico');
    if (!S.historico.length) { box.innerHTML = '<span class="sv-note">Nenhuma edição em lote aplicada ainda.</span>'; return; }
    box.innerHTML = S.historico.map((h) => `
        <div class="sv-hist-item">
            <span>${esc(h.desc)} — <strong>${h.total}</strong> alteração(ões) em <strong>${h.afet}</strong> survey(s)</span>
            <button type="button" class="btn-secondary" data-act="desfazer" data-id="${h.id}" style="font-size:10.5px; padding:3px 10px;">Desfazer</button>
        </div>`).join('');
}

function renderLista() {
    const tbody = $('sv-tbody');
    if (!S.arquivos.length) { tbody.innerHTML = ''; return; }
    tbody.innerHTML = S.arquivos.map((f, i) => {
        const linha = `
        <tr data-row="${i}">
            <td><input type="checkbox" data-act="sel" data-i="${i}" ${f.sel ? 'checked' : ''}></td>
            <td class="font-mono text-xs">${i + 1}</td>
            <td class="text-xs" title="${esc(f.path)}"><span style="color:var(--text-soft)">${esc(f.pasta)}/</span>${esc(f.nome)}</td>
            <td><input type="text" class="input" data-act="survey" data-i="${i}" value="${esc(f.survey)}" placeholder="—" style="width:90px; font-size:11px; padding:3px 8px; height:28px;"></td>
            <td class="text-xs font-mono">${f.gravadoOriginal === null ? '<span style="color:var(--gold)">sem campo</span>' : esc(f.gravadoOriginal)}</td>
            <td class="text-xs">${f.ops.length ? `<span class="permissions-badge">${f.ops.length}</span>` : '—'}</td>
            <td class="text-right" style="white-space:nowrap;">
                <button type="button" class="btn-secondary" data-act="abrir" data-i="${i}" style="font-size:10.5px; padding:3px 10px;">${f.aberto ? 'Fechar' : '✏️ Editar'}</button>
                ${f.ops.length ? `<button type="button" class="btn-clear-filters" data-act="limpar" data-i="${i}" style="font-size:10.5px; padding:3px 10px;">Limpar</button>` : ''}
            </td>
        </tr>`;
        return linha + (f.aberto ? `<tr data-panel="${i}"><td colspan="7" class="sv-panel">${htmlPainel(i)}</td></tr>` : '');
    }).join('');
    atualizarContagemSel();
}

function camposVisiveis(f) {
    const q = normalizar(f.filtro || '');
    return listarCampos(f.atual).filter((c) =>
        c.tag !== GRAVADO && (!q || normalizar(c.tag).includes(q) || normalizar(c.valor).includes(q)));
}

function htmlPainel(i) {
    const f = S.arquivos[i];
    const todos = camposVisiveis(f);
    const lista = todos.slice(0, MAX_CAMPOS_PAINEL);
    const linhas = lista.map((c) => {
        const k = `${c.tag}#${c.idx}`;
        const val = f.rascunho[k] ?? c.valor;
        return `<tr><td class="text-xs font-mono">${esc(c.tag)}${c.idx ? ` <small>[${c.idx + 1}]</small>` : ''}</td>
            <td><input type="text" class="input" data-act="campo" data-i="${i}" data-tag="${esc(c.tag)}" data-idx="${c.idx}" data-orig="${esc(c.valor)}" value="${esc(val)}" style="font-size:11px; padding:3px 8px; height:28px; width:100%;"></td></tr>`;
    }).join('');
    return `
        <div class="flex flex-wrap items-center gap-2 mb-2">
            <strong class="text-xs">Campos de ${esc(f.nome)}</strong>
            <input type="text" class="input" data-act="filtro-painel" data-i="${i}" value="${esc(f.filtro)}" placeholder="Filtrar por nome ou valor..." style="max-width:260px; font-size:11px; padding:3px 8px; height:28px;">
            <span class="sv-note" style="margin:0;">${todos.length > MAX_CAMPOS_PAINEL ? `mostrando ${MAX_CAMPOS_PAINEL} de ${todos.length} — use o filtro` : `${todos.length} campo(s)`}</span>
        </div>
        <div style="max-height:340px; overflow:auto;">
            <table class="w-full text-left border-collapse"><thead><tr class="th-row"><th style="width:220px;">Campo</th><th>Valor</th></tr></thead><tbody>${linhas || '<tr><td colspan="2" class="p-3 text-xs" style="color:var(--text-soft)">Nenhum campo encontrado.</td></tr>'}</tbody></table>
        </div>
        <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="btn-cancel" data-act="abrir" data-i="${i}" style="font-size:10.5px; padding:5px 12px; height:30px;">Fechar</button>
            <button type="button" class="btn-primary" data-act="salvar-painel" data-i="${i}" style="font-size:10.5px; padding:5px 14px; height:30px;">Salvar edições deste survey</button>
        </div>`;
}

function atualizarContagemSel() {
    const n = S.arquivos.filter((f) => f.sel).length;
    const el = $('sv-sel-count');
    if (el) el.textContent = n;
}

// ---------- Ações ----------
function salvarPainel(i) {
    const f = S.arquivos[i];
    let n = 0;
    // pega todos os inputs do painel (valores atuais na tela) + rascunho de campos filtrados
    document.querySelectorAll(`[data-act="campo"][data-i="${i}"]`).forEach((inp) => {
        f.rascunho[`${inp.dataset.tag}#${inp.dataset.idx}`] = inp.value;
    });
    const atuais = new Map(listarCampos(f.atual).map((c) => [`${c.tag}#${c.idx}`, c.valor]));
    for (const [k, novo] of Object.entries(f.rascunho)) {
        if (!atuais.has(k) || atuais.get(k) === novo) continue;
        const [tag, idx] = [k.slice(0, k.lastIndexOf('#')), Number(k.slice(k.lastIndexOf('#') + 1))];
        f.ops.push({ tag, idx, modo: 'set', para: novo, lote: null });
        n++;
    }
    f.rascunho = {};
    recalcular(f);
    recalcularCatalogo();
    renderTudo();
    msg(n ? `${n} campo(s) alterado(s) em ${f.nome}.` : 'Nenhuma alteração para salvar.', n ? 'ok' : 'info');
}

function aplicarLote() {
    const tag = $('sv-lote-campo').value.trim();
    if (!tag) { msg('Escolha o campo que será editado.', 'erro'); return; }
    if (!S.catalogo.has(tag)) { msg(`O campo "${tag}" não existe nos XMLs carregados.`, 'erro'); return; }
    const modo = document.querySelector('input[name="sv-modo"]:checked').value;
    let op, desc;
    if (modo === 'substituir') {
        const de = $('sv-lote-de').value;
        if (!de) { msg('Informe o texto a localizar.', 'erro'); return; }
        const para = $('sv-lote-para').value;
        op = { tag, modo: 'substituir', de, para };
        desc = `${tag}: trocar "${de}" por "${para}"`;
    } else {
        const para = $('sv-lote-valor').value;
        const se = $('sv-lote-se').value;
        op = { tag, modo: 'set', para, se };
        desc = `${tag}: definir "${para}"${se ? ` onde for "${se}"` : ''}`;
    }
    const escopo = document.querySelector('input[name="sv-escopo"]:checked').value;
    const alvo = escopo === 'sel' ? S.arquivos.filter((f) => f.sel) : S.arquivos;
    if (!alvo.length) { msg('Nenhum survey selecionado na lista.', 'erro'); return; }

    const id = ++S.seq;
    let total = 0, afet = 0;
    for (const f of alvo) {
        const r = aplicarOp(f.atual, op);
        if (r.alteradas) {
            f.ops.push({ ...op, lote: id });
            recalcular(f);
            total += r.alteradas;
            afet++;
        }
    }
    if (!total) { msg('Nada foi alterado: nenhum valor correspondia ao que foi informado.', 'aviso'); return; }
    S.historico.push({ id, desc: desc + (escopo === 'sel' ? ' (selecionados)' : ' (todos)'), total, afet });
    recalcularCatalogo();
    renderTudo();
    msg(`${total} alteração(ões) em ${afet} survey(s).`, 'ok');
}

function desfazerLote(id) {
    S.arquivos.forEach((f) => {
        const antes = f.ops.length;
        f.ops = f.ops.filter((o) => o.lote !== id);
        if (f.ops.length !== antes) recalcular(f);
    });
    S.historico = S.historico.filter((h) => h.id !== id);
    recalcularCatalogo();
    renderTudo();
    msg('Edição em lote desfeita.', 'ok');
}

async function gerarZip() {
    if (!S.zip || !S.arquivos.length) { msg('Carregue um ZIP primeiro.', 'erro'); return; }
    const btn = $('sv-btn-gerar');
    btn.disabled = true;
    msg('Gerando o novo ZIP...');
    try {
        for (const f of S.arquivos) {
            recalcular(f);
            S.zip.file(f.path, codificarBytes(f.saida, f), { date: f.date, createFolders: false });
        }
        if ($('sv-relatorio').checked) {
            const linhas = S.arquivos.map((f) => `${f.survey || '(sem número)'}\t${f.path}`);
            S.zip.file('surveys.txt', linhas.join('\r\n') + '\r\n');
        }
        const blob = await S.zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        const nome = S.nomeZip.replace(/\.zip$/i, '') + '_editado.zip';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nome;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 15000);
        const comNum = S.arquivos.filter((f) => f.survey && f.gravadoOriginal !== null).length;
        msg(`ZIP "${nome}" gerado: ${S.arquivos.length} XML(s), ${comNum} com número de survey gravado.`, 'ok');
    } catch (err) {
        console.error(err);
        msg('Erro ao gerar o ZIP: ' + (err?.message || err), 'erro');
    } finally {
        btn.disabled = false;
    }
}

// ---------- Eventos ----------
function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const i = el.dataset.i !== undefined ? Number(el.dataset.i) : null;
    if (act === 'abrir') {
        const f = S.arquivos[i];
        f.aberto = !f.aberto;
        if (!f.aberto) { f.rascunho = {}; f.filtro = ''; }
        renderLista();
    } else if (act === 'limpar') {
        const f = S.arquivos[i];
        f.ops = []; f.rascunho = {};
        recalcular(f); recalcularCatalogo(); renderTudo();
    } else if (act === 'salvar-painel') {
        salvarPainel(i);
    } else if (act === 'escolher-campo') {
        $('sv-lote-campo').value = el.dataset.tag;
        renderValoresCampo();
    } else if (act === 'usar-valor') {
        $('sv-lote-se').value = el.dataset.v;
        $('sv-lote-de').value = el.dataset.v;
    } else if (act === 'desfazer') {
        desfazerLote(Number(el.dataset.id));
    } else if (act === 'sel-todos') {
        S.arquivos.forEach((f) => { f.sel = true; });
        renderLista();
    } else if (act === 'sel-nenhum') {
        S.arquivos.forEach((f) => { f.sel = false; });
        renderLista();
    } else if (act === 'aplicar-numeros') {
        atribuirNumeros(true);
    } else if (act === 'aplicar-lote') {
        aplicarLote();
    } else if (act === 'gerar') {
        gerarZip();
    }
}

function onChange(e) {
    const el = e.target;
    const act = el.dataset?.act;
    if (el.id === 'sv-zip') { lerZip(el.files[0]); return; }
    if (act === 'sel') {
        S.arquivos[Number(el.dataset.i)].sel = el.checked;
        atualizarContagemSel();
    } else if (act === 'survey') {
        const f = S.arquivos[Number(el.dataset.i)];
        f.survey = el.value.trim();
        recalcular(f);
        renderResumo();
    } else if (el.name === 'sv-modo') {
        const sub = el.value === 'substituir';
        $('sv-bloco-set').style.display = sub ? 'none' : '';
        $('sv-bloco-sub').style.display = sub ? '' : 'none';
    }
}

function onInput(e) {
    const el = e.target;
    const act = el.dataset?.act;
    if (el.id === 'sv-lote-campo') {
        renderValoresCampo();
    } else if (act === 'campo') {
        const f = S.arquivos[Number(el.dataset.i)];
        f.rascunho[`${el.dataset.tag}#${el.dataset.idx}`] = el.value;
    } else if (act === 'filtro-painel') {
        const i = Number(el.dataset.i);
        const f = S.arquivos[i];
        // guarda o que já foi digitado antes de redesenhar a lista filtrada
        document.querySelectorAll(`[data-act="campo"][data-i="${i}"]`).forEach((inp) => {
            f.rascunho[`${inp.dataset.tag}#${inp.dataset.idx}`] = inp.value;
        });
        f.filtro = el.value;
        const cel = document.querySelector(`tr[data-panel="${i}"] td`);
        if (cel) {
            cel.innerHTML = htmlPainel(i);
            const novo = cel.querySelector('[data-act="filtro-painel"]');
            if (novo) { novo.focus(); novo.setSelectionRange(novo.value.length, novo.value.length); }
        }
    }
}

export function initSurveyEditor() {
    const raiz = $('tab-survey-editor');
    if (!raiz || S.inicializado) return;
    S.inicializado = true;
    raiz.addEventListener('click', onClick);
    raiz.addEventListener('change', onChange);
    raiz.addEventListener('input', onInput);
}

// Chamada ao abrir a aba
export function carregarSurveyEditor() {
    atualizarBotaoSurvey();
}
