// =====================================================
// CRUD GESTORES LOGICTEL
// =====================================================

async function carregarGestoresLogictel() {
    const tbody = document.getElementById('tabela-gestores');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';
    
    try {
        const { data: gestores, error: errorGestores } = await supabaseClient
            .from('gestores_logictel')
            .select('*')
            .order('id', { ascending: true });
        
        if (errorGestores) {
            console.error('Erro ao carregar gestores:', errorGestores);
            tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar: ${errorGestores.message}</td></tr>`;
            return;
        }
        
        if (!gestores || gestores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Nenhum gestor cadastrado.</td></tr>';
            return;
        }
        
        // Buscar projetos para mostrar o nome
        const { data: projetos, error: errorProjetos } = await supabaseClient
            .from('projetos')
            .select('id, nome');
        
        if (errorProjetos) {
            console.error('Erro ao carregar projetos:', errorProjetos);
        }
        
        const projetosMap = {};
        if (projetos) {
            projetos.forEach(p => {
                projetosMap[p.id] = p.nome;
            });
        }
        
        tbody.innerHTML = '';
        gestores.forEach(g => {
            const nomeProjeto = g.projeto_id ? (projetosMap[g.projeto_id] || '-') : '-';
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${g.id}</td>
                    <td>${g.nome}</td>
                    <td>${nomeProjeto}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarGestorLogictel(${g.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirGestorLogictel(${g.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// FORMULÁRIO DE GESTOR
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-gestor');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('gestor-edit-id').value;
            const nome = document.getElementById('gestor-nome').value.trim();
            const projetoId = document.getElementById('gestor-projeto').value;
            
            if (!nome) { 
                alert('Nome do Gestor é obrigatório!'); 
                return; 
            }
            if (!projetoId) { 
                alert('Selecione um Projeto!'); 
                return; 
            }
            
            const dados = { 
                nome: nome,
                projeto_id: parseInt(projetoId)
            };
            
            try {
                let result;
                if (editId) {
                    result = await supabaseClient
                        .from('gestores_logictel')
                        .update(dados)
                        .eq('id', parseInt(editId));
                } else {
                    result = await supabaseClient
                        .from('gestores_logictel')
                        .insert([dados]);
                }
                
                if (result.error) {
                    alert('Erro: ' + result.error.message);
                    return;
                }
                
                alert(editId ? 'Gestor atualizado com sucesso!' : 'Gestor salvo com sucesso!');
                e.target.reset();
                document.getElementById('gestor-edit-id').value = '';
                document.getElementById('gestor-cancel-btn').style.display = 'none';
                
                await carregarGestoresLogictel();
                await carregarSelectGestores('med-gestor', 'gestores_logictel');
                await carregarSelectGestores('dc-gestor', 'gestores_logictel');
                await carregarFiltros();
            } catch (e) {
                console.error('Erro:', e);
                alert('Erro ao salvar gestor.');
            }
        });
    }
});

// =====================================================
// FUNÇÕES AUXILIARES - GESTORES
// =====================================================

async function editarGestorLogictel(id) {
    try {
        const { data, error } = await supabaseClient
            .from('gestores_logictel')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Erro ao carregar dados do gestor: ' + error.message);
            return;
        }
        if (!data) {
            alert('Gestor não encontrado!');
            return;
        }
        
        document.getElementById('gestor-edit-id').value = id;
        document.getElementById('gestor-nome').value = data.nome;
        document.getElementById('gestor-projeto').value = data.projeto_id || '';
        document.getElementById('gestor-cancel-btn').style.display = 'inline-block';
        
        document.getElementById('form-gestor').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro:', e);
        alert('Erro ao carregar dados do gestor.');
    }
}

async function excluirGestorLogictel(id) {
    if (!confirm('Tem certeza que deseja excluir este gestor?')) return;
    try {
        const { error } = await supabaseClient.from('gestores_logictel').delete().eq('id', id);
        if (error) {
            alert('Erro: ' + error.message);
            return;
        }
        alert('Gestor excluído com sucesso!');
        await carregarGestoresLogictel();
        await carregarSelectGestores('med-gestor', 'gestores_logictel');
        await carregarSelectGestores('dc-gestor', 'gestores_logictel');
        await carregarFiltros();
    } catch (e) {
        console.error('Erro:', e);
        alert('Erro ao excluir gestor.');
    }
}