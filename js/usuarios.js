import { supabaseClient } from './config.js';
import { validarSenha } from './auth.js';

// =====================================================
// HASH DE SENHA (bcrypt)
// =====================================================
async function hashPassword(password) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) reject(err);
            resolve(hash);
        });
    });
}

export function getPermissoes() {
    const checks = document.querySelectorAll('.permission-check:checked');
    return Array.from(checks).map(c => c.value);
}

export function setPermissoes(permissoes) {
    document.querySelectorAll('.permission-check').forEach(c => {
        c.checked = permissoes.includes(c.value);
    });
}

export async function carregarUsuarios() {
    const tbody = document.getElementById('tabela-usuarios');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        // NÃO SELECIONAR A SENHA
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('id, nome, permissoes, criado_em')
            .order('id', { ascending: true });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Nenhum usuário cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(u => {
            const permissoes = u.permissoes || [];
            const permissoesHtml = permissoes.map(p => `<span class="permissions-badge">${p}</span>`).join(' ');
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${u.id}</td>
                    <td>${u.nome}</td>
                    <td style="color:var(--text-soft);font-size:10px;">••••••••</td>
                    <td>${permissoesHtml || '<span style="color:var(--text-soft)">Nenhuma</span>'}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarUsuario(${u.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirUsuario(${u.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormUsuario() {
    document.getElementById('form-usuario').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('user-edit-id').value;
        const senha = document.getElementById('user-senha').value;
        const nome = document.getElementById('user-nome').value.trim();

        if (!nome) { alert('Nome do usuário é obrigatório!'); return; }

        // Se for edição e a senha estiver vazia, manter a atual
        if (editId && !senha) {
            // Atualizar apenas nome e permissões
            const permissoes = getPermissoes();
            const dados = { nome, permissoes };
            
            try {
                const { error } = await supabaseClient
                    .from('usuarios')
                    .update(dados)
                    .eq('id', parseInt(editId));
                    
                if (error) { alert('Erro: ' + error.message); return; }
                alert('Usuário atualizado!');
                e.target.reset();
                document.getElementById('user-edit-id').value = '';
                document.getElementById('user-cancel-btn').style.display = 'none';
                setPermissoes([]);
                carregarUsuarios();
                return;
            } catch (err) {
                console.error('Erro ao atualizar usuário:', err);
                alert('Erro ao atualizar usuário.');
                return;
            }
        }

        // Validar senha
        if (!validarSenha()) {
            alert('A senha não atende aos critérios de segurança.');
            return;
        }

        const permissoes = getPermissoes();
        const senhaHash = await hashPassword(senha);
        const dados = { nome, senha: senhaHash, permissoes };

        try {
            let result;
            if (editId) {
                result = await supabaseClient.from('usuarios').update(dados).eq('id', parseInt(editId));
            } else {
                result = await supabaseClient.from('usuarios').insert([dados]);
            }

            if (result.error) { alert('Erro: ' + result.error.message); return; }

            alert(editId ? 'Usuário atualizado!' : 'Usuário salvo!');
            e.target.reset();
            document.getElementById('user-edit-id').value = '';
            document.getElementById('user-cancel-btn').style.display = 'none';
            setPermissoes([]);
            document.getElementById('user-submit-btn').disabled = true;
            carregarUsuarios();
        } catch (err) {
            console.error('Erro ao salvar usuário:', err);
            alert('Erro ao salvar usuário.');
        }
    });
}

export async function editarUsuario(id) {
    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('id, nome, permissoes')
            .eq('id', id)
            .single();

        if (error) { alert('Erro ao carregar: ' + error.message); return; }
        if (!data) return;

        document.getElementById('user-edit-id').value = id;
        document.getElementById('user-nome').value = data.nome;
        document.getElementById('user-senha').value = '';
        document.getElementById('user-senha').placeholder = 'Deixe em branco para manter a atual';
        setPermissoes(data.permissoes || []);
        document.getElementById('user-cancel-btn').style.display = 'inline-block';
        validarSenha();

        document.getElementById('form-usuario').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar usuário:', e);
        alert('Erro ao carregar dados do usuário.');
    }
}

export async function excluirUsuario(id) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
        const { error } = await supabaseClient.from('usuarios').delete().eq('id', id);
        if (error) { alert('Erro: ' + error.message); return; }

        alert('Usuário excluído!');
        carregarUsuarios();
    } catch (e) {
        console.error('Erro ao excluir usuário:', e);
        alert('Erro ao excluir usuário.');
    }
}