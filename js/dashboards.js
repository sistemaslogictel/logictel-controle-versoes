import { supabaseClient } from './config.js';
import { registrarUltimaAtualizacao } from './utils.js';

const MESES_ORDEM = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// =====================================================
// CÁLCULO COMPARTILHADO DE SALDO POR MÊS (para STATUS)
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
// CÁLCULO DE SALDO PARA DON - AGRUPADO POR PROJETO E DIRETOR (SUB-LINHAS)
// =====================================================
function calcularGruposSaldoDON(medicoes, consumos) {
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

    // Processar consumos
    consumos.forEach(c => {
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

    renderizarTotalGeralCard(totalCardId, tema, mesesExibir, linhas, totalGeral);
}

// =====================================================
// RENDERIZAÇÃO DA TABELA DON - COM PROJETO E SUB-LINHAS POR DIRETOR
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

    projetos.forEach(proj => {
        totalGeral += proj.total;
        const totalColor = proj.total < 0 ? 'color:#FF0000;' : (proj.total > 0 ? 'color:#00AA00;' : '');

        // Linha do Projeto (destaque)
        let html = `
            <tr style="border-top:2px solid var(--primary);background:var(--primary-100);">
                <td style="text-align:left;padding:10px 12px;font-weight:700;font-size:14px;">${proj.projeto}</td>
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

        // Sub-linhas: Diretores do Projeto
        const diretores = Object.values(proj.diretores).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        diretores.forEach(dir => {
            const dTotalColor = dir.total < 0 ? 'color:#FF0000;' : (dir.total > 0 ? 'color:#00AA00;' : '');
            let dHtml = `
                <tr style="border-bottom:1px solid var(--border);">
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
                dHtml += `<td style="text-align:center;padding:8px 12px;${colorStyle}">${displayValor}</td>`;
            });
            dHtml += `
                    <td style="text-align:center;padding:8px 12px;font-weight:600;${dTotalColor}">${dir.total.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                </tr>
            `;
            tbody.innerHTML += dHtml;
        });
    });

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
            if (filtros.mes && item.mes !== filtros.mes) return false;
            return true;
        });
    } else {
        // 'aprop' (Status)
        return lista.filter(item => {
            if (filtros.gestor && item.gestores_logictel?.nome !== filtros.gestor) return false;
            if (filtros.projeto && item.projetos?.nome !== filtros.projeto) return false;
            if (filtros.ano && String(item.ano) !== String(filtros.ano)) return false;
            if (filtros.mes && item.mes !== filtros.mes) return false;
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

        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes || [], filtros, 'aprop');
        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros, 'aprop');
        
        const { grupos, mesesExibir } = calcularGruposSaldo(
            medicoesFiltradas, 
            consumosFiltrados, 
            'mes_apropriacao',
            'valor_status'
        );
        
        renderizarDashboardStatus('aprop-header', 'tabela-dash-apropriacao', grupos, mesesExibir, 'status-header', 'aprop-total-geral', 'status');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard Status:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD DON (AZUL) - AGRUPADO POR PROJETO > DIRETOR
// =====================================================
export async function carregarDashDON() {
    const tbody = document.getElementById('tabela-dash-don');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Carregando...</td></tr>`;

    try {
        const filtros = lerFiltrosDashboard('don');
        
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
                id, projeto_id, gestor_logictel_id, diretor_id,
                mes_apropriacao, mes_medido, ano, valor,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorCons) throw errorCons;

        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes || [], filtros, 'don');
        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros, 'don');
        
        const { grupos, mesesExibir } = calcularGruposSaldoDON(
            medicoesFiltradas, 
            consumosFiltrados
        );
        
        renderizarDashboardDON('don-header', 'tabela-dash-don', grupos, mesesExibir, 'don-total-geral');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard DON:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados.</td></tr>`;
    }
}
