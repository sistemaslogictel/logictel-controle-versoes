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
                valor_don,
                valor_status,
                manter_valor_status,
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
            const valorDon = Number(m.valor_don || 0);
            const valorStatus = Number(m.valor_status || 0);
            
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${m.id}</td>
                    <td>${m.empresas?.nome || '-'}</td>
                    <td>${m.projetos?.nome || '-'}</td>
                    <td>${m.gestores_logictel?.nome || '-'}</td>
                    <td>${m.diretores?.nome || '-'}</td>
                    <td>${m.mes}</td>
                    <td>${m.ano}</td>
                    <td class="text-right mono">R$ ${valorDon.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                    <td class="text-right mono">R$ ${valorStatus.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                    <td>${m.status_medicao || '-'}</td>
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
    const form = document.getElementById('form-medicao');
    const checkboxManter = document.getElementById('med-manter-valor-status');
    const campoValorStatus = document.getElementById('med-valor-status');
    const campoValorDon = document.getElementById('med-valor-don');
    const containerValorStatus = document.getElementById('med-valor-status-container');
    
    // Função para controlar visibilidade do campo valor Status
    function controlarCampoValorStatus() {
        if (checkboxManter && checkboxManter.checked) {
            // Manter valor: esconde o campo valor Status
            if (containerValorStatus) {
                containerValorStatus.style.display = 'none';
            }
            if (campoValorStatus) {
                campoValorStatus.disabled = true;
                // Copiar valor DON para Status
                if (campoValorDon) {
                    campoValorStatus.value = campoValorDon.value;
                }
            }
        } else {
            // Mostrar campo valor Status
            if (containerValorStatus) {
                containerValorStatus.style.display = 'block';
            }
            if (campoValorStatus) {
                campoValorStatus.disabled = false;
            }
        }
    }
    
    // Evento para quando o checkbox mudar
    if (checkboxManter) {
        checkboxManter.addEventListener('change', controlarCampoValorStatus);
    }
    
    // Evento para quando o valor DON mudar (copiar para Status se manter marcado)
    if (campoValorDon) {
        campoValorDon.addEventListener('input', function() {
            if (checkboxManter && checkboxManter.checked && campoValorStatus) {
                campoValorStatus.value = this.value;
            }
        });
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('med-edit-id').value;

        const empresaId = document.getElementById('med-empresa').value;
        const projetoId = document.getElementById('med-projeto').value;
        const gestorId = document.getElementById('med-gestor').value;
        const diretorId = document.getElementById('med-diretor').value || null;
        
        // Validar campos obrigatórios
        if (!empresaId || !projetoId || !gestorId) {
            alert('Empresa, Projeto e Gestor são obrigatórios!');
            return;
        }
        
        const manterValorStatus = checkboxManter ? checkboxManter.checked : true;
        const valorDon = valorParaNumero(campoValorDon ? campoValorDon.value : '0');
        
        // Se manterValorStatus for true, valorStatus = valorDon
        let valorStatus = manterValorStatus ? valorDon : valorParaNumero(campoValorStatus ? campoValorStatus.value : '0');

        const dados = {
            empresa_id: parseInt(empresaId),
            projeto_id: parseInt(projetoId),
            gestor_logictel_id: parseInt(gestorId),
            diretor_id: diretorId ? parseInt(diretorId) : null,
            mes: document.getElementById('med-mes').value,
            ano: parseInt(document.getElementById('med-ano').value),
            valor_don: valorDon,
            valor_status: valorStatus,
            manter_valor_status: manterValorStatus,
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
            form.reset();
            document.getElementById('med-edit-id').value = '';
            document.getElementById('med-cancel-btn').style.display = 'none';
            
            // Reaplicar controle e máscaras
            controlarCampoValorStatus();
            carregarMedicoes();
            carregarFiltros();
            aplicarMascaras();
        } catch (err) {
            console.error('Erro ao salvar medição:', err);
            alert('Erro ao salvar medição.');
        }
    });
    
    // Inicializar controle
    controlarCampoValorStatus();
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
                valor_don,
                valor_status,
                manter_valor_status,
                data_email_medicao,
                status_medicao
            `)
            .eq('id', id)
            .single();

        if (error) {
            alert('Erro ao carregar: ' + error.message);
            console.error('Erro detalhado:', error);
            return;
        }
        if (!data) {
            alert('Medição não encontrada!');
            return;
        }

        // Preencher os campos do formulário
        document.getElementById('med-edit-id').value = id;
        document.getElementById('med-empresa').value = data.empresa_id || '';
        document.getElementById('med-projeto').value = data.projeto_id || '';
        document.getElementById('med-gestor').value = data.gestor_logictel_id || '';
        document.getElementById('med-diretor').value = data.diretor_id || '';
        document.getElementById('med-mes').value = data.mes || '';
        document.getElementById('med-ano').value = data.ano || '';
        document.getElementById('med-valor-don').value = Number(data.valor_don || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
        document.getElementById('med-valor-status').value = Number(data.valor_status || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
        document.getElementById('med-manter-valor-status').checked = data.manter_valor_status !== false;
        document.getElementById('med-data-email').value = data.data_email_medicao || '';
        document.getElementById('med-status').value = data.status_medicao || '';
        document.getElementById('med-cancel-btn').style.display = 'inline-block';

        // Atualizar visibilidade do campo valor Status baseado no checkbox
        const checkboxManter = document.getElementById('med-manter-valor-status');
        const campoValorStatus = document.getElementById('med-valor-status');
        const containerValorStatus = document.getElementById('med-valor-status-container');
        
        if (checkboxManter && checkboxManter.checked) {
            if (containerValorStatus) {
                containerValorStatus.style.display = 'none';
            }
            if (campoValorStatus) {
                campoValorStatus.disabled = true;
            }
        } else {
            if (containerValorStatus) {
                containerValorStatus.style.display = 'block';
            }
            if (campoValorStatus) {
                campoValorStatus.disabled = false;
            }
        }

        // Scroll para o formulário
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
