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
    _paginaAtualDC = 1;
    carregarDCCards();
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

    try {
        let query = supabaseClient.from('consumo_dc').select('*');
        if (filtroProjeto) query = query.eq('projeto', filtroProjeto);
        if (filtroGestor) query = query.eq('gestor_logictel', filtroGestor);

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
        const filtrados = dcs.filter(c => {
            if (filtroDC && !c.dc.toLowerCase().includes(filtroDC)) return false;
            if (filtroStatus && c.status_id && c.status_id.toString() !== filtroStatus) return false;
            if (filtroStatusNf && c.status_nf && c.status_nf.toString() !== filtroStatusNf) return false;
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

        const hoje = new Date();
        container.innerHTML = '';

        pagina.forEach(c => {
            // Data de solicitação para exibição e aging
            const dataSolicitacao = c.data_solicitacao_faturamento || c.criado_em;
            const dataAtualizacao = new Date(dataSolicitacao);
            const diffTime = Math.abs(hoje - dataAtualizacao);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let agingClass = 'verde';
            let agingText = `${diffDays} dia(s)`;
            if (diffDays >= 4 && diffDays <= 6) { agingClass = 'amarelo'; }
            else if (diffDays > 6) { agingClass = 'vermelho'; }

            const statusInfo = c.status_id ? statusMap[c.status_id] : null;
            const statusNome = statusInfo ? `${statusInfo.codigo} - ${statusInfo.nome}` : (c.status_dc || 'Sem status');
            const statusMotivo = statusInfo ? statusInfo.motivo : (c.motivo || '');
            const statusResponsavel = statusInfo ? statusInfo.responsavel : (c.responsavel || '');

            const statusClass = statusResponsavel === 'V.tal' ? 'vtal' : 'logictel';
            const borderColor = statusResponsavel === 'V.tal' ? '#FF6B35' : '#3498DB';

            const tipoMedicao = c.tipo_medicao || 'PA';
            const tipoClass = tipoMedicao === 'FI' ? 'final' : '';

            // Valor DC
            const valorDc = Number(c.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });

            // Projeto - usando o campo projeto (nome do projeto)
            const projetoNome = c.projeto || 'N/A';

            const statusIcon = statusResponsavel === 'V.tal' ? '⚠️' : '✅';

            // Formatar data de solicitação para exibição
            const dataExibicao = new Date(dataSolicitacao).toLocaleDateString('pt-BR');
            const horaExibicao = new Date(dataSolicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            container.innerHTML += `
                <div class="dc-card" onclick="abrirEdicaoConsumo(${c.id})" style="border-left-color: ${borderColor};">
                    <!-- Linha 1: DC + Valor alinhados horizontalmente com fonte menor -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <div class="dc-number" style="font-size:15px;">DC ${c.dc}</div>
                        <div style="font-family:'IBM Plex Mono', monospace; font-size:15px; font-weight:700; color:var(--text);">R$ ${valorDc}</div>
                    </div>
                    
                    <!-- Linha 2: Status + Tipo alinhados horizontalmente -->
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                        <div class="dc-status ${statusClass}" style="font-size:10px; padding:2px 8px;">${statusNome}</div>
                        <div class="dc-tipo-medicao ${tipoClass}" style="font-size:9px; padding:2px 8px;">${tipoMedicao === 'FI' ? '🔴 FINAL' : '🟢 PARCIAL'}</div>
                    </div>
                    
                    <!-- Linha 3: Projeto -->
                    <div style="font-size:11px; color:var(--text-soft); margin-bottom:4px;">📋 ${projetoNome}</div>
                    
                    <!-- Linha 4: Motivo/Observação -->
                    <div class="dc-motivo" style="font-size:10.5px; padding:4px 8px; margin-bottom:6px;">${statusIcon} ${statusMotivo || 'Sem observação'}</div>
                    
                    <!-- Linha 5: Data Solicitação + Aging alinhados horizontalmente -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; border-top:1px solid var(--border); padding-top:6px;">
                        <div class="dc-updated" style="margin:0; font-size:10.5px;">📅 ${dataExibicao} ${horaExibicao}</div>
                        <div class="dc-aging ${agingClass}" style="margin:0; font-size:10.5px;">🏠 Aging: ${agingText}</div>
                    </div>
                    
                    <!-- Metadados adicionais (opcionais) -->
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

// Função que mantém o comportamento original (apenas preenche o campo DC)
export function irParaConsumo(dc) {
    mudarAba('cad-consumo');
    document.getElementById('dc-numero').value = dc;
    carregarConsumos();
}

// Função para abrir a edição completa do consumo - usa funções já expostas no window
window.abrirEdicaoConsumo = function(id) {
    // Mudar para a aba de cadastro de consumo
    window.mudarAba('cad-consumo');
    // Aguardar um pequeno delay para a aba carregar
    setTimeout(function() {
        window.editarConsumo(id);
    }, 300);
};