import { supabaseClient } from './config.js';
import { mudarAba } from './navigation.js';
import { carregarConsumos } from './consumo.js';

export async function carregarDCCards() {
    const container = document.getElementById('dc-cards-container');
    if (!container) return;

    container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Carregando DC\'s...</div>';

    const filtroDC = document.getElementById('filt-dcs-dc')?.value?.toLowerCase() || '';
    const filtroStatus = document.getElementById('filt-dcs-status')?.value || '';
    const filtroProjeto = document.getElementById('filt-dcs-projeto')?.value || '';
    const filtroGestor = document.getElementById('filt-dcs-gestor')?.value || '';

    try {
        let query = supabaseClient.from('consumo_dc').select('*');
        if (filtroProjeto) query = query.eq('projeto', filtroProjeto);
        if (filtroGestor) query = query.eq('gestor_logictel', filtroGestor);

        const { data: consumos, error } = await query.order('criado_em', { ascending: false });

        if (error) {
            container.innerHTML = `<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar DC's: ${error.message}</div>`;
            return;
        }

        if (!consumos || consumos.length === 0) {
            container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Nenhuma DC cadastrada.</div>';
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
            return true;
        });

        if (filtrados.length === 0) {
            container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Nenhuma DC encontrada.</div>';
            return;
        }

        const hoje = new Date();
        container.innerHTML = '';

        filtrados.forEach(c => {
            const ultimaAtualizacao = c.ultima_atualizacao || c.criado_em;
            const dataAtualizacao = new Date(ultimaAtualizacao);
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

            const respClass = statusResponsavel === 'V.tal' ? 'vtal' : 'logictel';
            const statusClass = statusResponsavel === 'V.tal' ? 'vtal' : 'logictel';

            const tipoMedicao = c.tipo_medicao || 'PA';
            const tipoClass = tipoMedicao === 'FI' ? 'final' : '';
            const borderColor = statusResponsavel === 'V.tal' ? '#FF6B35' : '#3498DB';

            container.innerHTML += `
                <div class="dc-card" onclick="irParaConsumo('${c.dc}')" style="border-left-color: ${borderColor};">
                    <div class="dc-badge">#${c.id}</div>
                    <div class="dc-number">DC ${c.dc}</div>
                    <div class="dc-status ${statusClass}">${statusNome}</div>
                    <div class="dc-tipo-medicao ${tipoClass}">${tipoMedicao === 'FI' ? '🔴 FINAL' : '🟡 PARCIAL'}</div>
                    <div class="dc-motivo">📝 ${statusMotivo || 'Sem motivo'}</div>
                    <div class="dc-responsavel ${respClass}">👤 ${statusResponsavel || 'Não definido'}</div>
                    <div class="dc-aging ${agingClass}">⏱️ Aging: ${agingText}</div>
                    <div class="dc-updated">📅 ${new Date(ultimaAtualizacao).toLocaleDateString('pt-BR')} ${new Date(ultimaAtualizacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div style="font-size:11px;color:var(--text-soft);margin-top:4px;">${c.projeto || 'N/A'} • ${c.gestor_logictel || 'N/A'}</div>
                    ${c.pedido ? `<div style="font-size:11px;color:var(--text-soft);">Pedido: ${c.pedido}</div>` : ''}
                    ${c.fr ? `<div style="font-size:11px;color:var(--text-soft);">FR: ${c.fr}</div>` : ''}
                </div>
            `;
        });
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
