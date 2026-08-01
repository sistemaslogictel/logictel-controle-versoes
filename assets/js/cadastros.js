// =====================================================
// CRUD EMPRESAS
// =====================================================

async function carregarEmpresas() {
    const tbody = document.getElementById('tabela-empresas');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('empresas')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) { 
            tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`; 
            return; 
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Nenhuma empresa cadastrada.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(e => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${e.id}</td>
                    <td>${e.nome}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarEmpresa(${e.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirEmpresa(${e.id})" class="btn-danger">Excluir</button>
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
    const form = document.getElementById('form-empresa');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('empresa-edit-id').value;
            const dados = { nome: document.getElementById('empresa-nome').value.trim() };
            
            if (!dados.nome) {
                alert('Nome da empresa é obrigatório!');
                return;
            }
            
            try {
                let result;
                if (editId) {
                    result = await supabaseClient
                        .from('empresas')
                        .update(dados)
                        .eq('id', parseInt(editId));
                } else {
                    result = await supabaseClient
                        .from('empresas')
                        .insert([dados]);
                }
                
                if (result.error) {
                    alert('Erro: ' + result.error.message);
                    return;
                }
                
                alert(editId ? 'Empresa atualizada!' : 'Empresa salva!');
                e.target.reset();
                document.getElementById('empresa-edit-id').value = '';
                document.getElementById('empresa-cancel-btn').style.display = 'none';
                
                carregarEmpresas();
                carregarSelectEmpresas('contrato-empresa');
                carregarSelectEmpresas('projeto-empresa');
                carregarSelectEmpresas('diretor-empresa');
                carregarSelectEmpresas('dc-empresa');
                carregarSelectEmpresas('med-empresa');
            } catch (err) {
                console.error('Erro ao salvar empresa:', err);
                alert('Erro ao salvar empresa.');
            }
        });
    }
});

async function editarEmpresa(id) {
    try {
        const { data, error } = await supabaseClient
            .from('empresas')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) return;
        
        document.getElementById('empresa-edit-id').value = id;
        document.getElementById('empresa-nome').value = data.nome;
        document.getElementById('empresa-cancel-btn').style.display = 'inline-block';
        
        document.getElementById('form-empresa').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar empresa:', e);
        alert('Erro ao carregar dados da empresa.');
    }
}

async function excluirEmpresa(id) {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;
    try {
        const { error } = await supabaseClient
            .from('empresas')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('Erro: ' + error.message);
            return;
        }
        
        alert('Empresa excluída!');
        carregarEmpresas();
    } catch (e) {
        console.error('Erro ao excluir empresa:', e);
        alert('Erro ao excluir empresa.');
    }
}

// =====================================================
// CRUD DIRETORES
// =====================================================

async function carregarDiretores() {
    const tbody = document.getElementById('tabela-diretores');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('diretores')
            .select('*, empresas(nome)')
            .order('id', { ascending: true });
        
        if (error) { 
            tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`; 
            return; 
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Nenhum diretor cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(d => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${d.id}</td>
                    <td>${d.nome}</td>
                    <td>${d.empresas?.nome || 'N/A'}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarDiretor(${d.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirDiretor(${d.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-diretor');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('diretor-edit-id').value;
            const empresaId = document.getElementById('diretor-empresa').value;
            const dados = {
                nome: document.getElementById('diretor-nome').value.trim(),
                empresa_id: empresaId || null
            };
            
            if (!dados.nome) {
                alert('Nome do diretor é obrigatório!');
                return;
            }
            if (!dados.empresa_id) {
                alert('Selecione uma empresa!');
                return;
            }
            
            try {
                let result;
                if (editId) {
                    result = await supabaseClient
                        .from('diretores')
                        .update(dados)
                        .eq('id', parseInt(editId));
                } else {
                    result = await supabaseClient
                        .from('diretores')
                        .insert([dados]);
                }
                
                if (result.error) {
                    alert('Erro: ' + result.error.message);
                    return;
                }
                
                alert(editId ? 'Diretor atualizado!' : 'Diretor salvo!');
                e.target.reset();
                document.getElementById('diretor-edit-id').value = '';
                document.getElementById('diretor-cancel-btn').style.display = 'none';
                
                carregarDiretores();
                carregarSelectDiretores('contrato-diretor');
                carregarSelectDiretores('projeto-diretor');
                carregarSelectDiretores('dc-diretor');
                carregarSelectDiretores('med-diretor');
            } catch (err) {
                console.error('Erro ao salvar diretor:', err);
                alert('Erro ao salvar diretor.');
            }
        });
    }
});

async function editarDiretor(id) {
    try {
        const { data, error } = await supabaseClient
            .from('diretores')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) return;
        
        document.getElementById('diretor-edit-id').value = id;
        document.getElementById('diretor-nome').value = data.nome;
        document.getElementById('diretor-empresa').value = data.empresa_id || '';
        document.getElementById('diretor-cancel-btn').style.display = 'inline-block';
        
        document.getElementById('form-diretor').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar diretor:', e);
        alert('Erro ao carregar dados do diretor.');
    }
}

async function excluirDiretor(id) {
    if (!confirm('Tem certeza que deseja excluir este diretor?')) return;
    try {
        const { error } = await supabaseClient
            .from('diretores')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('Erro: ' + error.message);
            return;
        }
        
        alert('Diretor excluído!');
        carregarDiretores();
        carregarSelectDiretores('contrato-diretor');
        carregarSelectDiretores('projeto-diretor');
        carregarSelectDiretores('dc-diretor');
        carregarSelectDiretores('med-diretor');
    } catch (e) {
        console.error('Erro ao excluir diretor:', e);
        alert('Erro ao excluir diretor.');
    }
}

// =====================================================
// CRUD CONTRATOS
// =====================================================

async function carregarContratos() {
    const tbody = document.getElementById('tabela-contratos');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('contratos')
            .select('*, empresas(nome), diretores(nome)')
            .order('id', { ascending: true });
        
        if (error) { 
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`; 
            return; 
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Nenhum contrato cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(c => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${c.id}</td>
                    <td>${c.numero}</td>
                    <td>${c.empresas?.nome || 'N/A'}</td>
                    <td>${c.diretores?.nome || 'N/A'}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarContrato(${c.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirContrato(${c.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-contrato');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('contrato-edit-id').value;
            const dados = {
                numero: document.getElementById('contrato-numero').value.trim(),
                empresa_id: document.getElementById('contrato-empresa').value,
                diretor_id: document.getElementById('contrato-diretor').value || null
            };
            
            if (!dados.numero) {
                alert('Número do contrato é obrigatório!');
                return;
            }
            if (!dados.empresa_id) {
                alert('Selecione uma empresa!');
                return;
            }
            if (!dados.diretor_id) {
                alert('Selecione um diretor!');
                return;
            }
            
            try {
                let result;
                if (editId) {
                    result = await supabaseClient
                        .from('contratos')
                        .update(dados)
                        .eq('id', parseInt(editId));
                } else {
                    result = await supabaseClient
                        .from('contratos')
                        .insert([dados]);
                }
                
                if (result.error) {
                    alert('Erro: ' + result.error.message);
                    return;
                }
                
                alert(editId ? 'Contrato atualizado!' : 'Contrato salvo!');
                e.target.reset();
                document.getElementById('contrato-edit-id').value = '';
                document.getElementById('contrato-cancel-btn').style.display = 'none';
                
                carregarContratos();
                carregarSelectContratos('projeto-contrato');
            } catch (err) {
                console.error('Erro ao salvar contrato:', err);
                alert('Erro ao salvar contrato.');
            }
        });
    }
});

async function editarContrato(id) {
    try {
        const { data, error } = await supabaseClient
            .from('contratos')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) return;
        
        document.getElementById('contrato-edit-id').value = id;
        document.getElementById('contrato-numero').value = data.numero;
        document.getElementById('contrato-empresa').value = data.empresa_id;
        document.getElementById('contrato-diretor').value = data.diretor_id || '';
        document.getElementById('contrato-cancel-btn').style.display = 'inline-block';
        
        document.getElementById('form-contrato').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar contrato:', e);
        alert('Erro ao carregar dados do contrato.');
    }
}

async function excluirContrato(id) {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return;
    try {
        const { error } = await supabaseClient
            .from('contratos')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('Erro: ' + error.message);
            return;
        }
        
        alert('Contrato excluído!');
        carregarContratos();
    } catch (e) {
        console.error('Erro ao excluir contrato:', e);
        alert('Erro ao excluir contrato.');
    }
}