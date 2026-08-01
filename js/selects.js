// =====================================================
// CARREGAR SELECTS
// =====================================================

async function carregarSelectStatus(id, tabela) {
    const select = document.getElementById(id);
    if (!select) return;
    
    try {
        const { data } = await supabaseClient
            .from(tabela)
            .select('*')
            .order('nome');
        
        select.innerHTML = '<option value="">Selecione...</option>';
        if (data) {
            data.forEach(s => {
                select.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
            });
        }
    } catch (e) {
        console.error(`Erro ao carregar select ${id}:`, e);
    }
}

async function carregarSelectGestores(id, tabela) {
    const select = document.getElementById(id);
    if (!select) return;
    
    try {
        const { data } = await supabaseClient
            .from(tabela)
            .select('*')
            .order('nome');
        
        select.innerHTML = '<option value="">Selecione...</option>';
        if (data) {
            data.forEach(g => {
                select.innerHTML += `<option value="${g.id}">${g.nome}</option>`;
            });
        }
    } catch (e) {
        console.error(`Erro ao carregar select ${id}:`, e);
    }
}

async function carregarSelectDiretores(id) {
    const select = document.getElementById(id);
    if (!select) return;
    
    try {
        const { data } = await supabaseClient
            .from('diretores')
            .select('*, empresas(nome)')
            .order('nome');
        
        select.innerHTML = '<option value="">Selecione...</option>';
        if (data) {
            data.forEach(d => {
                select.innerHTML += `<option value="${d.id}">${d.nome}${d.empresas?.nome ? ` (${d.empresas.nome})` : ''}</option>`;
            });
        }
    } catch (e) {
        console.error(`Erro ao carregar select ${id}:`, e);
    }
}

async function carregarSelectEmpresas(id) {
    const select = document.getElementById(id);
    if (!select) return;
    
    try {
        const { data } = await supabaseClient
            .from('empresas')
            .select('*')
            .order('nome');
        
        select.innerHTML = '<option value="">Selecione...</option>';
        if (data) {
            data.forEach(e => {
                select.innerHTML += `<option value="${e.id}">${e.nome}</option>`;
            });
        }
    } catch (e) {
        console.error(`Erro ao carregar select ${id}:`, e);
    }
}

async function carregarSelectContratos(id, empresaId = null, diretorId = null) {
    const select = document.getElementById(id);
    if (!select) return;
    
    try {
        let query = supabaseClient
            .from('contratos')
            .select('*, empresas(nome), diretores(nome)')
            .order('numero');
        
        if (empresaId) query = query.eq('empresa_id', empresaId);
        if (diretorId) query = query.eq('diretor_id', diretorId);
        
        const { data } = await query;
        
        select.innerHTML = '<option value="">Selecione...</option>';
        if (data) {
            data.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.numero}${c.empresas?.nome ? ` (${c.empresas.nome})` : ''}</option>`;
            });
        }
    } catch (e) {
        console.error(`Erro ao carregar select ${id}:`, e);
    }
}

async function carregarSelectProjetos(id) {
    const select = document.getElementById(id);
    if (!select) return;
    
    try {
        const { data } = await supabaseClient
            .from('projetos')
            .select('id, nome')
            .order('nome');
        
        select.innerHTML = '<option value="">Selecione...</option>';
        if (data) {
            data.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
            });
        }
    } catch (e) {
        console.error(`Erro ao carregar select ${id}:`, e);
    }
}