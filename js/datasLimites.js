// datasLimites.js
import { supabaseClient } from './config.js';

// =====================================================
// CRUD DATAS LIMITES
// =====================================================
let _todasDatasLimites = [];

export async function carregarDatasLimites() {
    const tbody = document.getElementById('tabela-datas-limites');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('datas_limites')
            .select('*')
            .order('ano', { ascending: false })
            .order('mes', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`;
            return;
        }

        _todasDatasLimites = data || [];

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Nenhuma data limite cadastrada.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(d => {
            const dataFr = new Date(d.data_fr).toLocaleDateString('pt-BR');
            const dataNf = new Date(d.data_nf).toLocaleDateString('pt-BR');
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${d.mes}</td>
                    <td>${d.ano}</td>
                    <td>${dataFr}</td>
                    <td>${dataNf}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarDataLimite(${d.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirDataLimite(${d.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormDataLimite() {
    const form = document.getElementById('form-datas-limites');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('datalimite-edit-id').value;
        
        const mes = document.getElementById('datalimite-mes').value;
        const ano = parseInt(document.getElementById('datalimite-ano').value);
        const dataFr = document.getElementById('datalimite-data-fr').value;
        const dataNf = document.getElementById('datalimite-data-nf').value;

        if (!mes || !ano || !dataFr || !dataNf) {
            alert('Todos os campos são obrigatórios!');
            return;
        }

        const dados = {
            mes,
            ano,
            data_fr: dataFr,
            data_nf: dataNf,
            atualizado_em: new Date().toISOString()
        };

        try {
            let result;
            if (editId) {
                result = await supabaseClient
                    .from('datas_limites')
                    .update(dados)
                    .eq('id', parseInt(editId));
            } else {
                // Verificar se já existe para este mês/ano
                const { data: existente } = await supabaseClient
                    .from('datas_limites')
                    .select('id')
                    .eq('mes', mes)
                    .eq('ano', ano)
                    .single();

                if (existente) {
                    alert(`Já existe um registro para ${mes}/${ano}. Use a edição para alterar.`);
                    return;
                }

                dados.criado_em = new Date().toISOString();
                result = await supabaseClient
                    .from('datas_limites')
                    .insert([dados]);
            }

            if (result.error) {
                alert('Erro: ' + result.error.message);
                return;
            }

            alert(editId ? 'Data limite atualizada!' : 'Data limite salva!');
            form.reset();
            document.getElementById('datalimite-edit-id').value = '';
            document.getElementById('datalimite-cancel-btn').style.display = 'none';
            
            carregarDatasLimites();
            atualizarTopbarDatasLimites();
        } catch (err) {
            console.error('Erro ao salvar data limite:', err);
            alert('Erro ao salvar data limite.');
        }
    });
}

export async function editarDataLimite(id) {
    try {
        const { data, error } = await supabaseClient
            .from('datas_limites')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) return;

        document.getElementById('datalimite-edit-id').value = id;
        document.getElementById('datalimite-mes').value = data.mes;
        document.getElementById('datalimite-ano').value = data.ano;
        document.getElementById('datalimite-data-fr').value = data.data_fr;
        document.getElementById('datalimite-data-nf').value = data.data_nf;
        document.getElementById('datalimite-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-datas-limites').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar data limite:', e);
        alert('Erro ao carregar dados da data limite.');
    }
}

export async function excluirDataLimite(id) {
    if (!confirm('Tem certeza que deseja excluir esta data limite?')) return;
    try {
        const { error } = await supabaseClient
            .from('datas_limites')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro: ' + error.message);
            return;
        }

        alert('Data limite excluída!');
        carregarDatasLimites();
        atualizarTopbarDatasLimites();
    } catch (e) {
        console.error('Erro ao excluir data limite:', e);
        alert('Erro ao excluir data limite.');
    }
}

// =====================================================
// ATUALIZAR TOPBAR COM DATAS LIMITES
// =====================================================
export async function atualizarTopbarDatasLimites() {
    const container = document.getElementById('datas-limites-topbar');
    if (!container) return;

    try {
        const hoje = new Date();
        const mesAtual = hoje.toLocaleDateString('pt-BR', { month: 'long' });
        const anoAtual = hoje.getFullYear();

        // Buscar data limite do mês atual
        let { data, error } = await supabaseClient
            .from('datas_limites')
            .select('*')
            .eq('mes', mesAtual)
            .eq('ano', anoAtual)
            .single();

        // Se não encontrar para o mês atual, buscar a mais próxima no futuro
        if (!data) {
            const { data: proxima } = await supabaseClient
                .from('datas_limites')
                .select('*')
                .gte('ano', anoAtual)
                .order('ano', { ascending: true })
                .order('mes', { ascending: true });

            if (proxima && proxima.length > 0) {
                data = proxima[0];
            }
        }

        if (!data) {
            container.innerHTML = `
                <div class="flex items-center gap-4 text-xs" style="color:var(--text-muted);">
                    <span>📅 Nenhuma data limite cadastrada</span>
                </div>
            `;
            return;
        }

        const dataFr = new Date(data.data_fr);
        const dataNf = new Date(data.data_nf);

        const frHtml = formatarDataLimite(dataFr, 'FR (12h)');
        const nfHtml = formatarDataLimite(dataNf, 'NF (23h)');

        container.innerHTML = `
            <div class="flex items-center gap-4 text-xs" style="color:var(--text-muted);">
                <span style="font-weight:600;color:var(--text);">📅 ${data.mes}/${data.ano}</span>
                ${frHtml}
                ${nfHtml}
            </div>
        `;

    } catch (e) {
        console.error('Erro ao carregar datas limites para topbar:', e);
    }
}

function formatarDataLimite(data, label) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataLimite = new Date(data);
    dataLimite.setHours(0, 0, 0, 0);
    
    const diffDias = Math.floor((dataLimite - hoje) / (1000 * 60 * 60 * 24));
    
    // Calcular dia da semana (0 = domingo)
    const diaSemana = dataLimite.getDay();
    const inicioSemana = new Date(dataLimite);
    inicioSemana.setDate(dataLimite.getDate() - diaSemana + 1); // Segunda-feira
    const diffInicioSemana = Math.floor((inicioSemana - hoje) / (1000 * 60 * 60 * 24));
    
    const dataStr = dataLimite.toLocaleDateString('pt-BR');
    
    // Passou da data limite
    if (diffDias < 0) {
        return `<span style="color:var(--text-soft);">${label}: ${dataStr} (passou)</span>`;
    }
    
    // No dia (diffDias === 0)
    if (diffDias === 0) {
        return `<span class="piscando" style="background:#000;color:#fff;font-weight:bold;padding:2px 8px;border-radius:4px;">${label}: ${dataStr}</span>`;
    }
    // Três dias antes (diffDias <= 3)
    else if (diffDias <= 3) {
        return `<span class="vermelho" style="background:#FF0000;color:#fff;font-weight:bold;padding:2px 8px;border-radius:4px;">${label}: ${dataStr}</span>`;
    }
    // Na semana da data (iniciando na segunda)
    else if (diffInicioSemana >= 0 && diffInicioSemana <= 6) {
        return `<span class="amarelo" style="background:#FFD700;color:#000;padding:2px 8px;border-radius:4px;">${label}: ${dataStr}</span>`;
    }
    
    return `<span style="color:var(--text-soft);">${label}: ${dataStr}</span>`;
}