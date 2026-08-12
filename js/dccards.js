// dccards.js
import { supabaseClient } from './config.js';
import { mudarAba } from './navigation.js';
import { carregarConsumos } from './consumo.js';
import { paginar, renderizarPaginacao } from './utils.js';

const ITENS_POR_PAGINA_DC = 12;
let _paginaAtualDC = 1;

export function irParaPaginaDC(pagina) {
    _paginaAtualDC = pagina;
    carregarDCCards();
}

// Chamado pelos filtros da tela (reseta para a página 1 a cada nova busca).
export function filtrarDCCards() {
    _paginaAtualDC = 1;
    carregarDCCards();
}

// Limpar todos os filtros da aba DC's
export function limparFiltrosDCCards() {
    document.getElementById('filt-dcs-dc').value = '';
    document.getElementById('filt-dcs-status').value = '';
    document.getElementById('filt-dcs-status-nf').value = '';
    document.getElementById('filt-dcs-projeto').value = '';
    document.getElementById('filt-dcs-gestor').value = '';
    document.getElementById('filt-dcs-data-inicio').value = '';
    document.getElementById('filt-dcs-data-fim').value = '';
    _paginaAtualDC = 1;
    carregarDCCards();
}

// Função para formatar data no formato dd/mm/aaaa a partir de uma string YYYY-MM-DD
function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string') {
            let dataPart = dataStr;
            if (dataStr.includes('T')) {
                dataPart = dataStr.split('T')[0];
            }
            const partes = dataPart.split('-');
            if (partes.length === 3) {
                return `${partes[2]}/${partes[1]}/${partes[0]}`;
            }
        }
        return '-';
    } catch {
        return '-';
    }
}

// Função para calcular Aging a partir da data de solicitação
function calcularAging(dataSolicitacaoStr) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (!dataSolicitacaoStr) {
        return { dias: 0, class: 'verde', texto: '0 dia(s)' };
    }
    
    try {
        let dataSolicitacao;
        if (typeof dataSolicitacaoStr === 'string') {
            let dataPart = dataSolicitacaoStr;
            if (dataSolicitacaoStr.includes('T')) {
                dataPart = dataSolicitacaoStr.split('T')[0];
            }
            const partes = dataPart.split('-');
            if (partes.length === 3) {
                dataSolicitacao = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
            } else {
                dataSolicitacao = new Date(dataSolicitacaoStr);
            }
        } else {
            dataSolicitacao = new Date(dataSolicitacaoStr);
        }
        
        if (isNaN(dataSolicitacao.getTime())) {
            return { dias: 0, class: 'verde', texto: '0 dia(s)' };
        }
        
        dataSolicitacao.setHours(0, 0, 0, 0);
        const diffTime = hoje - dataSolicitacao;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let agingClass = 'verde';
        if (diffDays >= 4 && diffDays <= 6) { agingClass = 'amarelo'; }
        else if (diffDays > 6) { agingClass = 'vermelho'; }
        
        return { 
            dias: diffDays, 
            class: agingClass, 
            texto: `${diffDays} dia(s)` 
        };
    } catch {
        return { dias: 0, class: 'verde', texto: '0 dia(s)' };
    }
}

export async function carregarDCCards() {
    const container = document.getElementById('dc-cards-container');
    if (!container) return;

    container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Carregando DC\'s...</div>';

    const filtroDC = document.getElementById('filt-dcs-dc')?.value?.toLowerCase() || '';
    const filtroStatus = document.getElementById('filt-dcs-status')?.value || '';
    const filtroStatusNf = document.getElementById('filt-dcs-status-nf')?.value || '';
    const filtroProjeto = document.getElementById('filt-dcs-projeto')?.value || '';
    const filtroGestor = document.getElementById('filt-dcs-gestor')?.value || '';
    const filtroDataInicio = document.getElementById('filt-dcs-data-inicio')?.value || '';
    const filtroDataFim = document.getElementById('filt-dcs-data-fim')?.value || '';

    try {
        let query = supabaseClient
            .from('consumo_dc')
            .select(`
                *,
                projetos (nome)
            `);

        const { data: consumos, error } = await query.order('criado_em', { ascending: false });

        const paginacaoEl = document.getElementById('dc-cards-pagination');

        if (error) {
            container.innerHTML = `<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar DC's: ${error.message}</div>`;
            if (paginacaoEl) paginacaoEl.innerHTML = '';
            return;
        }

        if (!consumos || consumos.length === 0) {
            container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Nenhuma DC cadastrada.</div>';
            if (paginacaoEl) paginacaoEl.innerHTML = '';
            return;
        }

        const { data: statusList } = await supabaseClient
            .from('status_dc')
            .select('id, codigo, nome, motivo, responsavel, cor');

        const statusMap = {};
        if (statusList) {
            statusList.forEach(s => {
                statusMap[s.id] = s;
            });
        }

        const dcMap = new Map();
        consumos.forEach(c => {
            const dcNum = c.dc;
            if (!dcMap.has(dcNum) || new Date(c.criado_em) > new Date(dcMap.get(dcNum).criado_em)) {
                dcMap.set(dcNum, c);
            }
        });

        const dcs = Array.from(dcMap.values());

        // Aplicar filtros em memória
        const filtrados = dcs.filter(c => {
            if (filtroDC && !c.dc.toLowerCase().includes(filtroDC)) return false;
            if (filtroStatus && c.status_id && c.status_id.toString() !== filtroStatus) return false;
            if (filtroStatusNf && c.status_nf && c.status_nf.toString() !== filtroStatusNf) return false;
            if (filtroProjeto) {
                const nomeProjeto = c.projetos?.nome || '';
                if (!nomeProjeto.toLowerCase().includes(filtroProjeto.toLowerCase())) return false;
            }
            if (filtroGestor && c.gestor_logictel !== filtroGestor) return false;
            
            // Filtro de data - usar data_solicitacao_faturamento
            if (filtroDataInicio || filtroDataFim) {
                const dataRef = c.data_solicitacao_faturamento || c.criado_em;
                if (!dataRef) return false;
                
                const dataObj = new Date(dataRef);
                if (isNaN(dataObj.getTime())) return false;
                
                const dataStr = dataObj.toISOString().split('T')[0];
                
                if (filtroDataInicio && dataStr < filtroDataInicio) return false;
                if (filtroDataFim && dataStr > filtroDataFim) return false;
            }
            
            return true;
        });

        if (filtrados.length === 0) {
            container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Nenhuma DC encontrada.</div>';
            if (paginacaoEl) paginacaoEl.innerHTML = '';
            return;
        }

        const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITENS_POR_PAGINA_DC));
        if (_paginaAtualDC > totalPaginas) _paginaAtualDC = totalPaginas;
        const pagina = paginar(filtrados, _paginaAtualDC, ITENS_POR_PAGINA_DC);

        container.innerHTML = '';

        pagina.forEach(c => {
            const statusInfo = c.status_id ? statusMap[c.status_id] : null;
            const statusNome = statusInfo ? `${statusInfo.codigo} - ${statusInfo.nome}` : (c.status_dc || 'Sem status');
            const statusMotivo = statusInfo ? statusInfo.motivo : (c.motivo || '');
            const statusResponsavel = statusInfo ? statusInfo.responsavel : (c.responsavel || '');

            const statusClass = statusResponsavel === 'V.tal' ? 'vtal' : 'logictel';
            const borderColor = statusResponsavel === 'V.tal' ? '#FF6B35' : '#3498DB';

            const valorDc = Number(c.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
            const projetoNome = c.projetos?.nome || 'N/A';

            const dataSolicitacao = c.data_solicitacao_faturamento || c.criado_em;
            const aging = calcularAging(dataSolicitacao);
            const dataExibicao = formatarDataBr(dataSolicitacao);

            const statusIcon = statusResponsavel === 'V.tal' ? '⚠️' : '✅';

            container.innerHTML += `
                <div class="dc-card" onclick="abrirEdicaoConsumo(${c.id})" style="border-left-color: ${borderColor};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <div class="dc-number" style="font-size:15px;">DC ${c.dc}</div>
                        <div style="font-family:'IBM Plex Mono', monospace; font-size:15px; font-weight:700; color:var(--text);">R$ ${valorDc}</div>
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                        <div class="dc-status ${statusClass}" style="font-size:10px; padding:2px 8px;">${statusNome}</div>
                    </div>
                    
                    <div style="font-size:11px; color:var(--text-soft); margin-bottom:4px;">📋 ${projetoNome}</div>
                    
                    <div class="dc-motivo" style="font-size:10.5px; padding:4px 8px; margin-bottom:6px;">${statusIcon} ${statusMotivo || 'Sem observação'}</div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; border-top:1px solid var(--border); padding-top:6px;">
                        <div class="dc-updated" style="margin:0; font-size:10.5px;">📅 ${dataExibicao}</div>
                        <div class="dc-aging ${aging.class}" style="margin:0; font-size:10.5px;">🏠 Aging: ${aging.texto}</div>
                    </div>
                    
                    ${c.pedido ? `<div style="font-size:10px;color:var(--text-soft);margin-top:4px;">👤 Pedido: ${c.pedido}</div>` : ''}
                    ${c.fr ? `<div style="font-size:10px;color:var(--text-soft);margin-top:2px;">📄 FR: ${c.fr}</div>` : ''}
                </div>
            `;
        });

        if (paginacaoEl) {
            paginacaoEl.innerHTML = renderizarPaginacao(_paginaAtualDC, filtrados.length, ITENS_POR_PAGINA_DC, 'irParaPaginaDC');
        }
    } catch (e) {
        console.error('Erro inesperado:', e);
        container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar DC\'s.</div>';
    }
}

export function irParaConsumo(dc) {
    mudarAba('cad-consumo');
    document.getElementById('dc-numero').value = dc;
    carregarConsumos();
}

window.abrirEdicaoConsumo = function(id) {
    window.mudarAba('cad-consumo');
    setTimeout(function() {
        window.editarConsumo(id);
    }, 300);
};