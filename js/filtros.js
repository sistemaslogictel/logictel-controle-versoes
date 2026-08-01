// =====================================================
// CARREGAR FILTROS
// =====================================================

async function carregarFiltros() {
    try {
        const { data: projetos } = await supabaseClient
            .from('projetos')
            .select('nome');
        
        const { data: gestores } = await supabaseClient
            .from('gestores_logictel')
            .select('nome');
        
        const projetosSet = new Set();
        const gestoresSet = new Set();
        const anos = new Set([2025, 2026, 2027]);
        
        if (projetos) {
            projetos.forEach(p => {
                if (p.nome) projetosSet.add(p.nome);
            });
        }
        if (gestores) {
            gestores.forEach(g => {
                if (g.nome) gestoresSet.add(g.nome);
            });
        }
        
        const filtrosConfig = [
            { id: 'filt-dash-gestor', values: gestoresSet },
            { id: 'filt-dash-projeto', values: projetosSet },
            { id: 'filt-dash-ano', values: anos },
            { id: 'filt-aprop-gestor', values: gestoresSet },
            { id: 'filt-aprop-projeto', values: projetosSet },
            { id: 'filt-aprop-ano', values: anos },
            { id: 'filt-don-gestor', values: gestoresSet },
            { id: 'filt-don-projeto', values: projetosSet },
            { id: 'filt-don-ano', values: anos },
            { id: 'filt-dcs-projeto', values: projetosSet },
            { id: 'filt-dcs-gestor', values: gestoresSet }
        ];
        
        filtrosConfig.forEach(({ id, values }) => {
            const select = document.getElementById(id);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Todos</option>';
                const sorted = Array.from(values).sort();
                sorted.forEach(v => { 
                    if (v) select.innerHTML += `<option value="${v}">${v}</option>`; 
                });
                if (currentValue) select.value = currentValue;
            }
        });
    } catch (e) {
        console.error('Erro ao carregar filtros:', e);
    }
}