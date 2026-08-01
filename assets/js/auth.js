// =====================================================
// AUTENTICAÇÃO E SESSÃO
// =====================================================

let usuarioLogado = null;
let usuarioPermissoes = [];

function getUsuarioLogado() {
    try {
        const saved = localStorage.getItem('usuarioLogado');
        if (saved) {
            const data = JSON.parse(saved);
            usuarioLogado = data;
            usuarioPermissoes = data.permissoes || [];
            return data;
        }
    } catch(e) {
        console.error('Erro ao recuperar sessão:', e);
    }
    return null;
}

function salvarUsuarioLogado(usuario) {
    try {
        // Não armazenar senha em localStorage
        const usuarioSeguro = { ...usuario };
        delete usuarioSeguro.senha;
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioSeguro));
        usuarioLogado = usuarioSeguro;
        usuarioPermissoes = usuarioSeguro.permissoes || [];
    } catch(e) {
        console.error('Erro ao salvar sessão:', e);
    }
}

function limparUsuarioLogado() {
    localStorage.removeItem('usuarioLogado');
    usuarioLogado = null;
    usuarioPermissoes = [];
}

function temPermissao(area) {
    if (!usuarioPermissoes || usuarioPermissoes.length === 0) return true;
    return usuarioPermissoes.includes(area) || usuarioPermissoes.includes('*');
}

async function fazerLogin(event) {
    event.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!user || !pass) {
        errorEl.textContent = 'Preencha usuário e senha.';
        errorEl.classList.add('show');
        return false;
    }

    try {
        // Buscar usuário no banco
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('nome', user)
            .single();

        if (error || !data) {
            errorEl.textContent = 'Usuário não encontrado.';
            errorEl.classList.add('show');
            return false;
        }

        // Verificar senha (em produção, usar hash)
        if (data.senha !== pass) {
            errorEl.textContent = 'Senha incorreta.';
            errorEl.classList.add('show');
            return false;
        }

        salvarUsuarioLogado(data);
        errorEl.classList.remove('show');
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('appShell').style.display = 'flex';
        
        const avatar = document.getElementById('userAvatar');
        const nomeDisplay = document.getElementById('userNameDisplay');
        avatar.textContent = data.nome.charAt(0).toUpperCase();
        nomeDisplay.textContent = data.nome;

        gerarMenu(data.permissoes || []);
        
        mudarAba('dashboard');
        
        carregarDashboard();
        carregarTodasListas();
        aplicarMascaras();

        return false;
    } catch(e) {
        errorEl.textContent = 'Erro ao conectar ao servidor.';
        errorEl.classList.add('show');
        return false;
    }
}

function fazerLogout() {
    if (confirm('Tem certeza que deseja sair?')) {
        limparUsuarioLogado();
        document.getElementById('appShell').style.display = 'none';
        document.getElementById('loginOverlay').classList.remove('hidden');
        document.getElementById('loginUser').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginError').classList.remove('show');
    }
}

function verificarSessao() {
    const usuario = getUsuarioLogado();
    if (usuario) {
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('appShell').style.display = 'flex';
        const avatar = document.getElementById('userAvatar');
        const nomeDisplay = document.getElementById('userNameDisplay');
        avatar.textContent = usuario.nome.charAt(0).toUpperCase();
        nomeDisplay.textContent = usuario.nome;
        gerarMenu(usuario.permissoes || []);
        return true;
    }
    return false;
}