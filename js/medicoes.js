import { supabaseClient } from './config.js';
import { valorParaNumero, aplicarMascaras, mascaraMoeda } from './utils.js';
import { carregarFiltros } from './selects.js';

// =====================================================
// CACHE LOCAL DE COLABORADORES (diretores) E CONTRATOS (empresas)
// usados nas linhas de distribuição de DON / Status.
// =====================================================
let _cacheDiretores = null;
let _cacheEmpresas = null;

async function getDiretoresCache() {
    if (!_cacheDiretores) {
        const { data } = await supabaseClient
            .from('diretores')
            .select('id, nome, empresas(nome)')
            .order('nome');
        _cacheDiretores = data || [];
    }
    return _cacheDiretores;
}

async function getEmpresasCache() {
    if (!_cacheEmpresas) {
        const { data } = await supabaseClient.from('empresas').select('id, nome').order('nome');
        _cacheEmpresas = data || [];
    }
    return _cacheEmpresas;
}

// Chame isso se um Diretor/Empresa novo for cadastrado durante a sessão,
// para que as próximas linhas de distribuição já apareçam atualizadas.
export function invalidarCacheDistribuicaoMedicao() {
    _cacheDiretores = null;
    _cacheEmpresas = null;
}

// =====================================================
// LINHAS DE DISTRIBUIÇÃO (Colaborador + Contrato + Valor)
// =====================================================
async function adicionarLinhaDistribuicao(tipo, dadosIniciais = null) {
    const container = document.getElementById(`med-${tipo}-itens`);
    if (!container) return;

    const [diretores, empresas] = await Promise.all([getDiretoresCache(), getEmpresasCache()]);

    const optsDiretor = diretores.map(d =>
        `<option value="${d.id}">${d.nome}${d.empresas?.nome ? ` (${d.empresas.nome})` : ''}</option>`
    ).join('');
    const optsEmpresa = empresas.map(e => `<option value="${e.id}">${e.nome}</option>`).join('');

    const linha = document.createElement('div');
    linha.className = 'distribuicao-linha';
    linha.dataset.tipo = tipo;
    linha.innerHTML = `
        <select class="input" data-role="diretor">
            <option value="">Colaborador...</option>
            ${optsDiretor}
        </select>
        <select class="input" data-role="empresa">
            <option value="">Contrato...</option>
            ${optsEmpresa}
        </select>
        <input type="text" class="input money-input" data-role="valor" placeholder="0,00" value="0,00">
        <button type="button" class="btn-danger distribuicao-remover" title="Remover linha">✕</button>
    `;
    container.appendChild(linha);

    const inputValor = linha.querySelector('[data-role="valor"]');
    mascaraMoeda(inputValor);

    if (dadosIniciais) {
        linha.querySelector('[data-role="diretor"]').value = dadosIniciais.diretor_id || '';
        linha.querySelector('[data-role="empresa"]').value = dadosIniciais.empresa_id || '';
        inputValor.value = Number(dadosIniciais.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
    }

    atualizarResumoDistribuicao(tipo);
}

function atualizarResumoDistribuicao(tipo) {
    const container = document.getElementById(`med-${tipo}-itens`);
    const totalInput = document.getElementById(`med-valor-${tipo}`);
    const resumoEl = document.getElementById(`med-${tipo}-resumo`);
    if (!container || !totalInput || !resumoEl) return;

    let distribuido = 0;
    container.querySelectorAll('[data-role="valor"]').forEach(inp => {
        distribuido += valorParaNumero(inp.value);
    });

    const total = valorParaNumero(totalInput.value);
    const diferenca = total - distribuido;
    const fmt = v => v.toLocaleString('pt-BR', { minFractionDigits: 2 });

    let corDiferenca = '#00AA00';
    if (Math.abs(diferenca) > 0.004) {
        corDiferenca = diferenca > 0 ? '#B8860B' : '#FF0000';
    }

    resumoEl.innerHTML = `
        <span>Total informado: <strong>R$ ${fmt(total)}</strong></span>
        <span>Distribuído: <strong>R$ ${fmt(distribuido)}</strong></span>
        <span style="color:${corDiferenca}">Diferença: <strong>R$ ${fmt(diferenca)}</strong></span>
    `;
}

function coletarLinhasDistribuicao(tipo) {
    const container = document.getElementById(`med-${tipo}-itens`);
    if (!container) return [];
    return Array.from(container.querySelectorAll('.distribuicao-linha')).map(linha => ({
        diretor_id: linha.querySelector('[data-role="diretor"]').value || null,
        empresa_id: linha.querySelector('[data-role="empresa"]').value || null,
        valor: valorParaNumero(linha.querySelector('[data-role="valor"]').value)
    }));
}

// Limpa as duas listas de distribuição (chamado ao cancelar ou após salvar).
export function limparDistribuicaoMedicao() {
    ['don', 'status'].forEach(tipo => {
        const container = document.getElementById(`med-${tipo}-itens`);
        if (container) container.innerHTML = '';
        atualizarResumoDistribuicao(tipo);
    });
}

async function carregarDistribuicaoParaEdicao(medicaoId) {
    limparDistribuicaoMedicao();
    try {
        const { data, error } = await supabaseClient
            .from('medicao_distribuicao')
            .select('tipo, diretor_id, empresa_id, valor')
            .eq('medicao_id', medicaoId);

        if (error) {
            console.error('Erro ao carregar distribuição da medição:', error);
            return;
        }

        for (const item of (data || [])) {
            if (item.tipo === 'don' || item.tipo === 'status') {
                await adicionarLinhaDistribuicao(item.tipo, item);
            }
        }
    } catch (e) {
        console.error('Erro ao carregar distribuição da medição:', e);
    }
}

// =====================================================
// LISTAGEM
// =====================================================
export async function carregarMedicoes() {
    const tbody = document.getElementById('tabela-medicoes');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('medicoes')
            .select(`
                id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes,
                ano,
                valor_don,
                valor_status,
                observacao,
                data_email_medicao,
                status_medicao,
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome)
            `)
            .order('id', { ascending: false });

        if (error) {
            console.error('Erro ao carregar medições:', error);
            tbody.innerHTML = `<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar: ${error.message}</td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Nenhuma medição cadastrada.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(m => {
            const valorDon = Number(m.valor_don || 0);
            const valorStatus = Number(m.valor_status || 0);
            
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${m.id}</td>
                    <td>${m.projetos?.nome || '-'}</td>
                    <td>${m.gestores_logictel?.nome || '-'}</td>
                    <td>${m.diretores?.nome || '-'}</td>
                    <td>${m.mes}</td>
                    <td>${m.ano}</td>
                    <td class="text-right mono">R$ ${valorDon.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                    <td class="text-right mono">R$ ${valorStatus.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                    <td>${m.status_medicao || '-'}</td>
                    <td>${m.observacao || '-'}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarMedicao(${m.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirMedicao(${m.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// FORMULÁRIO
// =====================================================
export function initFormMedicao() {
    const form = document.getElementById('form-medicao');

    // Botões "+ Adicionar Colaborador"
    document.getElementById('med-don-add-linha')?.addEventListener('click', () => adicionarLinhaDistribuicao('don'));
    document.getElementById('med-status-add-linha')?.addEventListener('click', () => adicionarLinhaDistribuicao('status'));

    // Delegação de eventos: sobrevive a re-renderizações e a aplicarMascaras()
    // (que clona os inputs .money-input e perderia listeners diretos).
    form.addEventListener('input', (e) => {
        if (e.target.id === 'med-valor-don' || (e.target.dataset.role === 'valor' && e.target.closest('#med-don-itens'))) {
            atualizarResumoDistribuicao('don');
        }
        if (e.target.id === 'med-valor-status' || (e.target.dataset.role === 'valor' && e.target.closest('#med-status-itens'))) {
            atualizarResumoDistribuicao('status');
        }
    });

    form.addEventListener('click', (e) => {
        if (e.target.classList.contains('distribuicao-remover')) {
            const linha = e.target.closest('.distribuicao-linha');
            const tipo = linha?.dataset.tipo;
            linha?.remove();
            if (tipo) atualizarResumoDistribuicao(tipo);
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('med-edit-id').value;

        const projetoId = document.getElementById('med-projeto').value;
        const gestorId = document.getElementById('med-gestor').value;
        const diretorId = document.getElementById('med-diretor').value || null;
        
        if (!projetoId || !gestorId) {
            alert('Projeto e Gestor são obrigatórios!');
            return;
        }
        
        const valorDon = valorParaNumero(document.getElementById('med-valor-don').value);
        const valorStatus = valorParaNumero(document.getElementById('med-valor-status').value);

        const linhasDon = coletarLinhasDistribuicao('don');
        const linhasStatus = coletarLinhasDistribuicao('status');

        // Validação: a soma distribuída precisa bater com o valor total informado
        const somaDon = linhasDon.reduce((acc, l) => acc + l.valor, 0);
        const somaStatus = linhasStatus.reduce((acc, l) => acc + l.valor, 0);
        const difDon = Math.round((valorDon - somaDon) * 100) / 100;
        const difStatus = Math.round((valorStatus - somaStatus) * 100) / 100;

        if (Math.abs(difDon) > 0.01) {
            alert(`A distribuição de DON não bate com o valor total.\nFalta distribuir: R$ ${difDon.toLocaleString('pt-BR', { minFractionDigits: 2 })}`);
            return;
        }
        if (Math.abs(difStatus) > 0.01) {
            alert(`A distribuição de Status não bate com o valor total.\nFalta distribuir: R$ ${difStatus.toLocaleString('pt-BR', { minFractionDigits: 2 })}`);
            return;
        }
        if (linhasDon.some(l => l.valor !== 0 && (!l.diretor_id || !l.empresa_id))) {
            alert('Toda linha de distribuição de DON com valor precisa de Colaborador e Contrato selecionados.');
            return;
        }
        if (linhasStatus.some(l => l.valor !== 0 && (!l.diretor_id || !l.empresa_id))) {
            alert('Toda linha de distribuição de Status com valor precisa de Colaborador e Contrato selecionados.');
            return;
        }

        const dados = {
            projeto_id: parseInt(projetoId),
            gestor_logictel_id: parseInt(gestorId),
            diretor_id: diretorId ? parseInt(diretorId) : null,
            mes: document.getElementById('med-mes').value,
            ano: parseInt(document.getElementById('med-ano').value),
            valor_don: valorDon,
            valor_status: valorStatus,
            observacao: document.getElementById('med-observacao').value || null,
            data_email_medicao: document.getElementById('med-data-email').value || null,
            status_medicao: document.getElementById('med-status').value
        };

        try {
            let medicaoId = editId ? parseInt(editId) : null;

            if (editId) {
                const result = await supabaseClient.from('medicoes').update(dados).eq('id', medicaoId);
                if (result.error) { alert('Erro: ' + result.error.message); return; }

                const delResult = await supabaseClient.from('medicao_distribuicao').delete().eq('medicao_id', medicaoId);
                if (delResult.error) { alert('Erro ao atualizar distribuição: ' + delResult.error.message); return; }
            } else {
                const result = await supabaseClient.from('medicoes').insert([dados]).select('id').single();
                if (result.error) { alert('Erro: ' + result.error.message); return; }
                medicaoId = result.data.id;
            }

            const itensParaInserir = [
                ...linhasDon.filter(l => l.valor !== 0).map(l => ({ medicao_id: medicaoId, tipo: 'don', diretor_id: parseInt(l.diretor_id), empresa_id: parseInt(l.empresa_id), valor: l.valor })),
                ...linhasStatus.filter(l => l.valor !== 0).map(l => ({ medicao_id: medicaoId, tipo: 'status', diretor_id: parseInt(l.diretor_id), empresa_id: parseInt(l.empresa_id), valor: l.valor }))
            ];

            if (itensParaInserir.length > 0) {
                const itensResult = await supabaseClient.from('medicao_distribuicao').insert(itensParaInserir);
                if (itensResult.error) { alert('Erro ao salvar distribuição: ' + itensResult.error.message); return; }
            }

            alert(editId ? 'Medição atualizada!' : 'Medição salva!');
            form.reset();
            document.getElementById('med-edit-id').value = '';
            document.getElementById('med-cancel-btn').style.display = 'none';
            limparDistribuicaoMedicao();
            
            carregarMedicoes();
            carregarFiltros();
            aplicarMascaras();
        } catch (err) {
            console.error('Erro ao salvar medição:', err);
            alert('Erro ao salvar medição.');
        }
    });
}

export async function editarMedicao(id) {
    try {
        const { data, error } = await supabaseClient
            .from('medicoes')
            .select(`
                id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes,
                ano,
                valor_don,
                valor_status,
                observacao,
                data_email_medicao,
                status_medicao
            `)
            .eq('id', id)
            .single();

        if (error) {
            alert('Erro ao carregar: ' + error.message);
            console.error('Erro detalhado:', error);
            return;
        }
        if (!data) {
            alert('Medição não encontrada!');
            return;
        }

        document.getElementById('med-edit-id').value = id;
        document.getElementById('med-projeto').value = data.projeto_id || '';
        document.getElementById('med-gestor').value = data.gestor_logictel_id || '';
        document.getElementById('med-diretor').value = data.diretor_id || '';
        document.getElementById('med-mes').value = data.mes || '';
        document.getElementById('med-ano').value = data.ano || '';
        document.getElementById('med-valor-don').value = Number(data.valor_don || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
        document.getElementById('med-valor-status').value = Number(data.valor_status || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
        document.getElementById('med-observacao').value = data.observacao || '';
        document.getElementById('med-data-email').value = data.data_email_medicao || '';
        document.getElementById('med-status').value = data.status_medicao || '';
        document.getElementById('med-cancel-btn').style.display = 'inline-block';

        await carregarDistribuicaoParaEdicao(id);
        atualizarResumoDistribuicao('don');
        atualizarResumoDistribuicao('status');

        document.getElementById('form-medicao').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar medição:', e);
        alert('Erro ao carregar dados da medição.');
    }
}

export async function excluirMedicao(id) {
    if (!confirm('Tem certeza que deseja excluir esta medição? A distribuição por colaborador também será excluída.')) return;
    try {
        // medicao_distribuicao tem ON DELETE CASCADE, mas removemos explicitamente
        // por segurança caso a FK ainda não tenha sido aplicada no banco.
        await supabaseClient.from('medicao_distribuicao').delete().eq('medicao_id', id);

        const { error } = await supabaseClient
            .from('medicoes')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro: ' + error.message);
            return;
        }

        alert('Medição excluída!');
        carregarMedicoes();
        carregarFiltros();
    } catch (e) {
        console.error('Erro ao excluir medição:', e);
        alert('Erro ao excluir medição.');
    }
}
