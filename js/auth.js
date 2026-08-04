import { supabaseClient } from './config.js';
import { salvarUsuarioLogado, limparUsuarioLogado, getUsuarioLogado } from './session.js';
import { aplicarMascaras } from './utils.js';
import { gerarMenu } from './navigation.js';
import { mudarAba, carregarTodasListas } from './navigation.js';
import { carregarDashboard } from './dashboards.js';

// =====================================================
// VALIDAÇÃO DE SENHA (força da senha no cadastro de usuário)
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

    if (!user || !pass) {
        errorEl.textContent = 'Preencha usuário e senha.';
        errorEl.classList.add('show');
        return false;
    }

    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('nome', user)
            .eq('senha', pass)
            .single();

        if (error || !data) {
            errorEl.textContent = 'Usuário ou senha incorretos. Tente novamente.';
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
    } catch (e) {
        errorEl.textContent = 'Erro ao conectar ao servidor.';
        errorEl.classList.add('show');
        return false;
    }
}

export function fazerLogout() {
    if (confirm('Tem certeza que deseja sair?')) {
        limparUsuarioLogado();
        document.getElementById('appShell').style.display = 'none';
        document.getElementById('loginOverlay').classList.remove('hidden');
        document.getElementById('loginUser').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginError').classList.remove('show');
    }
}

export function verificarSessao() {
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
