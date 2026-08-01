// =====================================================
// CRUD PROJETOS
// =====================================================

async function carregarProjetos() {
    const tbody = document.getElementById('tabela-projetos');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('projetos')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) { 
            tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`; 
            return; 
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Nenhum projeto cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(p => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${p.id}</td>
                    <td>${p.nome}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarProjeto(${p.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirProjeto(${p.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// FORMULÁRIO DE PROJETO
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-projeto');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('projeto-edit-id').value;
            const nome = document.getElementById('projeto-nome').value.trim();
            
            if (!nome) { 
                alert('Nome do Projeto é obrigatório!'); 
                return; 
            }
            
            const dados = { nome: nome };
            
            try {
                let result;
                if (editId) { 
                    result = await supabaseClient
                        .from('projetos')
                        .update(dados)
                        .eq('id', parseInt(editId)); 
                } else { 
                    result = await supabaseClient
                        .from('projetos')
                        .insert([dados]); 
                }
                
                if (result.error) {
                    alert('Erro: ' + result.error.message);
                    return;
                }
                
                alert(editId ? 'Projeto atualizado!' : 'Projeto salvo!');
                e.target.reset();
                document.getElementById('projeto-edit-id').value = '';
                document.getElementById('projeto-cancel-btn').style.display = 'none';
                
                carregarProjetos();
                carregarSelectProjetos('gestor-projeto');
                carregarSelectProjetos('dc-projeto');
                carregarSelectProjetos('med-projeto');
                carregarFiltros();
            } catch (err) {
                console.error('Erro ao salvar projeto:', err);
                alert('Erro ao salvar projeto.');
            }
        });
    }
});

// =====================================================
// FUNÇÕES AUXILIARES - PROJETOS
// =====================================================

async function editarProjeto(id) {
    try {
        const { data, error } = await supabaseClient
            .from('projetos')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) return;
        
        document.getElementById('projeto-edit-id').value = id;
        document.getElementById('projeto-nome').value = data.nome;
        document.getElementById('projeto-cancel-btn').style.display = 'inline-block';
        
        document.getElementById('form-projeto').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar projeto:', e);
        alert('Erro ao carregar dados do projeto.');
    }
}

async function excluirProjeto(id) {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    try {
        const { error } = await supabaseClient
            .from('projetos')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('Erro: ' + error.message);
            return;
        }
        
        alert('Projeto excluído!');
        carregarProjetos();
        carregarSelectProjetos('gestor-projeto');
        carregarSelectProjetos('dc-projeto');
        carregarSelectProjetos('med-projeto');
        carregarFiltros();
    } catch (e) {
        console.error('Erro ao excluir projeto:', e);
        alert('Erro ao excluir projeto.');
    }
}