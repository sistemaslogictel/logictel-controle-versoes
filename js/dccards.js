// dccards.js
import { supabaseClient } from './config.js';
import { mudarAba } from './navigation.js';
import { carregarConsumos, editarConsumo } from './consumo.js';
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
    const filtroProjeto = document.getElementById('filt-dcs-projeto')?.value || '';
    const filtroGestor = document.getElementById('filt-dcs-gestor')?.value || '';

    try {
        // Buscar consumos com joins para trazer mais informações
        let query = supabaseClient
            .from('consumo_dc')
            .select(`
                *,
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome),
                empresas(nome)
            `);

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

        // Buscar status DC
        const { data: statusList } = await supabaseClient
            .from('status_dc')
            .select('id, codigo, nome, motivo, responsavel, cor');

        const statusMap = {};
        if (statusList) {
            statusList.forEach(s => {
                statusMap[s.id] = s;
            });
        }

        // Agrupar por DC (pegar o mais recente de cada DC)
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
            const ultimaAtualizacao = c.ultima_atualizacao || c.criado_em;
            const dataAtualizacao = new Date(ultimaAtualizacao);
            const diffTime = Math.abs(hoje - dataAtualizacao);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Calcular Aging
            let agingClass = 'verde';
            let agingText = `${diffDays} dia(s)`;
            if (diffDays >= 4 && diffDays <= 6) { agingClass = 'amarelo'; }
            else if (diffDays > 6) { agingClass = 'vermelho'; }

            // Status DC
            const statusInfo = c.status_id ? statusMap[c.status_id] : null;
            const statusNome = statusInfo ? `${statusInfo.codigo} - ${statusInfo.nome}` : (c.status_dc || 'Sem status');
            const statusMotivo = statusInfo ? statusInfo.motivo : (c.motivo || '');
            const statusResponsavel = statusInfo ? statusInfo.responsavel : (c.responsavel || '');
            const statusCor = statusInfo ? statusInfo.cor : '#3498DB';

            const respClass = statusResponsavel === 'V.tal' ? 'vtal' : 'logictel';
            const statusClass = statusResponsavel === 'V.tal' ? 'vtal' : 'logictel';
            const borderColor = statusResponsavel === 'V.tal' ? '#FF6B35' : '#3498DB';

            // Tipo Medição
            const tipoMedicao = c.tipo_medicao || 'PA';
            const tipoClass = tipoMedicao === 'FI' ? 'final' : '';

            // Valor DC
            const valorDc = Number(c.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });

            // Nomes
            const projetoNome = c.projetos?.nome || c.projeto || 'N/A';

            // Determinar ícone do status baseado no responsável
            const statusIcon = statusResponsavel === 'V.tal' ? '⚠️' : '✅';

            container.innerHTML += `
                <div class="dc-card" onclick="irParaConsumoCompleto(${c.id})" style="border-left-color: ${borderColor};">
                    <!-- Linha 1: DC + Valor -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <div class="dc-number">DC ${c.dc}</div>
                        <div style="font-family:'IBM Plex Mono', monospace; font-size:18px; font-weight:700; color:var(--text);">R$ ${valorDc}</div>
                    </div>
                    
                    <!-- Linha 2: Status + Tipo -->
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                        <div class="dc-status ${statusClass}">${statusNome}</div>
                        <div class="dc-tipo-medicao ${tipoClass}">${tipoMedicao === 'FI' ? '🔴 FINAL' : '🟢 PARCIAL'}</div>
                    </div>
                    
                    <!-- Linha 3: Projeto -->
                    <div style="font-size:11px; color:var(--text-soft); margin-bottom:4px;">📋 ${projetoNome}</div>
                    
                    <!-- Linha 4: Motivo/Observação -->
                    <div class="dc-motivo" style="margin-bottom:6px;">${statusIcon} ${statusMotivo || 'Sem observação'}</div>
                    
                    <!-- Linha 5: Data + Aging (alinhados) -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; border-top:1px solid var(--border); padding-top:6px;">
                        <div class="dc-updated" style="margin:0;">📅 ${new Date(ultimaAtualizacao).toLocaleDateString('pt-BR')} ${new Date(ultimaAtualizacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div class="dc-aging ${agingClass}" style="margin:0;">🏠 Aging: ${agingText}</div>
                    </div>
                    
                    <!-- Metadados adicionais (opcionais) -->
                    ${c.pedido ? `<div style="font-size:10px;color:var(--text-soft);margin-top:4px;">👤 Pedido: ${c.pedido}</div>` : ''}
                    ${c.fr ? `<div style="font-size:10px;color:var(--text-soft);">📄 FR: ${c.fr}</div>` : ''}
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

// Função para abrir a edição completa do consumo
export async function irParaConsumoCompleto(id) {
    // Primeiro, mudar para a aba de cadastro de consumo
    mudarAba('cad-consumo');
    
    // Aguardar um pequeno delay para a aba carregar
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Chamar a função de edição com o ID do consumo
    await editarConsumo(id);
}
