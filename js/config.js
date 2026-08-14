import { supabaseClient, recordLoginAttempt, resetLoginAttempts, isLoginBlocked, getBlockTimeRemaining } from './config.js';
import {
    salvarUsuarioLogado, limparUsuarioLogado, getUsuarioLogado,
    iniciarMonitorInatividade, pararMonitorInatividade, sessaoExpiradaPorInatividade
} from './session.js';
import { aplicarMascaras } from './utils.js';
import { gerarMenu, irParaPrimeiraAbaAcessivel, carregarTodasListas } from './navigation.js';

// =====================================================
// FUNÇÕES DE HASH (bcrypt)
// =====================================================
async function hashPassword(password) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) reject(err);
            resolve(hash);
        });
    });
}

async function verifyPassword(password, hash) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(password, hash, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
}

// =====================================================
// VALIDAÇÃO DE SENHA
// =====================================================
export function validarSenha() {
    const senha = document.getElementById('user-senha').value;
    const criterios = {
        tamanho: senha.length >= 8,
        maiuscula: /[A-Z]/.test(senha),
        minuscula: /[a-z]/.test(senha),
        numero: /[0-9]/.test(senha),
        especial: /[!@#$%^&*(),.?":{}|<>]/.test(senha)
    };

    const ids = {
        tamanho: 'criterio-tamanho',
        maiuscula: 'criterio-maiuscula',
        minuscula: 'criterio-minuscula',
        numero: 'criterio-numero',
        especial: 'criterio-especial'
    };

    let todosAtendidos = true;
    for (const [key, value] of Object.entries(criterios)) {
        const el = document.getElementById(ids[key]);
        if (el) {
            el.className = `criteria ${value ? 'met' : 'unmet'}`;
            el.innerHTML = `<span class="check">${value ? '✓' : '✕'}</span> ${getCriterioLabel(key)}`;
        }
        if (!value) todosAtendidos = false;
    }

    document.getElementById('user-submit-btn').disabled = !todosAtendidos || !senha;
    return todosAtendidos;
}

function getCriterioLabel(key) {
    const labels = {
        tamanho: 'Mínimo 8 caracteres',
        maiuscula: '1 maiúscula',
        minuscula: '1 minúscula',
        numero: '1 número',
        especial: '1 caractere especial'
    };
    return labels[key] || key;
}

export function gerarSenhaForte() {
    const maiusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const minusculas = 'abcdefghijklmnopqrstuvwxyz';
    const numeros = '0123456789';
    const especiais = '!@#$%^&*(),.?":{}|<>';
    const todos = maiusculas + minusculas + numeros + especiais;

    let senha = '';
    senha += maiusculas[Math.floor(Math.random() * maiusculas.length)];
    senha += minusculas[Math.floor(Math.random() * minusculas.length)];
    senha += numeros[Math.floor(Math.random() * numeros.length)];
    senha += especiais[Math.floor(Math.random() * especiais.length)];

    for (let i = 4; i < 12; i++) {
        senha += todos[Math.floor(Math.random() * todos.length)];
    }

    senha = senha.split('').sort(() => Math.random() - 0.5).join('');

    document.getElementById('user-senha').value = senha;
    validarSenha();
}

// =====================================================
// LOGIN
// =====================================================
export async function fazerLogin(event) {
    event.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');

    // Rate limiting
    if (isLoginBlocked()) {
        const remaining = getBlockTimeRemaining();
        const minutes = Math.ceil(remaining / 60);
        const seconds = remaining % 60;
        let mensagem = 'Muitas tentativas. Aguarde ';
        if (minutes > 0) {
            mensagem += `${minutes} minuto(s)`;
            if (seconds > 0) mensagem += ` e ${seconds} segundo(s)`;
        } else {
            mensagem += `${seconds} segundo(s)`;
        }
        mensagem += ' para tentar novamente.';
        errorEl.textContent = mensagem;
        errorEl.classList.add('show');
        return false;
    }

    if (!user || !pass) {
        errorEl.textContent = 'Preencha usuário e senha.';
        errorEl.classList.add('show');
        recordLoginAttempt();
        return false;
    }

    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('nome', user)
            .single();

        if (error || !data) {
            errorEl.textContent = 'Usuário ou senha incorretos. Tente novamente.';
            errorEl.classList.add('show');
            recordLoginAttempt();
            return false;
        }

        // Verificar senha com bcrypt
        const senhaValida = await verifyPassword(pass, data.senha);
        if (!senhaValida) {
            errorEl.textContent = 'Usuário ou senha incorretos. Tente novamente.';
            errorEl.classList.add('show');
            recordLoginAttempt();
            return false;
        }

        // Login bem-sucedido
        resetLoginAttempts();
        errorEl.classList.remove('show');

        const usuarioSeguro = { ...data };
        delete usuarioSeguro.senha;

        salvarUsuarioLogado(usuarioSeguro);
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('appShell').style.display = 'flex';

        const avatar = document.getElementById('userAvatar');
        const nomeDisplay = document.getElementById('userNameDisplay');
        avatar.textContent = data.nome.charAt(0).toUpperCase();
        nomeDisplay.textContent = data.nome;

        gerarMenu(data.permissoes || []);
        irParaPrimeiraAbaAcessivel();
        carregarTodasListas();
        aplicarMascaras();
        iniciarMonitorInatividade(fazerLogoutPorInatividade);

        return false;
    } catch (e) {
        console.error('Erro ao fazer login:', e);
        errorEl.textContent = 'Erro ao conectar ao servidor.';
        errorEl.classList.add('show');
        recordLoginAttempt();
        return false;
    }
}

function voltarParaTelaLogin() {
    pararMonitorInatividade();
    limparUsuarioLogado();
    document.getElementById('appShell').style.display = 'none';
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').classList.remove('show');
}

export function fazerLogout() {
    if (confirm('Tem certeza que deseja sair?')) {
        voltarParaTelaLogin();
    }
}

function fazerLogoutPorInatividade() {
    voltarParaTelaLogin();
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = 'Sessão encerrada por inatividade. Faça login novamente.';
    errorEl.classList.add('show');
}

export function verificarSessao() {
    const usuario = getUsuarioLogado();
    if (usuario) {
        if (sessaoExpiradaPorInatividade()) {
            limparUsuarioLogado();
            pararMonitorInatividade();
            return false;
        }
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('appShell').style.display = 'flex';
        const avatar = document.getElementById('userAvatar');
        const nomeDisplay = document.getElementById('userNameDisplay');
        avatar.textContent = usuario.nome.charAt(0).toUpperCase();
        nomeDisplay.textContent = usuario.nome;
        gerarMenu(usuario.permissoes || []);
        iniciarMonitorInatividade(fazerLogoutPorInatividade);
        return true;
    }
    return false;
}
