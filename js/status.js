// =====================================================
// CRUD STATUS DC
// =====================================================

async function carregarStatusDC() {
    const tbody = document.getElementById('tabela-statusdc');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('status_dc')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) { 
            tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`; 
            return; 
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Nenhum status DC cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(s => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${s.id}</td>
                    <td>${s.nome}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarStatusDC(${s.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirStatusDC(${s.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-status-dc');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('statusdc-edit-id').value;
            const dados = { nome: document.getElementById('statusdc-nome').value.trim() };
            
            if (!dados.nome) {
                alert('Nome do status é obrigatório!');
                return;
            }
            
            try {
                let result;
                if (editId) {
                    result = await supabaseClient
                        .from('status_dc')
                        .update(dados)
                        .eq('id', parseInt(editId));
                } else {
                    result = await supabaseClient
                        .from('status_dc')
                        .insert([dados]);
                }
                
                if (result.error) {
                    alert('Erro: ' + result.error.message);
                    return;
                }
                
                alert(editId ? 'Status DC atualizado!' : 'Status DC salvo!');
                e.target.reset();
                document.getElementById('statusdc-edit-id').value = '';
                document.getElementById('statusdc-cancel-btn').style.display = 'none';
                
                carregarStatusDC();
                carregarSelectStatus('dc-status-dc', 'status_dc');
                carregarSelectStatus('filt-dcs-status', 'status_dc');
            } catch (err) {
                console.error('Erro ao salvar status DC:', err);
                alert('Erro ao salvar status DC.');
            }
        });
    }
});

async function editarStatusDC(id) {
    try {
        const { data, error } = await supabaseClient
            .from('status_dc')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) return;
        
        document.getElementById('statusdc-edit-id').value = id;
        document.getElementById('statusdc-nome').value = data.nome;
        document.getElementById('statusdc-cancel-btn').style.display = 'inline-block';
        
        document.getElementById('form-status-dc').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar status DC:', e);
        alert('Erro ao carregar dados do status DC.');
    }
}

async function excluirStatusDC(id) {
    if (!confirm('Tem certeza que deseja excluir este status DC?')) return;
    try {
        const { error } = await supabaseClient
            .from('status_dc')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('Erro: ' + error.message);
            return;
        }
        
        alert('Status DC excluído!');
        carregarStatusDC();
        carregarSelectStatus('dc-status-dc', 'status_dc');
        carregarSelectStatus('filt-dcs-status', 'status_dc');
    } catch (e) {
        console.error('Erro ao excluir status DC:', e);
        alert('Erro ao excluir status DC.');
    }
}

// =====================================================
// CRUD STATUS MEDIÇÃO
// =====================================================

async function carregarStatusMed() {
    const tbody = document.getElementById('tabela-statusmed');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('status_medicao')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) { 
            tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`; 
            return; 
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Nenhum status medição cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(s => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${s.id}</td>
                    <td>${s.nome}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarStatusMed(${s.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirStatusMed(${s.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-status-med');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('statusmed-edit-id').value;
            const dados = { nome: document.getElementById('statusmed-nome').value.trim() };
            
            if (!dados.nome) {
                alert('Nome do status é obrigatório!');
                return;
            }
            
            try {
                let result;
                if (editId) {
                    result = await supabaseClient
                        .from('status_medicao')
                        .update(dados)
                        .eq('id', parseInt(editId));
                } else {
                    result = await supabaseClient
                        .from('status_medicao')
                        .insert([dados]);
                }
                
                if (result.error) {
                    alert('Erro: ' + result.error.message);
                    return;
                }
                
                alert(editId ? 'Status Medição atualizado!' : 'Status Medição salvo!');
                e.target.reset();
                document.getElementById('statusmed-edit-id').value = '';
                document.getElementById('statusmed-cancel-btn').style.display = 'none';
                
                carregarStatusMed();
                carregarSelectStatus('med-status', 'status_medicao');
            } catch (err) {
                console.error('Erro ao salvar status medição:', err);
                alert('Erro ao salvar status medição.');
            }
        });
    }
});

async function editarStatusMed(id) {
    try {
        const { data, error } = await supabaseClient
            .from('status_medicao')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) return;
        
        document.getElementById('statusmed-edit-id').value = id;
        document.getElementById('statusmed-nome').value = data.nome;
        document.getElementById('statusmed-cancel-btn').style.display = 'inline-block';
        
        document.getElementById('form-status-med').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar status medição:', e);
        alert('Erro ao carregar dados do status medição.');
    }
}

async function excluirStatusMed(id) {
    if (!confirm('Tem certeza que deseja excluir este status medição?')) return;
    try {
        const { error } = await supabaseClient
            .from('status_medicao')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('Erro: ' + error.message);
            return;
        }
        
        alert('Status Medição excluído!');
        carregarStatusMed();
        carregarSelectStatus('med-status', 'status_medicao');
    } catch (e) {
        console.error('Erro ao excluir status medição:', e);
        alert('Erro ao excluir status medição.');
    }
}

// =====================================================
// CRUD STATUS NF
// =====================================================

async function carregarStatusNF() {
    const tbody = document.getElementById('tabela-statusnf');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('status_nf')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) { 
            tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`; 
            return; 
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Nenhum status NF cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(s => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${s.id}</td>
                    <td>${s.nome}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarStatusNF(${s.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirStatusNF(${s.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-status-nf');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('statusnf-edit-id').value;
            const dados = { nome: document.getElementById('statusnf-nome').value.trim() };
            
            if (!dados.nome) {
                alert('Nome do status é obrigatório!');
                return;
            }
            
            try {
                let result;
                if (editId) {
                    result = await supabaseClient
                        .from('status_nf')
                        .update(dados)
                        .eq('id', parseInt(editId));
                } else {
                    result = await supabaseClient
                        .from('status_nf')
                        .insert([dados]);
                }
                
                if (result.error) {
                    alert('Erro: ' + result.error.message);
                    return;
                }
                
                alert(editId ? 'Status NF atualizado!' : 'Status NF salvo!');
                e.target.reset();
                document.getElementById('statusnf-edit-id').value = '';
                document.getElementById('statusnf-cancel-btn').style.display = 'none';
                
                carregarStatusNF();
                carregarSelectStatus('dc-status-nf', 'status_nf');
            } catch (err) {
                console.error('Erro ao salvar status NF:', err);
                alert('Erro ao salvar status NF.');
            }
        });
    }
});

async function editarStatusNF(id) {
    try {
        const { data, error } = await supabaseClient
            .from('status_nf')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) return;
        
        document.getElementById('statusnf-edit-id').value = id;
        document.getElementById('statusnf-nome').value = data.nome;
        document.getElementById('statusnf-cancel-btn').style.display = 'inline-block';
        
        document.getElementById('form-status-nf').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar status NF:', e);
        alert('Erro ao carregar dados do status NF.');
    }
}

async function excluirStatusNF(id) {
    if (!confirm('Tem certeza que deseja excluir este status NF?')) return;
    try {
        const { error } = await supabaseClient
            .from('status_nf')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('Erro: ' + error.message);
            return;
        }
        
        alert('Status NF excluído!');
        carregarStatusNF();
        carregarSelectStatus('dc-status-nf', 'status_nf');
    } catch (e) {
        console.error('Erro ao excluir status NF:', e);
        alert('Erro ao excluir status NF.');
    }
}