import { supabaseClient } from './config.js';

// =====================================================
// CARREGAR SELECTS
// =====================================================
export async function carregarSelectStatus(id, tabela) {
    const select = document.getElementById(id);
    if (!select) return;

    try {
        if (tabela === 'status_dc') {
            const { data } = await supabaseClient
                .from('status_dc')
                .select('id, codigo, nome')
                .order('codigo');

            select.innerHTML = '<option value="">Selecione...</option>';
            if (data) {
                data.forEach(s => {
                    select.innerHTML += `<option value="${s.id}">${s.codigo} - ${s.nome}</option>`;
                });
            }
            return;
        }

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
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

export async function carregarSelectGestores(id, tabela) {
    const select = document.getElementById(id);
    if (!select) return;
    const { data } = await supabaseClient.from(tabela).select('*').order('nome');
    select.innerHTML = '<option value="">Selecione...</option>';
    if (data) data.forEach(g => {
        select.innerHTML += `<option value="${g.id}">${g.nome}</option>`;
    });
}

export async function carregarSelectDiretores(id) {
    const select = document.getElementById(id);
    if (!select) return;
    const { data } = await supabaseClient.from('diretores').select('*, empresas(nome)').order('nome');
    select.innerHTML = '<option value="">Selecione...</option>';
    if (data) data.forEach(d => {
        select.innerHTML += `<option value="${d.id}">${d.nome}${d.empresas?.nome ? ` (${d.empresas.nome})` : ''}</option>`;
    });
}

export async function carregarSelectEmpresas(id) {
    const select = document.getElementById(id);
    if (!select) return;
    const { data } = await supabaseClient.from('empresas').select('*').order('nome');
    select.innerHTML = '<option value="">Selecione...</option>';
    if (data) data.forEach(e => {
        select.innerHTML += `<option value="${e.id}">${e.nome}</option>`;
    });
}

export async function carregarSelectContratos(id, empresaId = null, diretorId = null) {
    const select = document.getElementById(id);
    if (!select) return;
    let query = supabaseClient.from('contratos').select('*, empresas(nome), diretores(nome)').order('numero');
    if (empresaId) query = query.eq('empresa_id', empresaId);
    if (diretorId) query = query.eq('diretor_id', diretorId);
    const { data } = await query;
    select.innerHTML = '<option value="">Selecione...</option>';
    if (data) data.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.numero}${c.empresas?.nome ? ` (${c.empresas.nome})` : ''}</option>`;
    });
}

export async function carregarSelectProjetos(id) {
    const select = document.getElementById(id);
    if (!select) return;
    const { data } = await supabaseClient.from('projetos').select('id, nome').order('nome');
    select.innerHTML = '<option value="">Selecione...</option>';
    if (data) data.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
    });
}

// =====================================================
// STATUS DC CUSTOM
// =====================================================
export async function carregarStatusDCCustom() {
    const select = document.getElementById('dc-status-dc');
    if (!select) return;

    try {
        const { data, error } = await supabaseClient
            .from('status_dc')
            .select('id, codigo, nome, motivo, responsavel, cor')
            .order('codigo');

        if (error) {
            console.error('Erro ao carregar status DC:', error);
            select.innerHTML = '<option value="">Erro ao carregar status</option>';
            return;
        }

        select.innerHTML = '<option value="">Selecione um status...</option>';
        if (data && data.length > 0) {
            data.forEach(s => {
                const label = `${s.codigo} - ${s.nome}`;
                select.innerHTML += `<option value="${s.id}" data-motivo="${s.motivo || ''}" data-responsavel="${s.responsavel || ''}" data-cor="${s.cor || '#3498DB'}">${label}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Nenhum status cadastrado</option>';
        }
    } catch (e) {
        console.error('Erro ao carregar status DC custom:', e);
        select.innerHTML = '<option value="">Erro ao carregar status</option>';
    }
}

// =====================================================
// FILTRO DE STATUS (aba DC's)
// =====================================================
export async function carregarFiltroStatus() {
    const select = document.getElementById('filt-dcs-status');
    if (!select) return;

    try {
        const { data, error } = await supabaseClient
            .from('status_dc')
            .select('id, codigo, nome')
            .order('codigo');

        if (error) {
            console.error('Erro ao carregar filtro de status:', error);
            return;
        }

        select.innerHTML = '<option value="">Todos os Status</option>';
        if (data && data.length > 0) {
            data.forEach(s => {
                select.innerHTML += `<option value="${s.id}">${s.codigo} - ${s.nome}</option>`;
            });
        }
    } catch (e) {
        console.error('Erro ao carregar filtro de status:', e);
    }
}

// =====================================================
// FILTROS DOS DASHBOARDS
// =====================================================
export async function carregarFiltros() {
    // Filtros da Dashboard Status (com Gestor)
    const { data: projetos } = await supabaseClient.from('projetos').select('nome').order('nome');
    const { data: gestores } = await supabaseClient.from('gestores_logictel').select('nome').order('nome');
    
    // Filtros da Dashboard DON (com Diretor)
    const { data: diretores } = await supabaseClient.from('diretores').select('nome').order('nome');

    const projetosSet = new Set();
    const gestoresSet = new Set();
    const diretoresSet = new Set();
    const anosSet = new Set();
    const mesesSet = new Set();

    // Buscar anos e meses disponíveis nas medições
    const { data: anosMeses } = await supabaseClient
        .from('medicoes')
        .select('ano, mes')
        .order('ano', { ascending: true });

    if (anosMeses) {
        anosMeses.forEach(item => {
            if (item.ano) anosSet.add(item.ano);
            if (item.mes) mesesSet.add(item.mes);
        });
    }

    // Também buscar anos e meses dos consumos
    const { data: anosMesesConsumo } = await supabaseClient
        .from('consumo_dc')
        .select('ano, mes_apropriacao')
        .order('ano', { ascending: true });

    if (anosMesesConsumo) {
        anosMesesConsumo.forEach(item => {
            if (item.ano) anosSet.add(item.ano);
            if (item.mes_apropriacao) mesesSet.add(item.mes_apropriacao);
        });
    }

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
    if (diretores) {
        diretores.forEach(d => {
            if (d.nome) diretoresSet.add(d.nome);
        });
    }

    // Ordenar meses na ordem correta
    const mesesOrdenados = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesesFiltrados = Array.from(mesesSet).sort((a, b) => mesesOrdenados.indexOf(a) - mesesOrdenados.indexOf(b));

    // Configuração dos filtros
    const filtrosConfig = [
        // Dashboard Status
        { id: 'filt-aprop-gestor', values: gestoresSet },
        { id: 'filt-aprop-projeto', values: projetosSet },
        { id: 'filt-aprop-ano', values: anosSet },
        { id: 'filt-aprop-mes', values: mesesFiltrados },
        // Dashboard DON
        { id: 'filt-don-projeto', values: projetosSet },
        { id: 'filt-don-diretor', values: diretoresSet },
        { id: 'filt-don-ano', values: anosSet },
        { id: 'filt-don-mes', values: mesesFiltrados },
        // DC Cards
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
}
