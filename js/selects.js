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
export async function carregarStatusDCCustom(targetId = 'dc-status-dc') {
    const select = document.getElementById(targetId);
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
// FILTRO DE STATUS NF (aba DC's)
// =====================================================
export async function carregarFiltroStatusNF() {
    const select = document.getElementById('filt-dcs-status-nf');
    if (!select) return;

    try {
        const { data, error } = await supabaseClient
            .from('status_nf')
            .select('id, nome')
            .order('nome');

        if (error) {
            console.error('Erro ao carregar Status NF:', error);
            return;
        }

        select.innerHTML = '<option value="">Todos</option>';
        if (data && data.length > 0) {
            data.forEach(s => {
                select.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
            });
        }
    } catch (e) {
        console.error('Erro ao carregar Status NF:', e);
    }
}

// =====================================================
// FILTROS DOS DASHBOARDS - DINÂMICOS BASEADOS NO BANCO
// =====================================================
export async function carregarFiltros() {
    const projetosSet = new Set();
    const gestoresSet = new Set();
    const diretoresSet = new Set();
    const anosSet = new Set();
    const mesesSet = new Set();

    // 1. Buscar dados DISTINTOS das medições
    const { data: medData } = await supabaseClient
        .from('medicoes')
        .select('projeto_id, gestor_logictel_id, diretor_id, ano, mes');

    if (medData) {
        medData.forEach(item => {
            if (item.projeto_id) projetosSet.add(item.projeto_id);
            if (item.gestor_logictel_id) gestoresSet.add(item.gestor_logictel_id);
            if (item.diretor_id) diretoresSet.add(item.diretor_id);
            if (item.ano) anosSet.add(item.ano);
            if (item.mes) mesesSet.add(item.mes);
        });
    }

    // 2. Buscar dados DISTINTOS dos consumos (para complementar)
    const { data: consData } = await supabaseClient
        .from('consumo_dc')
        .select('projeto_id, gestor_logictel_id, diretor_id, ano, mes_apropriacao');

    if (consData) {
        consData.forEach(item => {
            if (item.projeto_id) projetosSet.add(item.projeto_id);
            if (item.gestor_logictel_id) gestoresSet.add(item.gestor_logictel_id);
            if (item.diretor_id) diretoresSet.add(item.diretor_id);
            if (item.ano) anosSet.add(item.ano);
            if (item.mes_apropriacao) mesesSet.add(item.mes_apropriacao);
        });
    }

    // 3. Buscar nomes dos projetos
    const projetosMap = {};
    if (projetosSet.size > 0) {
        const { data: projetos } = await supabaseClient
            .from('projetos')
            .select('id, nome')
            .in('id', Array.from(projetosSet));
        if (projetos) {
            projetos.forEach(p => { projetosMap[p.id] = p.nome; });
        }
    }

    // 4. Buscar nomes dos gestores
    const gestoresMap = {};
    if (gestoresSet.size > 0) {
        const { data: gestores } = await supabaseClient
            .from('gestores_logictel')
            .select('id, nome')
            .in('id', Array.from(gestoresSet));
        if (gestores) {
            gestores.forEach(g => { gestoresMap[g.id] = g.nome; });
        }
    }

    // 5. Buscar nomes dos diretores
    const diretoresMap = {};
    if (diretoresSet.size > 0) {
        const { data: diretores } = await supabaseClient
            .from('diretores')
            .select('id, nome')
            .in('id', Array.from(diretoresSet));
        if (diretores) {
            diretores.forEach(d => { diretoresMap[d.id] = d.nome; });
        }
    }

    // 6. Converter IDs para nomes e ordenar
    const projetosNomes = Array.from(projetosSet).map(id => projetosMap[id]).filter(Boolean).sort();
    const gestoresNomes = Array.from(gestoresSet).map(id => gestoresMap[id]).filter(Boolean).sort();
    const diretoresNomes = Array.from(diretoresSet).map(id => diretoresMap[id]).filter(Boolean).sort();
    const anosOrdenados = Array.from(anosSet).sort();
    
    // Ordenar meses na ordem correta
    const mesesOrdenados = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesesFiltrados = Array.from(mesesSet).sort((a, b) => mesesOrdenados.indexOf(a) - mesesOrdenados.indexOf(b));

    // 7. Configuração dos filtros
    const filtrosConfig = [
        // Dashboard Status
        { id: 'filt-aprop-gestor', values: gestoresNomes },
        { id: 'filt-aprop-projeto', values: projetosNomes },
        { id: 'filt-aprop-ano', values: anosOrdenados },
        { id: 'filt-aprop-mes', values: mesesFiltrados },
        // Dashboard DON
        { id: 'filt-don-projeto', values: projetosNomes },
        { id: 'filt-don-diretor', values: diretoresNomes },
        { id: 'filt-don-ano', values: anosOrdenados },
        { id: 'filt-don-mes', values: mesesFiltrados },
        // DC Cards
        { id: 'filt-dcs-projeto', values: projetosNomes },
        { id: 'filt-dcs-gestor', values: gestoresNomes }
    ];

    filtrosConfig.forEach(({ id, values }) => {
        const select = document.getElementById(id);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Todos</option>';
            values.forEach(v => {
                if (v) select.innerHTML += `<option value="${v}">${v}</option>`;
            });
            if (currentValue && values.includes(currentValue)) {
                select.value = currentValue;
            }
        }
    });
}

// =====================================================
// EXPORTAÇÃO DE TODAS AS FUNÇÕES
// =====================================================
export {
    carregarSelectStatus,
    carregarSelectGestores,
    carregarSelectDiretores,
    carregarSelectEmpresas,
    carregarSelectContratos,
    carregarSelectProjetos,
    carregarStatusDCCustom,
    carregarFiltroStatus,
    carregarFiltroStatusNF,
    carregarFiltros
};
