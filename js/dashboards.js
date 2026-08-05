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
// RENDERIZAÇÃO DA TABELA
// =====================================================
function renderizarDashboard(headerId, tbodyId, grupos, mesesExibir, headerClass) {
    const headerRow = document.querySelector(`#${headerId}`);
    if (headerRow) {
        let html = `<tr class="${headerClass}">
            <th style="text-align:left;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Gestão</th>
            <th style="text-align:left;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Projeto</th>
            <th style="text-align:left;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Descrição</th>`;
        mesesExibir.forEach(mes => {
            html += `<th style="text-align:center;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;min-width:80px;">${mes}</th>`;
        });
        html += '<th style="text-align:center;padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;min-width:80px;">Total</th></tr>';
        headerRow.innerHTML = html;
    }

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const linhas = Object.values(grupos);
    if (linhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${3 + mesesExibir.length + 1}" style="padding:20px;text-align:center;color:var(--text-soft);font-size:13px;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    let totalGeral = 0;

    const totaisPorMes = {};
    mesesExibir.forEach(mes => { totaisPorMes[mes] = 0; });

    linhas.forEach(g => {
        totalGeral += g.total;

        mesesExibir.forEach(mes => {
            const saldo = g.meses[mes]?.saldo || 0;
            totaisPorMes[mes] += saldo;
        });

        let html = `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="text-align:left;padding:8px 12px;font-weight:600;font-size:13px;">${g.gestor}</td>
                <td style="text-align:left;padding:8px 12px;font-weight:500;font-size:13px;">${g.projeto}</td>
                <td style="text-align:left;padding:8px 12px;color:var(--text-soft);font-size:13px;">${g.descricao}</td>
        `;

        mesesExibir.forEach(mes => {
            const saldo = g.meses[mes]?.saldo;
            const temValor = saldo !== undefined && saldo !== 0;
            
            let colorStyle = '';
            let displayValor = '-';
            
            if (temValor) {
                if (saldo < 0) {
                    colorStyle = 'color:#FF0000;font-weight:600;';
                } else if (saldo > 0) {
                    colorStyle = 'color:#00AA00;font-weight:600;';
                }
                displayValor = saldo.toLocaleString('pt-BR', { minFractionDigits: 2 });
            }
            
            html += `<td style="text-align:center;padding:8px 12px;font-family:'IBM Plex Mono',monospace;font-size:13px;${colorStyle}">${displayValor}</td>`;
        });

        let totalColor = '';
        if (g.total < 0) {
            totalColor = 'color:#FF0000;';
        } else if (g.total > 0) {
            totalColor = 'color:#00AA00;';
        }
        
        html += `
                <td style="text-align:center;padding:8px 12px;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:13px;${totalColor}">${g.total.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
            </tr>
        `;

        tbody.innerHTML += html;
    });

    let totalHtml = `
        <tr style="background:var(--primary-100);font-weight:700;border-top:2px solid var(--primary);border-bottom:2px solid var(--primary);">
            <td colspan="3" style="text-align:right;padding:8px 12px;font-size:13px;font-weight:700;">TOTAL GERAL</td>
    `;

    mesesExibir.forEach(mes => {
        const totalMes = totaisPorMes[mes] || 0;
        
        let mesColor = '';
        if (totalMes < 0) {
            mesColor = 'color:#FF0000;';
        } else if (totalMes > 0) {
            mesColor = 'color:#00AA00;';
        }
        
        totalHtml += `<td style="text-align:center;padding:8px 12px;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:700;${mesColor}">${totalMes !== 0 ? totalMes.toLocaleString('pt-BR', { minFractionDigits: 2 }) : '-'}</td>`;
    });

    let totalColor = '';
    if (totalGeral < 0) {
        totalColor = 'color:#FF0000;';
    } else if (totalGeral > 0) {
        totalColor = 'color:#00AA00;';
    }

    totalHtml += `
            <td style="text-align:center;padding:8px 12px;font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:700;${totalColor}">${totalGeral.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
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

// =====================================================
// DASHBOARD STATUS (CINZA)
// =====================================================
export async function carregarDashApropriacao() {
    const tbody = document.getElementById('tabela-dash-apropriacao');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Carregando...</td></tr>`;

    try {
        console.log('🔄 Carregando Dashboard Status...');
        
        const filtros = lerFiltrosDashboard('aprop');
        console.log('📋 Filtros:', filtros);

        // Buscar medições
        console.log('📡 Buscando medições...');
        const { data: medicoes, error: errorMed } = await supabaseClient
            .from('medicoes')
            .select(`
                id, 
                projeto_id, 
                gestor_logictel_id, 
                diretor_id, 
                mes, 
                ano, 
                valor_status,
                projetos:nome,
                gestores_logictel:nome,
                diretores:nome
            `);
        
        if (errorMed) {
            console.error('❌ Erro ao buscar medições:', errorMed);
            tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar medições: ${errorMed.message}</td></tr>`;
            return;
        }
        console.log('✅ Medições carregadas:', medicoes?.length || 0);

        // Buscar consumos
        console.log('📡 Buscando consumos...');
        const { data: consumos, error: errorCons } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id, 
                projeto_id, 
                gestor_logictel_id, 
                diretor_id,
                mes_apropriacao, 
                mes_medido, 
                ano, 
                valor,
                projetos:nome,
                gestores_logictel:nome,
                diretores:nome
            `);
        
        if (errorCons) {
            console.error('❌ Erro ao buscar consumos:', errorCons);
            tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar consumos: ${errorCons.message}</td></tr>`;
            return;
        }
        console.log('✅ Consumos carregados:', consumos?.length || 0);

        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes || [], filtros);
        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros);
        
        console.log('📊 Medições filtradas:', medicoesFiltradas.length);
        console.log('📊 Consumos filtrados:', consumosFiltrados.length);
        
        const { grupos, mesesExibir } = calcularGruposSaldo(
            medicoesFiltradas, 
            consumosFiltrados, 
            'mes_apropriacao',
            'valor_status'
        );
        
        console.log('📈 Grupos encontrados:', Object.keys(grupos).length);
        console.log('📅 Meses a exibir:', mesesExibir);
        
        renderizarDashboard('aprop-header', 'tabela-dash-apropriacao', grupos, mesesExibir, 'status-header');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('💥 Erro inesperado no Dashboard Status:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados: ${e.message}</td></tr>`;
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
        console.log('🔄 Carregando Dashboard DON...');
        
        const filtros = lerFiltrosDashboard('don');
        console.log('📋 Filtros:', filtros);

        // Buscar medições
        console.log('📡 Buscando medições...');
        const { data: medicoes, error: errorMed } = await supabaseClient
            .from('medicoes')
            .select(`
                id, 
                projeto_id, 
                gestor_logictel_id, 
                diretor_id, 
                mes, 
                ano, 
                valor_don,
                projetos:nome,
                gestores_logictel:nome,
                diretores:nome
            `);
        
        if (errorMed) {
            console.error('❌ Erro ao buscar medições:', errorMed);
            tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar medições: ${errorMed.message}</td></tr>`;
            return;
        }
        console.log('✅ Medições carregadas:', medicoes?.length || 0);

        // Buscar consumos
        console.log('📡 Buscando consumos...');
        const { data: consumos, error: errorCons } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id, 
                projeto_id, 
                gestor_logictel_id, 
                diretor_id,
                mes_apropriacao, 
                mes_medido, 
                ano, 
                valor,
                projetos:nome,
                gestores_logictel:nome,
                diretores:nome
            `);
        
        if (errorCons) {
            console.error('❌ Erro ao buscar consumos:', errorCons);
            tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar consumos: ${errorCons.message}</td></tr>`;
            return;
        }
        console.log('✅ Consumos carregados:', consumos?.length || 0);

        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes || [], filtros);
        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros);
        
        console.log('📊 Medições filtradas:', medicoesFiltradas.length);
        console.log('📊 Consumos filtrados:', consumosFiltrados.length);
        
        const { grupos, mesesExibir } = calcularGruposSaldo(
            medicoesFiltradas, 
            consumosFiltrados, 
            'mes_medido',
            'valor_don'
        );
        
        console.log('📈 Grupos encontrados:', Object.keys(grupos).length);
        console.log('📅 Meses a exibir:', mesesExibir);
        
        renderizarDashboard('don-header', 'tabela-dash-don', grupos, mesesExibir, 'don-header');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('💥 Erro inesperado no Dashboard DON:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados: ${e.message}</td></tr>`;
    }
}
