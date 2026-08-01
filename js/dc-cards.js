// =====================================================
// DC CARDS - VISÃO EM CARDS
// =====================================================

async function carregarDCCards() {
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
        
        const { data: consumos, error } = await executarConsulta(
            query.order('criado_em', { ascending: false })
        );

        if (error) {
            container.innerHTML = `<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar DC's: ${error.message}</div>`;
            return;
        }

        if (!consumos || consumos.length === 0) {
            container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Nenhuma DC cadastrada.</div>';
            return;
        }

        // Agrupar por DC (pegar a mais recente de cada)
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
            if (filtroStatus && c.status_dc !== filtroStatus) return false;
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

            const statusClass = c.status_dc === 'Ativo' || c.status_dc === 'Aprovado' ? 'verde' : 
                               c.status_dc === 'Pendente' || c.status_dc === 'Em análise' ? 'amarelo' : 'vermelho';

            container.innerHTML += `
                <div class="dc-card" onclick="irParaConsumo('${c.dc}')">
                    <div class="dc-badge">#${c.id}</div>
                    <div class="dc-number">DC ${c.dc}</div>
                    <div class="dc-status ${statusClass}">${c.status_dc || 'Sem status'}</div>
                    <div class="dc-aging ${agingClass}">⏱️ Aging: ${agingText}</div>
                    <div class="dc-updated">📅 ${new Date(ultimaAtualizacao).toLocaleDateString('pt-BR')} ${new Date(ultimaAtualizacao).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</div>
                    <div style="font-size:11px;color:var(--text-soft);margin-top:4px;">${c.projeto || 'N/A'} • ${c.gestor_logictel || 'N/A'}</div>
                </div>
            `;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar DC\'s.</div>';
    }
}

function irParaConsumo(dc) {
    mudarAba('cad-consumo');
    const input = document.getElementById('dc-numero');
    if (input) input.value = dc;
    carregarConsumos();
}