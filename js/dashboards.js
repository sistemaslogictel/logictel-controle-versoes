import { supabaseClient } from './config.js';
import { registrarUltimaAtualizacao } from './utils.js';

const MESES_ORDEM = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Guarda o último dado renderizado de cada dashboard, para o botão
// "Exportar Excel" não precisar refazer a consulta ao banco.
let _ultimoRenderDON = null;
let _ultimoRenderStatus = null;
let _ultimoRenderCRE = null;

// =====================================================
// FUNÇÃO PARA VERIFICAR SE UM CONSUMO DEVE SER EXCLUÍDO
// (status "MF - Medição Concluída" não entra nas dashboards DON e Status)
// =====================================================
function consumoDeveSerExcluido(consumo, statusDCMap) {
    if (!consumo || !consumo.status_id) return false;
    const statusInfo = statusDCMap[consumo.status_id];
    if (!statusInfo) return false;
    // Verifica se o código do status é "MF" (Medição Concluída)
    return statusInfo.codigo === 'MF';
}

// =====================================================
// FUNÇÃO PARA VERIFICAR SE UM CONSUMO É "CRE" (MF - Medição Concluída)
// =====================================================
function consumoEHCRE(consumo, statusDCMap) {
    if (!consumo || !consumo.status_id) return false;
    const statusInfo = statusDCMap[consumo.status_id];
    if (!statusInfo) return false;
    return statusInfo.codigo === 'MF';
}

// =====================================================
// BUSCAR STATUS DC PARA MAPEAMENTO
// =====================================================
async function carregarStatusDCMap() {
    const { data, error } = await supabaseClient
        .from('status_dc')
        .select('id, codigo, nome');
    if (error) {
        console.error('Erro ao carregar status DC:', error);
        return {};
    }
    const map = {};
    if (data) {
        data.forEach(s => { map[s.id] = s; });
    }
    return map;
}

// =====================================================
// EXPORTAÇÃO PARA EXCEL (XLSX) — reflete exatamente o que está na tela
// =====================================================
function exportarTabelaParaExcel(nomeArquivo, headers, linhas) {
    if (!linhas || linhas.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    try {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...linhas]);
        ws['!cols'] = headers.map(h => ({ wch: Math.max(12, String(h).length + 4) }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dados');
        const dataHoje = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `${nomeArquivo}_${dataHoje}.xlsx`);
    } catch (e) {
        console.error('Erro ao exportar Excel:', e);
        alert('Erro ao exportar arquivo Excel.');
    }
}

export function exportarExcelDON() {
    if (!_ultimoRenderDON) { alert('Não há dados para exportar.'); return; }
    const { projetos, mesesExibir } = _ultimoRenderDON;
    const headers = ['Projeto', 'Diretor', 'Descrição', ...mesesExibir, 'Total'];
    const linhas = [];
    projetos.forEach(proj => {
        linhas.push([proj.projeto, '—', proj.descricao, ...mesesExibir.map(m => proj.meses[m]?.saldo ?? 0), proj.total]);
        Object.values(proj.diretores)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
            .forEach(dir => {
                linhas.push([`↳ ${proj.projeto}`, dir.nome, '—', ...mesesExibir.map(m => dir.meses[m]?.saldo ?? 0), dir.total]);
            });
    });
    exportarTabelaParaExcel('Dashboard_DON', headers, linhas);
}

export function exportarExcelStatus() {
    if (!_ultimoRenderStatus) { alert('Não há dados para exportar.'); return; }
    const { linhas: grupos, mesesExibir } = _ultimoRenderStatus;
    const headers = ['Gestão', 'Projeto', 'Descrição', ...mesesExibir, 'Total'];
    const linhas = grupos.map(g => [g.gestor, g.projeto, g.descricao, ...mesesExibir.map(m => g.meses[m]?.saldo ?? 0), g.total]);
    exportarTabelaParaExcel('Dashboard_Status', headers, linhas);
}

export function exportarExcelCRE() {
    if (!_ultimoRenderCRE) { alert('Não há dados para exportar.'); return; }
    const { linhas: grupos, mesesExibir } = _ultimoRenderCRE;
    const headers = ['Gestão', 'Projeto', 'Descrição', ...mesesExibir, 'Total'];
    const linhas = grupos.map(g => [g.gestor, g.projeto, g.descricao, ...mesesExibir.map(m => g.meses[m]?.saldo ?? 0), g.total]);
    exportarTabelaParaExcel('Dashboard_CRE', headers, linhas);
}

// =====================================================
// CÁLCULO COMPARTILHADO DE SALDO POR MÊS (para STATUS e CRE)
// =====================================================
function calcularGruposSaldo(medicoes, consumos, campoValor, filtroCRE = false, statusDCMap = {}) {
    const grupos = {};

    function garantirGrupo(key, origem) {
        if (!grupos[key]) {
            grupos[key] = {
                gestor: origem.gestores_logictel?.nome || 'N/A',
                projeto: origem.projetos?.nome || 'N/A',
                descricao: origem.projetos?.nome || '',
                meses: {},
                _debitos: {},
                _caixa: 0,
                total: 0
            };
        }
        return grupos[key];
    }

    // 1) Cada medição gera uma dívida no mês em que foi medida.
    medicoes.forEach(med => {
        const key = `${med.gestor_logictel_id}|${med.projeto_id}|${med.ano}`;
        const g = garantirGrupo(key, med);
        const valor = Math.abs(Number(med[campoValor] || 0));
        g._debitos[med.mes] = (g._debitos[med.mes] || 0) + valor;
    });

    // 2) Todo consumo lançado para aquele gestor+projeto+ano entra no
    // mesmo caixa, independente do mês de apropriação informado.
    consumos.forEach(c => {
        // Se for filtro CRE, só inclui consumos com status MF
        if (filtroCRE) {
            if (!consumoEHCRE(c, statusDCMap)) return;
        } else {
            // Se NÃO for filtro CRE, exclui consumos com status MF
            if (consumoDeveSerExcluido(c, statusDCMap)) return;
        }
        
        const key = `${c.gestor_logictel_id}|${c.projeto_id}|${c.ano}`;
        const g = garantirGrupo(key, c);
        g._caixa += Math.abs(Number(c.valor || 0));
    });

    // 3) Quitação em cascata: aplica o caixa disponível nos meses mais
    // antigos primeiro. O que sobrar de caixa depois de quitar todas as
    // dívidas conhecidas vira crédito exibido no último mês medido.
    Object.values(grupos).forEach(g => {
        const mesesOrdenados = Object.keys(g._debitos)
            .sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));

        let caixa = g._caixa;
        let total = 0;

        mesesOrdenados.forEach(mes => {
            const debito = g._debitos[mes];
            const aplicado = Math.min(caixa, debito);
            caixa -= aplicado;
            const saldo = aplicado - debito; // 0 = quitado; negativo = ainda pendente
            g.meses[mes] = { saldo };
            total += saldo;
        });

        if (caixa > 0 && mesesOrdenados.length > 0) {
            const ultimoMes = mesesOrdenados[mesesOrdenados.length - 1];
            g.meses[ultimoMes].saldo += caixa; // adiantamento/crédito
            total += caixa;
        }

        g.total = total;
        delete g._debitos;
        delete g._caixa;
    });

    const mesesComSaldo = new Set();
    Object.values(grupos).forEach(g => {
        Object.keys(g.meses).forEach(mes => {
            if (g.meses[mes].saldo !== 0) mesesComSaldo.add(mes);
        });
    });

    if (mesesComSaldo.size === 0) {
        const todosMeses = new Set();
        Object.values(grupos).forEach(g => Object.keys(g.meses).forEach(mes => todosMeses.add(mes)));
        const primeiroMes = Array.from(todosMeses).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b))[0];
        if (primeiroMes) mesesComSaldo.add(primeiroMes);
    }

    const mesesExibir = Array.from(mesesComSaldo).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));
    return { grupos, mesesExibir };
}

// =====================================================
// CÁLCULO DE SALDO PARA DON - AGRUPADO POR PROJETO E DIRETOR
// =====================================================
function calcularGruposSaldoDON(medicoes, consumos, statusDCMap = {}) {
    const grupos = {};
    const todosMeses = new Set();

    function garantirGrupoProjeto(key, origem) {
        if (!grupos[key]) {
            grupos[key] = {
                projeto: origem.projetos?.nome || 'N/A',
                descricao: origem.projetos?.nome || '',
                meses: {},
                total: 0,
                diretores: {}
            };
        }
        return grupos[key];
    }

    function garantirDiretor(parent, diretorId, diretorNome) {
        const key = diretorId || 'sem-diretor';
        if (!parent.diretores[key]) {
            parent.diretores[key] = {
                nome: diretorNome || 'Sem diretor atribuído',
                meses: {},
                total: 0
            };
        }
        return parent.diretores[key];
    }

    // Processar medições
    medicoes.forEach(med => {
        const key = `${med.projeto_id}`;
        const parent = garantirGrupoProjeto(key, med);
        const dir = garantirDiretor(parent, med.diretor_id, med.diretores?.nome);
        todosMeses.add(med.mes);

        const valor = -Math.abs(Number(med.valor_don || 0));
        if (!parent.meses[med.mes]) parent.meses[med.mes] = { medicao: 0, consumo: 0 };
        parent.meses[med.mes].medicao += valor;
        if (!dir.meses[med.mes]) dir.meses[med.mes] = { medicao: 0, consumo: 0 };
        dir.meses[med.mes].medicao += valor;
    });

    // Processar consumos - EXCLUIR os com status MF
    consumos.forEach(c => {
        // Excluir consumos com status MF
        if (consumoDeveSerExcluido(c, statusDCMap)) return;
        
        const mes = c.mes_medido;
        if (!mes) return;
        const key = `${c.projeto_id}`;
        const parent = garantirGrupoProjeto(key, c);
        const dir = garantirDiretor(parent, c.diretor_id, c.diretores?.nome);
        todosMeses.add(mes);

        const valor = Math.abs(Number(c.valor || 0));
        if (!parent.meses[mes]) parent.meses[mes] = { medicao: 0, consumo: 0 };
        parent.meses[mes].consumo += valor;
        if (!dir.meses[mes]) dir.meses[mes] = { medicao: 0, consumo: 0 };
        dir.meses[mes].consumo += valor;
    });

    // Calcular saldos
    function calcularSaldos(mesesObj) {
        let total = 0;
        Object.keys(mesesObj).forEach(mes => {
            const saldo = (mesesObj[mes].medicao || 0) + (mesesObj[mes].consumo || 0);
            mesesObj[mes].saldo = saldo;
            total += saldo;
        });
        return total;
    }

    Object.values(grupos).forEach(g => {
        g.total = calcularSaldos(g.meses);
        Object.values(g.diretores).forEach(d => {
            d.total = calcularSaldos(d.meses);
        });
    });

    const mesesComSaldo = new Set();
    Object.values(grupos).forEach(g => {
        Object.keys(g.meses).forEach(mes => {
            if (g.meses[mes].saldo !== 0) mesesComSaldo.add(mes);
        });
    });

    if (mesesComSaldo.size === 0 && todosMeses.size > 0) {
        const primeiroMes = Array.from(todosMeses).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b))[0];
        if (primeiroMes) mesesComSaldo.add(primeiroMes);
    }

    const mesesExibir = Array.from(mesesComSaldo).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));
    return { grupos, mesesExibir };
}

// =====================================================
// ÍCONE DO CARD "TOTAL GERAL"
// =====================================================
const ICONE_TOTAL_GERAL = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="14 7 21 7 21 14"></polyline></svg>`;
const ICONE_CRE = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`;

function classeValor(v) {
    if (v > 0) return 'valor-positivo';
    if (v < 0) return 'valor-negativo';
    return 'valor-zero';
}

// =====================================================
// CARD "TOTAL GERAL"
// =====================================================
function renderizarTotalGeralCard(containerId, tema, mesesExibir, linhas, totalGeral) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.className = `total-geral-card theme-${tema}`;

    if (!linhas || linhas.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = '';

    let statsHtml = '';
    mesesExibir.forEach(mes => {
        let totalMes = 0;
        linhas.forEach(g => { totalMes += g.meses[mes]?.saldo || 0; });
        const displayValor = totalMes !== 0 ? totalMes.toLocaleString('pt-BR', { minFractionDigits: 2 }) : '-';
        statsHtml += `
            <div class="total-geral-stat">
                <div class="total-geral-stat-label">${mes}</div>
                <div class="total-geral-stat-value ${classeValor(totalMes)}">${displayValor}</div>
            </div>`;
    });

    statsHtml += `
        <div class="total-geral-stat">
            <div class="total-geral-stat-label">Total</div>
            <div class="total-geral-stat-value ${classeValor(totalGeral)}">${totalGeral.toLocaleString('pt-BR', { minFractionDigits: 2 })}</div>
        </div>`;

    container.innerHTML = `
        <div class="total-geral-icon-wrap">
            <div class="total-geral-icon">${ICONE_TOTAL_GERAL}</div>
            <div class="total-geral-label">TOTAL GERAL</div>
        </div>
        <div class="total-geral-stats">${statsHtml}</div>
    `;
}

function renderizarTotalGeralCardCRE(containerId, tema, mesesExibir, linhas, totalGeral) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.className = `total-geral-card theme-${tema}`;

    if (!linhas || linhas.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = '';

    let statsHtml = '';
    mesesExibir.forEach(mes => {
        let totalMes = 0;
        linhas.forEach(g => { totalMes += g.meses[mes]?.saldo || 0; });
        const displayValor = totalMes !== 0 ? totalMes.toLocaleString('pt-BR', { minFractionDigits: 2 }) : '-';
        statsHtml += `
            <div class="total-geral-stat">
                <div class="total-geral-stat-label">${mes}</div>
                <div class="total-geral-stat-value ${classeValor(totalMes)}">${displayValor}</div>
            </div>`;
    });

    statsHtml += `
        <div class="total-geral-stat">
            <div class="total-geral-stat-label">Total</div>
            <div class="total-geral-stat-value ${classeValor(totalGeral)}">${totalGeral.toLocaleString('pt-BR', { minFractionDigits: 2 })}</div>
        </div>`;

    container.innerHTML = `
        <div class="total-geral-icon-wrap">
            <div class="total-geral-icon">${ICONE_CRE}</div>
            <div class="total-geral-label">TOTAL CRE</div>
        </div>
        <div class="total-geral-stats">${statsHtml}</div>
    `;
}

// =====================================================
// RENDERIZAÇÃO DA TABELA STATUS
// =====================================================
function renderizarDashboardStatus(headerId, tbodyId, grupos, mesesExibir, headerClass, totalCardId, tema) {
    const headerRow = document.querySelector(`#${headerId}`);
    if (headerRow) {
        let html = `<tr class="${headerClass}">
            <th style="text-align:left;padding:10px 12px;">Gestão</th>
            <th style="text-align:left;padding:10px 12px;">Projeto</th>
            <th style="text-align:left;padding:10px 12px;">Descrição</th>`;
        mesesExibir.forEach(mes => {
            html += `<th style="text-align:center;padding:10px 12px;min-width:90px;">${mes}</th>`;
        });
        html += '<th style="text-align:center;padding:10px 12px;">Total</th></tr>';
        headerRow.innerHTML = html;
    }

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const linhas = Object.values(grupos);
    if (linhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${3 + mesesExibir.length + 1}" style="padding:20px;text-align:center;color:var(--text-soft);">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    let totalGeral = 0;

    linhas.forEach(g => {
        totalGeral += g.total;

        let html = `
            <tr>
                <td style="text-align:left;padding:10px 12px;font-weight:600;">${g.gestor}</td>
                <td style="text-align:left;padding:10px 12px;font-weight:500;">${g.projeto}</td>
                <td style="text-align:left;padding:10px 12px;color:var(--text-soft);">${g.descricao}</td>
        `;

        mesesExibir.forEach(mes => {
            const saldo = g.meses[mes]?.saldo;
            const temValor = saldo !== undefined && saldo !== 0;
            
            let displayValor = '-';
            let colorStyle = '';
            
            if (temValor) {
                if (saldo < 0) {
                    colorStyle = 'color:#FF0000;';
                } else if (saldo > 0) {
                    colorStyle = 'color:#00AA00;';
                }
                displayValor = saldo.toLocaleString('pt-BR', { minFractionDigits: 2 });
            }
            
            html += `<td style="text-align:center;padding:10px 12px;font-weight:600;${colorStyle}">${displayValor}</td>`;
        });

        let totalColor = '';
        if (g.total < 0) {
            totalColor = 'color:#FF0000;';
        } else if (g.total > 0) {
            totalColor = 'color:#00AA00;';
        }
        
        html += `
                <td style="text-align:center;padding:10px 12px;font-weight:700;${totalColor}">${g.total.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
            </tr>
        `;

        tbody.innerHTML += html;
    });

    // Usar a função de renderização apropriada
    const renderFn = tema === 'cre' ? renderizarTotalGeralCardCRE : renderizarTotalGeralCard;
    renderFn(totalCardId, tema, mesesExibir, linhas, totalGeral);
}

// =====================================================
// RENDERIZAÇÃO DA TABELA DON - COM EXPANSÃO POR CLIQUE
// =====================================================
function renderizarDashboardDON(headerId, tbodyId, grupos, mesesExibir, totalCardId) {
    const headerRow = document.querySelector(`#${headerId}`);
    if (headerRow) {
        let html = `<tr class="don-header">
            <th style="text-align:left;padding:10px 12px;">Projeto</th>
            <th style="text-align:left;padding:10px 12px;">Diretor</th>
            <th style="text-align:left;padding:10px 12px;">Descrição</th>`;
        mesesExibir.forEach(mes => {
            html += `<th style="text-align:center;padding:10px 12px;min-width:90px;">${mes}</th>`;
        });
        html += '<th style="text-align:center;padding:10px 12px;">Total</th></tr>';
        headerRow.innerHTML = html;
    }

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const projetos = Object.values(grupos);
    if (projetos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${3 + mesesExibir.length + 1}" style="padding:20px;text-align:center;color:var(--text-soft);">Nenhum registro encontrado.</td></tr>`;
        renderizarTotalGeralCard(totalCardId, 'don', mesesExibir, [], 0);
        return;
    }

    tbody.innerHTML = '';
    let totalGeral = 0;

    projetos.forEach((proj, index) => {
        totalGeral += proj.total;
        const totalColor = proj.total < 0 ? 'color:#FF0000;' : (proj.total > 0 ? 'color:#00AA00;' : '');
        const projetoId = `projeto-${index}`;

        // Linha do Projeto (clicável para expandir/colapsar)
        let html = `
            <tr class="projeto-row" data-projeto="${projetoId}" style="border-top:2px solid var(--primary);background:var(--primary-100);cursor:pointer;">
                <td style="text-align:left;padding:10px 12px;font-weight:700;font-size:14px;">
                    <span class="expand-icon" id="icon-${projetoId}">▶</span> ${proj.projeto}
                </td>
                <td style="text-align:left;padding:10px 12px;font-weight:500;color:var(--text-soft);">—</td>
                <td style="text-align:left;padding:10px 12px;color:var(--text-soft);">${proj.descricao}</td>
        `;
        mesesExibir.forEach(mes => {
            const saldo = proj.meses[mes]?.saldo;
            const temValor = saldo !== undefined && saldo !== 0;
            let displayValor = '-';
            let colorStyle = '';
            if (temValor) {
                colorStyle = saldo < 0 ? 'color:#FF0000;' : 'color:#00AA00;';
                displayValor = saldo.toLocaleString('pt-BR', { minFractionDigits: 2 });
            }
            html += `<td style="text-align:center;padding:10px 12px;font-weight:700;${colorStyle}">${displayValor}</td>`;
        });
        html += `
                <td style="text-align:center;padding:10px 12px;font-weight:700;${totalColor}">${proj.total.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
            </tr>
        `;
        tbody.innerHTML += html;

        const diretores = Object.values(proj.diretores).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        diretores.forEach(dir => {
            const dTotalColor = dir.total < 0 ? 'color:#FF0000;' : (dir.total > 0 ? 'color:#00AA00;' : '');
            let dirHtml = `
                <tr class="diretor-row" data-parent-projeto="${projetoId}" style="display:none;border-bottom:1px solid var(--border);">
                    <td style="text-align:left;padding:8px 12px;padding-left:24px;font-weight:500;color:var(--text-soft);">↳</td>
                    <td style="text-align:left;padding:8px 12px;font-weight:500;">${dir.nome}</td>
                    <td style="text-align:left;padding:8px 12px;color:var(--text-soft);font-size:12px;">—</td>
            `;
            mesesExibir.forEach(mes => {
                const saldo = dir.meses[mes]?.saldo;
                const temValor = saldo !== undefined && saldo !== 0;
                let displayValor = '-';
                let colorStyle = '';
                if (temValor) {
                    colorStyle = saldo < 0 ? 'color:#FF0000;' : 'color:#00AA00;';
                    displayValor = saldo.toLocaleString('pt-BR', { minFractionDigits: 2 });
                }
                dirHtml += `<td style="text-align:center;padding:8px 12px;${colorStyle}">${displayValor}</td>`;
            });
            dirHtml += `
                    <td style="text-align:center;padding:8px 12px;font-weight:600;${dTotalColor}">${dir.total.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                </tr>
            `;
            tbody.innerHTML += dirHtml;
        });
    });

    document.querySelectorAll('.projeto-row').forEach(row => {
        row.onclick = function () {
            const projetoId = this.dataset.projeto;
            const linhasDiretores = document.querySelectorAll(`tr[data-parent-projeto="${projetoId}"]`);
            const icon = document.getElementById(`icon-${projetoId}`);
            if (linhasDiretores.length === 0) return;

            const estaOculto = linhasDiretores[0].style.display === 'none';
            linhasDiretores.forEach(tr => {
                tr.style.display = estaOculto ? '' : 'none';
            });
            if (icon) icon.textContent = estaOculto ? '▼' : '▶';
        };
    });

    _ultimoRenderDON = { projetos, mesesExibir };
    renderizarTotalGeralCard(totalCardId, 'don', mesesExibir, projetos, totalGeral);
}

// =====================================================
// FILTROS
// =====================================================
function lerFiltrosDashboard(prefixo) {
    if (prefixo === 'don') {
        return {
            projeto: document.getElementById('filt-don-projeto')?.value || '',
            diretor: document.getElementById('filt-don-diretor')?.value || '',
            ano: document.getElementById('filt-don-ano')?.value || '',
            mes: document.getElementById('filt-don-mes')?.value || ''
        };
    } else if (prefixo === 'cre') {
        return {
            gestor: document.getElementById('filt-cre-gestor')?.value || '',
            projeto: document.getElementById('filt-cre-projeto')?.value || '',
            ano: document.getElementById('filt-cre-ano')?.value || '',
            mes: document.getElementById('filt-cre-mes')?.value || ''
        };
    } else {
        // 'aprop' (Status)
        return {
            gestor: document.getElementById('filt-aprop-gestor')?.value || '',
            projeto: document.getElementById('filt-aprop-projeto')?.value || '',
            ano: document.getElementById('filt-aprop-ano')?.value || '',
            mes: document.getElementById('filt-aprop-mes')?.value || ''
        };
    }
}

function aplicarFiltrosDashboard(lista, filtros, prefixo) {
    if (prefixo === 'don') {
        return lista.filter(item => {
            if (filtros.projeto && item.projetos?.nome !== filtros.projeto) return false;
            if (filtros.diretor && item.diretores?.nome !== filtros.diretor) return false;
            if (filtros.ano && String(item.ano) !== String(filtros.ano)) return false;
            if (filtros.mes) {
                const mesDoRegistro = item.mes ?? item.mes_medido;
                if (mesDoRegistro && mesDoRegistro !== filtros.mes) return false;
            }
            return true;
        });
    } else {
        // 'aprop' ou 'cre'
        return lista.filter(item => {
            if (filtros.gestor && item.gestores_logictel?.nome !== filtros.gestor) return false;
            if (filtros.projeto && item.projetos?.nome !== filtros.projeto) return false;
            if (filtros.ano && String(item.ano) !== String(filtros.ano)) return false;
            if (filtros.mes && item.mes && item.mes !== filtros.mes) return false;
            return true;
        });
    }
}

// =====================================================
// DASHBOARD STATUS (CINZA)
// =====================================================
export async function carregarDashApropriacao() {
    const tbody = document.getElementById('tabela-dash-apropriacao');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Carregando...</td></tr>`;

    try {
        const filtros = lerFiltrosDashboard('aprop');
        const statusDCMap = await carregarStatusDCMap();
        
        const { data: medicoes, error: errorMed } = await supabaseClient
            .from('medicoes')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id, mes, ano, valor_status,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorMed) throw errorMed;

        const { data: consumos, error: errorCons } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id, status_id,
                mes_apropriacao, mes_medido, ano, valor,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorCons) throw errorCons;

        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes || [], filtros, 'aprop');
        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros, 'aprop');
        
        const { grupos, mesesExibir } = calcularGruposSaldo(
            medicoesFiltradas, 
            consumosFiltrados, 
            'valor_status',
            false, // não é CRE
            statusDCMap
        );
        
        _ultimoRenderStatus = { linhas: Object.values(grupos), mesesExibir };
        renderizarDashboardStatus('aprop-header', 'tabela-dash-apropriacao', grupos, mesesExibir, 'status-header', 'aprop-total-geral', 'status');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard Status:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD DON (AZUL) - COM EXPANSÃO POR CLIQUE
// =====================================================
export async function carregarDashDON() {
    const tbody = document.getElementById('tabela-dash-don');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Carregando...</td></tr>`;

    try {
        const filtros = lerFiltrosDashboard('don');
        const statusDCMap = await carregarStatusDCMap();
        
        const { data: medicoes, error: errorMed } = await supabaseClient
            .from('medicoes')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id, mes, ano, valor_don,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorMed) throw errorMed;

        const { data: consumos, error: errorCons } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id, status_id,
                mes_apropriacao, mes_medido, ano, valor,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorCons) throw errorCons;

        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes || [], filtros, 'don');
        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros, 'don');
        
        const { grupos, mesesExibir } = calcularGruposSaldoDON(
            medicoesFiltradas, 
            consumosFiltrados,
            statusDCMap
        );
        
        renderizarDashboardDON('don-header', 'tabela-dash-don', grupos, mesesExibir, 'don-total-geral');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard DON:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD CRE (DC em tramitação CRE) - COM EXPANSÃO POR CLIQUE
// =====================================================
export async function carregarDashCRE() {
    const tbody = document.getElementById('tabela-dash-cre');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Carregando...</td></tr>`;

    try {
        const filtros = lerFiltrosDashboard('cre');
        const statusDCMap = await carregarStatusDCMap();
        
        const { data: medicoes, error: errorMed } = await supabaseClient
            .from('medicoes')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id, mes, ano, valor_status,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorMed) throw errorMed;

        const { data: consumos, error: errorCons } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id, status_id,
                mes_apropriacao, mes_medido, ano, valor,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorCons) throw errorCons;

        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes || [], filtros, 'cre');
        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros, 'cre');
        
        // Para CRE, usamos o mesmo cálculo do Status, mas com filtro CRE = true
        const { grupos, mesesExibir } = calcularGruposSaldo(
            medicoesFiltradas, 
            consumosFiltrados, 
            'valor_status',
            true, // é CRE - só inclui MF
            statusDCMap
        );
        
        _ultimoRenderCRE = { linhas: Object.values(grupos), mesesExibir };
        renderizarDashboardStatus('cre-header', 'tabela-dash-cre', grupos, mesesExibir, 'cre-header', 'cre-total-geral', 'cre');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard CRE:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados.</td></tr>`;
    }
}