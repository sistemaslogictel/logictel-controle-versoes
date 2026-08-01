// =====================================================
// CRUD CONSUMOS
// =====================================================

async function carregarConsumos() {
    const tbody = document.getElementById('tabela-consumos');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="12" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id,
                dc,
                empresa_id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes_apropriacao,
                ano,
                valor,
                mes_medido,
                data_solicitacao_faturamento,
                status_dc,
                status_nf,
                num_nf,
                data_emissao_nf,
                centro_custo,
                item,
                folha_registro,
                po,
                ultima_atualizacao,
                empresas(nome),
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome)
            `)
            .order('id', { ascending: false });
        
        if (error) { 
            tbody.innerHTML = `<tr><td colspan="12" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`; 
            return; 
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" class="p-6 text-center" style="color:var(--text-soft)">Nenhum consumo cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(c => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${c.id}</td>
                    <td>${c.dc}</td>
                    <td>${c.projetos?.nome || '-'}</td>
                    <td>${c.gestores_logictel?.nome || '-'}</td>
                    <td>${c.diretores?.nome || '-'}</td>
                    <td>${c.mes_apropriacao}</td>
                    <td>${c.ano}</td>
                    <td>${c.mes_medido}</td>
                    <td>${c.status_dc || '-'}</td>
                    <td>${c.status_nf || '-'}</td>
                    <td class="text-right mono">R$ ${Number(c.valor).toLocaleString('pt-BR', {minFractionDigits: 2})}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarConsumo(${c.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirConsumo(${c.id})" class="btn-danger">Excluir</button>
                            ${(c.status_nf === 'Emissão Solicitada' || c.status_nf === 'Nota emitida') ? `<button onclick="exportarExcel(${c.id})" class="btn-excel">📊 Excel</button>` : ''}
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="12" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// FORMULÁRIO DE CONSUMO
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-consumo');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('consumo-edit-id').value;
            const agora = new Date().toISOString();
            
            const empresaId = document.getElementById('dc-empresa').value;
            const projetoId = document.getElementById('dc-projeto').value;
            const gestorId = document.getElementById('dc-gestor').value;
            const diretorId = document.getElementById('dc-diretor').value || null;
            
            // Validar campos obrigatórios
            if (!empresaId || !projetoId || !gestorId) {
                alert('Empresa, Projeto e Gestor são obrigatórios!');
                return;
            }
            
            const dados = {
                dc: document.getElementById('dc-numero').value.trim(),
                empresa_id: parseInt(empresaId),
                projeto_id: parseInt(projetoId),
                gestor_logictel_id: parseInt(gestorId),
                diretor_id: diretorId ? parseInt(diretorId) : null,
                mes_apropriacao: document.getElementById('dc-mes-apropriacao').value,
                ano: parseInt(document.getElementById('dc-ano').value),
                valor: valorParaNumero(document.getElementById('dc-valor').value),
                mes_medido: document.getElementById('dc-mes-medido').value,
                data_solicitacao_faturamento: document.getElementById('dc-data-solicitacao').value,
                status_dc: document.getElementById('dc-status-dc').value,
                status_nf: document.getElementById('dc-status-nf').value,
                num_nf: document.getElementById('dc-num-nf').value || null,
                data_emissao_nf: document.getElementById('dc-data-nf').value || null,
                centro_custo: document.getElementById('dc-centro-custo').value || null,
                item: document.getElementById('dc-item').value || null,
                folha_registro: document.getElementById('dc-folha-registro').value || null,
                po: document.getElementById('dc-po').value || null,
                ultima_atualizacao: agora
            };
            
            // Validar DC obrigatório
            if (!dados.dc) {
                alert('Número da DC é obrigatório!');
                return;
            }
            
            try {
                let result;
                if (editId) {
                    result = await supabaseClient
                        .from('consumo_dc')
                        .update(dados)
                        .eq('id', parseInt(editId));
                } else {
                    result = await supabaseClient
                        .from('consumo_dc')
                        .insert([dados]);
                }
                
                if (result.error) {
                    alert('Erro: ' + result.error.message);
                    return;
                }
                
                alert(editId ? 'Consumo atualizado!' : 'Consumo salvo!');
                e.target.reset();
                document.getElementById('consumo-edit-id').value = '';
                document.getElementById('consumo-cancel-btn').style.display = 'none';
                document.getElementById('campos-extras-consumo').classList.remove('visible');
                controlarCamposNF();
                carregarConsumos();
                carregarFiltros();
                carregarDCCards();
                aplicarMascaras();
            } catch (err) {
                console.error('Erro ao salvar consumo:', err);
                alert('Erro ao salvar consumo. Tente novamente.');
            }
        });
    }
});

// =====================================================
// FUNÇÕES AUXILIARES - CONSUMO
// =====================================================

function controlarCamposNF() {
    const status = document.getElementById('dc-status-nf')?.value;
    const numNf = document.getElementById('dc-num-nf');
    const dataNf = document.getElementById('dc-data-nf');
    const extras = document.getElementById('campos-extras-consumo');
    
    const isEmitida = status === 'Nota emitida' || status === 'Emissão Solicitada';
    
    if (numNf && dataNf && extras) {
        if (isEmitida) {
            numNf.disabled = false;
            numNf.required = true;
            dataNf.disabled = false;
            dataNf.required = true;
            extras.classList.add('visible');
        } else {
            numNf.disabled = true;
            numNf.required = false;
            numNf.value = '';
            dataNf.disabled = true;
            dataNf.required = false;
            dataNf.value = '';
            extras.classList.remove('visible');
        }
    }
}

async function editarConsumo(id) {
    try {
        const { data, error } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id,
                dc,
                empresa_id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes_apropriacao,
                ano,
                valor,
                mes_medido,
                data_solicitacao_faturamento,
                status_dc,
                status_nf,
                num_nf,
                data_emissao_nf,
                centro_custo,
                item,
                folha_registro,
                po
            `)
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) return;
        
        document.getElementById('consumo-edit-id').value = id;
        document.getElementById('dc-numero').value = data.dc || '';
        document.getElementById('dc-empresa').value = data.empresa_id || '';
        document.getElementById('dc-projeto').value = data.projeto_id || '';
        document.getElementById('dc-gestor').value = data.gestor_logictel_id || '';
        document.getElementById('dc-diretor').value = data.diretor_id || '';
        document.getElementById('dc-mes-apropriacao').value = data.mes_apropriacao || '';
        document.getElementById('dc-ano').value = data.ano || '';
        document.getElementById('dc-valor').value = Number(data.valor || 0).toLocaleString('pt-BR', {minFractionDigits: 2});
        document.getElementById('dc-mes-medido').value = data.mes_medido || '';
        document.getElementById('dc-data-solicitacao').value = data.data_solicitacao_faturamento || '';
        document.getElementById('dc-status-dc').value = data.status_dc || '';
        document.getElementById('dc-status-nf').value = data.status_nf || '';
        document.getElementById('dc-num-nf').value = data.num_nf || '';
        document.getElementById('dc-data-nf').value = data.data_emissao_nf || '';
        document.getElementById('dc-centro-custo').value = data.centro_custo || '';
        document.getElementById('dc-item').value = data.item || '';
        document.getElementById('dc-folha-registro').value = data.folha_registro || '';
        document.getElementById('dc-po').value = data.po || '';
        
        controlarCamposNF();
        document.getElementById('consumo-cancel-btn').style.display = 'inline-block';
        
        document.getElementById('form-consumo').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar consumo:', e);
        alert('Erro ao carregar dados do consumo.');
    }
}

async function excluirConsumo(id) {
    if (!confirm('Tem certeza que deseja excluir este consumo?')) return;
    try {
        const { error } = await supabaseClient.from('consumo_dc').delete().eq('id', id);
        if (error) {
            alert('Erro: ' + error.message);
            return;
        }
        alert('Consumo excluído!');
        carregarConsumos();
        carregarFiltros();
        carregarDCCards();
    } catch (e) {
        console.error('Erro ao excluir consumo:', e);
        alert('Erro ao excluir consumo.');
    }
}