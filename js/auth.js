import { supabaseClient } from './config.js';
import { salvarUsuarioLogado, limparUsuarioLogado, getUsuarioLogado } from './session.js';
import { aplicarMascaras } from './utils.js';
import { gerarMenu } from './navigation.js';
import { mudarAba, carregarTodasListas } from './navigation.js';
import { carregarDashboard } from './dashboards.js';

// =====================================================
// TIMEOUT DE INATIVIDADE (30 minutos)
// =====================================================
let timeoutId = null;
const TIMEOUT_MINUTES = 30;
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;

export function resetarTimeout() {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    // Só inicia o timeout se o usuário estiver logado
    if (getUsuarioLogado()) {
        timeoutId = setTimeout(() => {
            if (getUsuarioLogado()) {
                const msg = `Sessão expirada por inatividade de ${TIMEOUT_MINUTES} minutos.`;
                alert(msg);
                fazerLogout(true);
            }
        }, TIMEOUT_MS);
    }
}

// Lista de eventos que resetam o timeout
const EVENTOS_RESET = [
    'click', 'mousemove', 'keydown', 'scroll', 
    'touchstart', 'touchmove', 'wheel', 'focus'
];

export function iniciarMonitorInatividade() {
    // Remove listeners antigos para evitar duplicação
    EVENTOS_RESET.forEach(evento => {
        document.removeEventListener(evento, resetarTimeout);
    });
    
    // Adiciona os listeners
    EVENTOS_RESET.forEach(evento => {
        document.addEventListener(evento, resetarTimeout);
    });
    
    // Inicia o timeout
    resetarTimeout();
}

export function pararMonitorInatividade() {
    EVENTOS_RESET.forEach(evento => {
        document.removeEventListener(evento, resetarTimeout);
    });
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
}

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

    const btn = document.getElementById('user-submit-btn');
    if (btn) btn.disabled = !todosAtendidos || !senha;
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

    const input = document.getElementById('user-senha');
    if (input) input.value = senha;
    validarSenha();
}

// =====================================================
// LOGIN (CORRIGIDO)
// =====================================================
export async function fazerLogin(event) {
    // Previne o comportamento padrão do formulário
    if (event && event.preventDefault) {
        event.preventDefault();
    }

    const userInput = document.getElementById('loginUser');
    const passInput = document.getElementById('loginPassword');
    const errorEl = document.getElementById('loginError');

    if (!userInput || !passInput) {
        console.error('Elementos de login não encontrados');
        return false;
    }

    const user = userInput.value.trim();
    const pass = passInput.value.trim();

    if (!user || !pass) {
        if (errorEl) {
            errorEl.textContent = 'Preencha usuário e senha.';
            errorEl.classList.add('show');
        }
        return false;
    }

    // Mostra loading no botão
    const submitBtn = document.querySelector('.login-card .btn-primary');
    const originalText = submitBtn ? submitBtn.textContent : 'Entrar';
    if (submitBtn) {
        submitBtn.textContent = 'Entrando...';
        submitBtn.disabled = true;
    }

    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('nome', user)
            .eq('senha', pass)
            .single();

        if (error || !data) {
            if (errorEl) {
                errorEl.textContent = 'Usuário ou senha incorretos. Tente novamente.';
                errorEl.classList.add('show');
            }
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
            return false;
        }

        // Login bem-sucedido
        salvarUsuarioLogado(data);
        if (errorEl) errorEl.classList.remove('show');

        // Esconde overlay de login e mostra app
        const overlay = document.getElementById('loginOverlay');
        const appShell = document.getElementById('appShell');
        if (overlay) overlay.classList.add('hidden');
        if (appShell) appShell.style.display = 'flex';

        // Atualiza avatar e nome
        const avatar = document.getElementById('userAvatar');
        const nomeDisplay = document.getElementById('userNameDisplay');
        if (avatar) avatar.textContent = data.nome.charAt(0).toUpperCase();
        if (nomeDisplay) nomeDisplay.textContent = data.nome;

        // Gera menu e carrega dados
        gerarMenu(data.permissoes || []);
        mudarAba('dashboard');
        carregarDashboard();
        carregarTodasListas();
        aplicarMascaras();

        // Inicia monitor de inatividade
        iniciarMonitorInatividade();

        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }

        return false;
    } catch (e) {
        console.error('Erro no login:', e);
        if (errorEl) {
            errorEl.textContent = 'Erro ao conectar ao servidor.';
            errorEl.classList.add('show');
        }
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
        return false;
    }
}

export function fazerLogout(silencioso = false) {
    if (!silencioso && !confirm('Tem certeza que deseja sair?')) {
        return;
    }
    pararMonitorInatividade();
    limparUsuarioLogado();
    
    const appShell = document.getElementById('appShell');
    const overlay = document.getElementById('loginOverlay');
    const userInput = document.getElementById('loginUser');
    const passInput = document.getElementById('loginPassword');
    const errorEl = document.getElementById('loginError');
    
    if (appShell) appShell.style.display = 'none';
    if (overlay) overlay.classList.remove('hidden');
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
    if (errorEl) errorEl.classList.remove('show');
}

export function verificarSessao() {
    const usuario = getUsuarioLogado();
    if (usuario) {
        const overlay = document.getElementById('loginOverlay');
        const appShell = document.getElementById('appShell');
        const avatar = document.getElementById('userAvatar');
        const nomeDisplay = document.getElementById('userNameDisplay');
        
        if (overlay) overlay.classList.add('hidden');
        if (appShell) appShell.style.display = 'flex';
        if (avatar) avatar.textContent = usuario.nome.charAt(0).toUpperCase();
        if (nomeDisplay) nomeDisplay.textContent = usuario.nome;
        
        gerarMenu(usuario.permissoes || []);
        iniciarMonitorInatividade();
        
        return true;
    }
    return false;
}
