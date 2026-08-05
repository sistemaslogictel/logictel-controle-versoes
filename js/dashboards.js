import { supabaseClient } from './config.js';
import { registrarUltimaAtualizacao } from './utils.js';

const MESES_ORDEM = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// =====================================================
// CÁLCULO COMPARTILHADO DE SALDO POR MÊS
// =====================================================
function calcularGruposSaldo(medicoes, consumos, campoMesConsumo, campoValor) {
    const grupos = {};
    const todosMeses = new Set();

    function garantirGrupo(key, origem) {
        if (!grupos[key]) {
            grupos[key] = {
                gestor: origem.gestores_logictel?.nome || 'N/A',
                projeto: origem.projetos?.nome || 'N/A',
                descricao: origem.projetos?.nome || '',
                meses: {},
                total: 0
            };
        }
        return grupos[key];
    }

    medicoes.forEach(med => {
        const key = `${med.gestor_logictel_id}|${med.projeto_id}|${med.ano}`;
        const g = garantirGrupo(key, med);
        todosMeses.add(med.mes);
        if (!g.meses[med.mes]) g.meses[med.mes] = { medicao: 0, consumo: 0 };
        const valor = -Math.abs(Number(med[campoValor] || 0));
        g.meses[med.mes].medicao += valor;
    });

    consumos.forEach(c => {
        const key = `${c.gestor_logictel_id}|${c.projeto_id}|${c.ano}`;
        const mes = c[campoMesConsumo];
        if (!mes) return;
        const g = garantirGrupo(key, c);
        todosMeses.add(mes);
        if (!g.meses[mes]) g.meses[mes] = { medicao: 0, consumo: 0 };
        const valor = Math.abs(Number(c.valor || 0));
        g.meses[mes].consumo += valor;
    });

    Object.values(grupos).forEach(g => {
        let total = 0;
        Object.keys(g.meses).forEach(mes => {
            const medicaoVal = g.meses[mes].medicao || 0;
            const consumoVal = g.meses[mes].consumo || 0;
            const saldo = medicaoVal + consumoVal;
            g.meses[mes].saldo = saldo;
            total += saldo;
        });
        g.total = total;
    });

    const mesesComSaldo = new Set();
    Object.values(grupos).forEach(g => {
        Object.keys(g.meses).forEach(mes => {
            if (g.meses[mes].saldo !== 0) {
                mesesComSaldo.add(mes);
            }
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
// ÍCONE DO CARD "TOTAL GERAL" (seta de tendência)
// =====================================================
const ICONE_TOTAL_GERAL = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="14 7 21 7 21 14"></polyline></svg>`;

function classeValor(v) {
    if (v > 0) return 'valor-positivo';
    if (v < 0) return 'valor-negativo';
    return 'valor-zero';
}

// =====================================================
// CARD "TOTAL GERAL" (fora da tabela, no rodapé da dashboard)
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

// =====================================================
// RENDERIZAÇÃO DA TABELA - ALINHAMENTO CENTRALIZADO
// =====================================================
function renderizarDashboard(headerId, tbodyId, grupos, mesesExibir, headerClass, totalCardId, tema) {
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
        renderizarTotalGeralCard(totalCardId, tema, mesesExibir, [], 0);
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

    // Card "TOTAL GERAL" renderizado separadamente, fora da tabela (ver imagens de referência)
    renderizarTotalGeralCard(totalCardId, tema, mesesExibir, linhas, totalGeral);
}

// =====================================================
// DASHBOARD DON — AGRUPADO POR GESTOR/PROJETO, COM SUB-LINHAS POR DIRETOR
// =====================================================
function calcularGruposDON(itensDon, consumos) {
    const grupos = {};
    const todosMeses = new Set();

    function garantirParent(gestorId, projetoId, ano, gestorNome, projetoNome) {
        const key = `${gestorId}|${projetoId}|${ano}`;
        if (!grupos[key]) {
            grupos[key] = {
                gestor: gestorNome,
                projeto: projetoNome,
                descricao: projetoNome,
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
            parent.diretores[key] = { nome: diretorNome || 'Sem diretor atribuído', meses: {}, total: 0 };
        }
        return parent.diretores[key];
    }

    itensDon.forEach(item => {
        if (!item.mes) return;
        const parent = garantirParent(item.gestor_logictel_id, item.projeto_id, item.ano, item.gestores_logictel?.nome || 'N/A', item.projetos?.nome || 'N/A');
        const dir = garantirDiretor(parent, item.diretor_id, item.diretor_nome);
        todosMeses.add(item.mes);

        const valor = -Math.abs(Number(item.valor || 0));
        if (!parent.meses[item.mes]) parent.meses[item.mes] = { medicao: 0, consumo: 0 };
        parent.meses[item.mes].medicao += valor;
        if (!dir.meses[item.mes]) dir.meses[item.mes] = { medicao: 0, consumo: 0 };
        dir.meses[item.mes].medicao += valor;
    });

    consumos.forEach(c => {
        const mes = c.mes_medido;
        if (!mes) return;
        const parent = garantirParent(c.gestor_logictel_id, c.projeto_id, c.ano, c.gestores_logictel?.nome || 'N/A', c.projetos?.nome || 'N/A');
        const dir = garantirDiretor(parent, c.diretor_id, c.diretores?.nome);
        todosMeses.add(mes);

        const valor = Math.abs(Number(c.valor || 0));
        if (!parent.meses[mes]) parent.meses[mes] = { medicao: 0, consumo: 0 };
        parent.meses[mes].consumo += valor;
        if (!dir.meses[mes]) dir.meses[mes] = { medicao: 0, consumo: 0 };
        dir.meses[mes].consumo += valor;
    });

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
        Object.values(g.diretores).forEach(d => { d.total = calcularSaldos(d.meses); });
    });

    const mesesComSaldo = new Set();
    Object.values(grupos).forEach(g => {
        Object.keys(g.meses).forEach(mes => { if (g.meses[mes].saldo !== 0) mesesComSaldo.add(mes); });
    });
    if (mesesComSaldo.size === 0 && todosMeses.size > 0) {
        const primeiroMes = Array.from(todosMeses).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b))[0];
        if (primeiroMes) mesesComSaldo.add(primeiroMes);
    }

    const mesesExibir = Array.from(mesesComSaldo).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));
    return { grupos, mesesExibir };
}

function celulaValorDON(saldo) {
    const temValor = saldo !== undefined && saldo !== 0;
    let displayValor = '-';
    let colorStyle = '';
    if (temValor) {
        colorStyle = saldo < 0 ? 'color:#FF0000;' : 'color:#00AA00;';
        displayValor = saldo.toLocaleString('pt-BR', { minFractionDigits: 2 });
    }
    return { displayValor, colorStyle };
}

function renderizarDashboardDON(headerId, tbodyId, grupos, mesesExibir, totalCardId) {
    const headerRow = document.querySelector(`#${headerId}`);
    if (headerRow) {
        let html = `<tr class="don-header">
            <th style="text-align:left;padding:10px 12px;">Gestão / Diretor</th>
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
        renderizarTotalGeralCard(totalCardId, 'don', mesesExibir, [], 0);
        return;
    }

    tbody.innerHTML = '';
    let totalGeral = 0;

    linhas.forEach(g => {
        totalGeral += g.total;
        const totalColor = g.total < 0 ? 'color:#FF0000;' : (g.total > 0 ? 'color:#00AA00;' : '');

        let html = `
            <tr class="linha-grupo-don">
                <td style="text-align:left;padding:10px 12px;font-weight:700;">${g.gestor}</td>
                <td style="text-align:left;padding:10px 12px;font-weight:500;">${g.projeto}</td>
                <td style="text-align:left;padding:10px 12px;color:var(--text-soft);">${g.descricao}</td>
        `;
        mesesExibir.forEach(mes => {
            const { displayValor, colorStyle } = celulaValorDON(g.meses[mes]?.saldo);
            html += `<td style="text-align:center;padding:10px 12px;font-weight:600;${colorStyle}">${displayValor}</td>`;
        });
        html += `
                <td style="text-align:center;padding:10px 12px;font-weight:700;${totalColor}">${g.total.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
            </tr>
        `;
        tbody.innerHTML += html;

        const diretores = Object.values(g.diretores).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        diretores.forEach(d => {
            const dTotalColor = d.total < 0 ? 'color:#FF0000;' : (d.total > 0 ? 'color:#00AA00;' : '');
            let dHtml = `
                <tr class="linha-diretor-don">
                    <td>↳ ${d.nome}</td>
                    <td></td>
                    <td></td>
            `;
            mesesExibir.forEach(mes => {
                const { displayValor, colorStyle } = celulaValorDON(d.meses[mes]?.saldo);
                dHtml += `<td style="text-align:center;padding:8px 12px;${colorStyle}">${displayValor}</td>`;
            });
            dHtml += `
                    <td style="text-align:center;padding:8px 12px;${dTotalColor}">${d.total.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                </tr>
            `;
            tbody.innerHTML += dHtml;
        });
    });

    renderizarTotalGeralCard(totalCardId, 'don', mesesExibir, linhas, totalGeral);
}

// =====================================================
// FILTROS
// =====================================================
function lerFiltrosDashboard(prefixo) {
    return {
        gestor: document.getElementById(`filt-${prefixo}-gestor`)?.value || '',
        projeto: document.getElementById(`filt-${prefixo}-projeto`)?.value || '',
        ano: document.getElementById(`filt-${prefixo}-ano`)?.value || ''
    };
}

function aplicarFiltrosDashboard(lista, filtros) {
    if (!filtros.gestor && !filtros.projeto && !filtros.ano) return lista;
    return lista.filter(item => {
        if (filtros.gestor && item.gestores_logictel?.nome !== filtros.gestor) return false;
        if (filtros.projeto && item.projetos?.nome !== filtros.projeto) return false;
        if (filtros.ano && String(item.ano) !== String(filtros.ano)) return false;
        return true;
    });
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
                id, projeto_id, gestor_logictel_id, diretor_id,
                mes_apropriacao, mes_medido, ano, valor,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorCons) throw errorCons;

        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes || [], filtros);
        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros);
        
        const { grupos, mesesExibir } = calcularGruposSaldo(
            medicoesFiltradas, 
            consumosFiltrados, 
            'mes_apropriacao',
            'valor_status'
        );
        
        renderizarDashboard('aprop-header', 'tabela-dash-apropriacao', grupos, mesesExibir, 'status-header', 'aprop-total-geral', 'status');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard Status:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD DON (AZUL)
// =====================================================
export async function carregarDashDON() {
    const tbody = document.getElementById('tabela-dash-don');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Carregando...</td></tr>`;

    try {
        const filtros = lerFiltrosDashboard('don');

        const { data: itensDon, error: errorItens } = await supabaseClient
            .from('medicao_distribuicao')
            .select(`
                id, valor, diretor_id,
                diretores(nome),
                medicoes(mes, ano, projeto_id, gestor_logictel_id, projetos(nome), gestores_logictel(nome))
            `)
            .eq('tipo', 'don');
        if (errorItens) throw errorItens;

        const { data: consumos, error: errorCons } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id,
                mes_apropriacao, mes_medido, ano, valor,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorCons) throw errorCons;

        // "Achata" os itens de distribuição (que vêm aninhados em medicoes(...))
        // para o mesmo formato usado pelo filtro de dashboards.
        const itensDonFlat = (itensDon || [])
            .filter(item => item.medicoes)
            .map(item => ({
                valor: item.valor,
                diretor_id: item.diretor_id,
                diretor_nome: item.diretores?.nome || 'Sem diretor atribuído',
                mes: item.medicoes.mes,
                ano: item.medicoes.ano,
                gestor_logictel_id: item.medicoes.gestor_logictel_id,
                gestores_logictel: item.medicoes.gestores_logictel,
                projeto_id: item.medicoes.projeto_id,
                projetos: item.medicoes.projetos
            }));

        const itensFiltrados = aplicarFiltrosDashboard(itensDonFlat, filtros);
        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros);

        const { grupos, mesesExibir } = calcularGruposDON(itensFiltrados, consumosFiltrados);

        renderizarDashboardDON('don-header', 'tabela-dash-don', grupos, mesesExibir, 'don-total-geral');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard DON:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados.</td></tr>`;
    }
}
