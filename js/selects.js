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
    const { data } = await supabaseClient.from('empresas
