import { supabaseClient } from './config.js';
import { valorParaNumero, aplicarMascaras } from './utils.js';
import { carregarFiltros } from './selects.js';

export async function carregarMedicoes() {
    const tbody = document.getElementById('tabela-medicoes');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('medicoes')
            .select(`
                id,
                empresa_id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes,
                ano,
                valor,
                valor_status,
                data_email_medicao,
                status_medicao,
                empresas(nome),
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome)
            `)
            .order('id', { ascending: false });

        if (error) {
            console.error('Erro ao carregar medições:', error);
            tbody.innerHTML = `<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar: ${error.message}</td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Nenhuma medição cadastrada.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(m => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${m.id}</td>
                    <td>${m.empresas?.nome || '-'}</td>
                    <td>${m.projetos?.nome || '-'}</td>
                    <td>${m.gestores_logictel?.nome || '-'}</td>
                    <td>${m.diretores?.nome || '-'}</td>
                    <td>${m.mes}</td>
                    <td>${m.ano}</td>
                    <td>${m.status_medicao || '-'}</td>
                    <td class="text-right mono">R$ ${Number(m.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                    <td class="text-right mono">R$ ${Number(m.valor_status || 0).toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarMedicao(${m.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirMedicao(${m.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormMedicao() {
    // Controle do checkbox "Manter valor para Status"
    document.getElementById('med-manter-status').addEventListener('change', function() {
        const valorDon = document.getElementById('med-valor').value;
        const valorStatus = document.getElementById('med-valor-status');
        if (this.checked) {
            valorStatus.value = valorDon;
            valorStatus.disabled = true;
            valorStatus.style.background = 'var(--paper)';
        } else {
            valorStatus.disabled = false;
            valorStatus.style.background = 'var(--surface)';
        }
    });

    // Quando o valor DON mudar, se o checkbox estiver marcado, atualiza o valor Status
    document.getElementById('med-valor').addEventListener('input', function() {
        const manter = document.getElementById('med-manter-status').checked;
        if (manter) {
            document.getElementById('med-valor-status').value = this.value;
        }
    });

    document.getElementById('form-medicao').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('med-edit-id').value;

        const empresaId = document.getElementById('med-empresa').value;
        const projetoId = document.getElementById('med-projeto').value;
        const gestorId = document.getElementById('med-gestor').value;
        const diretorId = document.getElementById('med-diretor').value || null;

        const valorDon = valorParaNumero(document.getElementById('med-valor').value);
        const valorStatus = valorParaNumero(document.getElementById('med-valor-status').value);
        const manterStatus = document.getElementById('med-manter-status').checked;

        const dados = {
            empresa_id: empresaId || null,
            projeto_id: projetoId || null,
            gestor_logictel_id: gestorId || null,
            diretor_id: diretorId || null,
            mes: document.getElementById('med-mes').value,
            ano: parseInt(document.getElementById('med-ano').value),
            valor: valorDon,
            valor_status: manterStatus ? valorDon : valorStatus,
            data_email_medicao: document.getElementById('med-data-email').value || null,
            status_medicao: document.getElementById('med-status').value
        };

        try {
            let result;
            if (editId) {
                result = await supabaseClient
                    .from('medicoes')
                    .update(dados)
                    .eq('id', parseInt(editId));
            } else {
                result = await supabaseClient
                    .from('medicoes')
                    .insert([dados]);
            }

            if (result.error) {
                alert('Erro: ' + result.error.message);
                console.error('Erro detalhado:', result.error);
                return;
            }

            alert(editId ? 'Medição atualizada!' : 'Medição salva!');
            e.target.reset();
            document.getElementById('med-edit-id').value = '';
            document.getElementById('med-cancel-btn').style.display = 'none';
            document.getElementById('med-valor-status').disabled = false;
            document.getElementById('med-valor-status').style.background = 'var(--surface)';
            document.getElementById('med-manter-status').checked = true;
            carregarMedicoes();
            carregarFiltros();
            aplicarMascaras();
        } catch (err) {
            console.error('Erro ao salvar medição:', err);
            alert('Erro ao salvar medição.');
        }
    });
}

export async function editarMedicao(id) {
    try {
        const { data, error } = await supabaseClient
            .from('medicoes')
            .select(`
                id,
                empresa_id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes,
                ano,
                valor,
                valor_status,
                data_email_medicao,
                status_medicao
            `)
            .eq('id', id)
            .single();

        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) return;

        document.getElementById('med-edit-id').value = id;
        document.getElementById('med-empresa').value = data.empresa_id || '';
        document.getElementById('med-projeto').value = data.projeto_id || '';
        document.getElementById('med-gestor').value = data.gestor_logictel_id || '';
        document.getElementById('med-diretor').value = data.diretor_id || '';
        document.getElementById('med-mes').value = data.mes;
        document.getElementById('med-ano').value = data.ano;
        document.getElementById('med-valor').value = Number(data.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
        document.getElementById('med-valor-status').value = Number(data.valor_status || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
        document.getElementById('med-data-email').value = data.data_email_medicao || '';
        document.getElementById('med-status').value = data.status_medicao || '';
        document.getElementById('med-cancel-btn').style.display = 'inline-block';
        
        // Se os valores são iguais, marca o checkbox e desabilita o campo
        if (data.valor === data.valor_status) {
            document.getElementById('med-manter-status').checked = true;
            document.getElementById('med-valor-status').disabled = true;
            document.getElementById('med-valor-status').style.background = 'var(--paper)';
        } else {
            document.getElementById('med-manter-status').checked = false;
            document.getElementById('med-valor-status').disabled = false;
            document.getElementById('med-valor-status').style.background = 'var(--surface)';
        }

        document.getElementById('form-medicao').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar medição:', e);
        alert('Erro ao carregar dados da medição.');
    }
}

export async function excluirMedicao(id) {
    if (!confirm('Tem certeza que deseja excluir esta medição?')) return;
    try {
        const { error } = await supabaseClient
            .from('medicoes')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro: ' + error.message);
            return;
        }

        alert('Medição excluída!');
        carregarMedicoes();
        carregarFiltros();
    } catch (e) {
        console.error('Erro ao excluir medição:', e);
        alert('Erro ao excluir medição.');
    }
}
