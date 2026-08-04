import { supabaseClient } from './config.js';
import { registrarUltimaAtualizacao } from './utils.js';

const MESES_ORDEM = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// =====================================================
// CÁLCULO COMPARTILHADO DE SALDO POR MÊS
// =====================================================
function calcularGruposSaldo(medicoes, consumos, campoMesConsumo, campoValorMedicao = 'valor') {
    const grupos = {};
    const todosMeses = new Set();

    function garantirGrupo(key, origem) {
        if (!grupos[key]) {
            grupos[key] = {
                gestor: origem.gestores_logictel?.nome || 'N/A',
                projeto: origem.projetos?.nome || 'N/A',
                descricao: origem.projetos?.nome || '',
                empresa: origem.empresas?.nome || 'N/A',
                meses: {},
                total: 0
            };
        }
        return grupos[key];
    }

    medicoes.forEach(med => {
        const key = `${med.gestor_logictel_id}|${med.projeto_id}|${med.empresa_id}|${med.ano}`;
        const g = garantirGrupo(key, med);
        todosMeses.add(med.mes);
        if (!g.meses[med.mes]) g.meses[med.mes] = { medicao: 0, consumo: 0 };
        // Usa o campo específico (valor para DON, valor_status para Status)
        g.meses[med.mes].medicao += Number(med[campoValorMedicao] || 0);
    });

    consumos.forEach(c => {
        const key = `${c.gestor_logictel_id}|${c.projeto_id}|${c.empresa_id}|${c.ano}`;
        const mes = c[campoMesConsumo];
        if (!mes) return;
        const g = garantirGrupo(key, c);
        todosMeses.add(mes);
        if (!g.meses[mes]) g.meses[mes] = { medicao: 0, consumo: 0 };
        g.meses[mes].consumo += Number(c.valor || 0);
    });

    Object.values(grupos).forEach(g => {
        let total = 0;
        Object.keys(g.meses).forEach(mes => {
            const medicaoVal = g.meses[mes].medicao || 0;
            const consumoVal = g.meses[mes].consumo || 0;
            const saldo = -medicaoVal + consumoVal;
            g.meses[mes].saldo = saldo;
            total += saldo;
        });
        g.total = total;
    });

    // Filtra apenas meses que têm valores não-zero em pelo menos um grupo
    let mesesExibir = Array.from(todosMeses).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));
    
    // Remove meses onde todos os grupos têm saldo zero ou undefined
    mesesExibir = mesesExibir.filter(mes => {
        return Object.values(grupos).some(g => {
            const saldo = g.meses[mes]?.saldo;
            return saldo !== undefined && saldo !== 0;
        });
    });

    return { grupos, mesesExibir };
}

// =====================================================
// RENDERIZAÇÃO COMPARTILHADA DA TABELA
// =====================================================
function renderizarDashboard(headerId, tbodyId, grupos, mesesExibir) {
    const headerRow = document.querySelector(`#${headerId}`);
    if (headerRow) {
        let html = '<tr><th>Gestão</th><th>Projeto</th><th>Descrição</th><th>Empresa</th>';
        mesesExibir.forEach(mes => {
            html += `<th class="mes-header">${mes}</th>`;
        });
        html += '<th>Total Geral</th></tr>';
        headerRow.innerHTML = html;
    }

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const linhas = Object.values(grupos);
    if (linhas.length === 0 || mesesExibir.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${4 + mesesExibir.length + 1}" class="p-6 text-center" style="color:var(--text-soft)">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    let totalGeral = 0;

    linhas.forEach(g => {
        totalGeral += g.total;

        let html = `
            <tr class="td-row">
                <td class="gestor-coluna">${g.gestor}</td>
                <td class="projeto-coluna">${g.projeto}</td>
                <td class="descricao-coluna">${g.descricao}</td>
                <td class="empresa-coluna">${g.empresa}</td>
        `;

        mesesExibir.forEach(mes => {
            const saldo = g.meses[mes]?.saldo;
            const temValor = saldo !== undefined;
            
            let valorClass = 'valor-zero';
            if (temValor) {
                if (saldo < 0) {
                    valorClass = 'valor-negativo';
                } else if (saldo > 0) {
                    valorClass = 'valor-positivo';
                }
            }
            
            const displayValor = temValor && saldo !== 0 ? 
                saldo.toLocaleString('pt-BR', { minFractionDigits: 2 }) : 
                '-';
            
            html += `<td class="mes-coluna ${valorClass}">${displayValor}</td>`;
        });

        let totalClass = 'valor-zero';
        if (g.total < 0) {
            totalClass = 'valor-negativo';
        } else if (g.total > 0) {
            totalClass = 'valor-positivo';
        }
        
        html += `
                <td class="${totalClass}">${g.total.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
            </tr>
        `;

        tbody.innerHTML += html;
    });

    let totalClass = 'valor-zero';
    if (totalGeral < 0) {
        totalClass = 'valor-negativo';
    } else if (totalGeral > 0) {
        totalClass = 'valor-positivo';
    }
    
    let totalHtml = `
        <tr class="total-row">
            <td colspan="4" style="font-weight:700;text-align:right;">TOTAL GERAL</td>
    `;

    mesesExibir.forEach(mes => {
        let totalMes = 0;
        linhas.forEach(g => { 
            totalMes += g.meses[mes]?.saldo || 0; 
        });
        
        let mesClass = 'valor-zero';
        if (totalMes < 0) {
            mesClass = 'valor-negativo';
        } else if (totalMes > 0) {
            mesClass = 'valor-positivo';
        }
        
        totalHtml += `<td class="mes-coluna ${mesClass}">${totalMes !== 0 ? totalMes.toLocaleString('pt-BR', { minFractionDigits: 2 }) : '-'}</td>`;
    });

    totalHtml += `
            <td class="${totalClass}" style="font-weight:700;">${totalGeral.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
        </tr>
    `;
    tbody.innerHTML += totalHtml;
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

async function buscarMedicoesEConsumos() {
    const { data: medicoes, error: errorMed } = await supabaseClient
        .from('medicoes')
        .select(`
            id, empresa_id, projeto_id, gestor_logictel_id, diretor_id, mes, ano, valor, valor_status,
            empresas(nome), projetos(nome), gestores_logictel(nome), diretores(nome)
        `);
    if (errorMed) throw errorMed;

    const { data: consumos, error: errorCons } = await supabaseClient
        .from('consumo_dc')
        .select(`
            id, empresa_id, projeto_id, gestor_logictel_id, diretor_id,
            mes_apropriacao, mes_medido, ano, valor,
            empresas(nome), projetos(nome), gestores_logictel(nome), diretores(nome)
        `);
    if (errorCons) throw errorCons;

    return { medicoes: medicoes || [], consumos: consumos || [] };
}

// =====================================================
// DASHBOARD STATUS - Usa valor_status das medições
// =====================================================
export async function carregarDashApropriacao() {
    const tbody = document.getElementById('tabela-dash-apropriacao');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>`;

    try {
        const filtros = lerFiltrosDashboard('aprop');
        const { medicoes, consumos } = await buscarMedicoesEConsumos();
        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes, filtros);
        const consumosFiltrados = aplicarFiltrosDashboard(consumos, filtros);
        // Usa valor_status para a Dashboard Status
        const { grupos, mesesExibir } = calcularGruposSaldo(medicoesFiltradas, consumosFiltrados, 'mes_apropriacao', 'valor_status');
        renderizarDashboard('aprop-header', 'tabela-dash-apropriacao', grupos, mesesExibir);
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard Status:', e);
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD DON - Usa valor das medições
// =====================================================
export async function carregarDashDON() {
    const tbody = document.getElementById('tabela-dash-don');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>`;

    try {
        const filtros = lerFiltrosDashboard('don');
        const { medicoes, consumos } = await buscarMedicoesEConsumos();
        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes, filtros);
        const consumosFiltrados = aplicarFiltrosDashboard(consumos, filtros);
        // Usa valor para a Dashboard DON
        const { grupos, mesesExibir } = calcularGruposSaldo(medicoesFiltradas, consumosFiltrados, 'mes_medido', 'valor');
        renderizarDashboard('don-header', 'tabela-dash-don', grupos, mesesExibir);
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard DON:', e);
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}
