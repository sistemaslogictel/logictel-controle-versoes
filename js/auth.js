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
    if (getUsuarioLogado()) {
        timeoutId = setTimeout(() => {
            if (getUsuarioLogado()) {
                alert(`Sessão expirada por inatividade de ${TIMEOUT_MINUTES} minutos.`);
                fazerLogout(true);
            }
        }, TIMEOUT_MS);
    }
}

const EVENTOS_RESET = [
    'click', 'mousemove', 'keydown', 'scroll', 
    'touchstart', 'touchmove', 'wheel', 'focus'
];

export function iniciarMonitorInatividade() {
    EVENTOS_RESET.forEach(evento => {
        document.removeEventListener(evento, resetarTimeout);
    });
    EVENTOS_RESET.forEach(evento => {
        document.addEventListener(evento, resetarTimeout);
    });
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
// VALIDAÇÃO DE SENHA
// =====================================================
export function validarSenha() {
    const senha = document.getElementById('user-senha');
    if (!senha) return false;
    
    const valor = senha.value;
    const criterios = {
        tamanho: valor.length >= 8,
        maiuscula: /[A-Z]/.test(valor),
        minuscula: /[a-z]/.test(valor),
        numero: /[0-9]/.test(valor),
        especial: /[!@#$%^&*(),.?":{}|<>]/.test(valor)
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
    if (btn) btn.disabled = !todosAtendidos || !valor;
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
// LOGIN - VERSÃO MAIS SIMPLES E DIRETA
// =====================================================
export async function fazerLogin() {
    console.log('🔐 Iniciando login...');
    
    const userInput = document.getElementById('loginUser');
    const passInput = document.getElementById('loginPassword');
    const errorEl = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginButton');

    if (!userInput || !passInput) {
        console.error('❌ Elementos de login não encontrados');
        if (errorEl) {
            errorEl.textContent = 'Erro no sistema. Contate o administrador.';
            errorEl.classList.add('show');
        }
        return;
    }

    const user = userInput.value.trim();
    const pass = passInput.value.trim();

    console.log('👤 Usuário digitado:', user);
    console.log('🔑 Senha digitada:', '***');

    if (!user || !pass) {
        console.warn('⚠️ Campos vazios');
        if (errorEl) {
            errorEl.textContent = 'Preencha usuário e senha.';
            errorEl.classList.add('show');
        }
        return;
    }

    // Feedback visual
    if (loginBtn) {
        loginBtn.textContent = '⏳ Entrando...';
        loginBtn.disabled = true;
    }

    try {
        console.log('📡 Buscando usuário no Supabase...');
        console.log('📡 URL:', supabaseClient.supabaseUrl);
        
        // Usando .eq com filtro simples
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('nome', user);

        console.log('📊 Dados retornados:', data);
        console.log('❌ Erro retornado:', error);

        if (error) {
            console.error('❌ Erro na consulta:', error);
            if (errorEl) {
                errorEl.textContent = 'Erro ao conectar ao banco: ' + error.message;
                errorEl.classList.add('show');
            }
            if (loginBtn) {
                loginBtn.textContent = 'Entrar';
                loginBtn.disabled = false;
            }
            return;
        }

        // Verifica se encontrou o usuário
        if (!data || data.length === 0) {
            console.warn('❌ Usuário não encontrado');
            if (errorEl) {
                errorEl.textContent = 'Usuário ou senha incorretos. Tente novamente.';
                errorEl.classList.add('show');
            }
            if (loginBtn) {
                loginBtn.textContent = 'Entrar';
                loginBtn.disabled = false;
            }
            return;
        }

        // Verifica a senha
        const usuario = data[0];
        console.log('✅ Usuário encontrado:', usuario.nome);
        console.log('🔑 Senha no banco:', usuario.senha);
        console.log('🔑 Senha digitada:', pass);
        console.log('🔑 Comparação:', usuario.senha === pass ? '✅ IGUAIS' : '❌ DIFERENTES');

        if (usuario.senha !== pass) {
            console.warn('❌ Senha incorreta');
            if (errorEl) {
                errorEl.textContent = 'Usuário ou senha incorretos. Tente novamente.';
                errorEl.classList.add('show');
            }
            if (loginBtn) {
                loginBtn.textContent = 'Entrar';
                loginBtn.disabled = false;
            }
            return;
        }

        // LOGIN BEM-SUCEDIDO!
        console.log('🎉 LOGIN BEM-SUCEDIDO!');

        // Salva na sessão
        salvarUsuarioLogado(usuario);
        if (errorEl) errorEl.classList.remove('show');

        // Esconde login e mostra app
        const overlay = document.getElementById('loginOverlay');
        const appShell = document.getElementById('appShell');
        if (overlay) overlay.classList.add('hidden');
        if (appShell) appShell.style.display = 'flex';

        // Atualiza avatar
        const avatar = document.getElementById('userAvatar');
        const nomeDisplay = document.getElementById('userNameDisplay');
        if (avatar) avatar.textContent = usuario.nome.charAt(0).toUpperCase();
        if (nomeDisplay) nomeDisplay.textContent = usuario.nome;

        // Carrega o sistema
        console.log('📋 Carregando menu...');
        gerarMenu(usuario.permissoes || []);
        
        console.log('📊 Carregando dashboard...');
        mudarAba('dashboard');
        carregarDashboard();
        carregarTodasListas();
        aplicarMascaras();

        // Inicia timeout
        iniciarMonitorInatividade();

        if (loginBtn) {
            loginBtn.textContent = 'Entrar';
            loginBtn.disabled = false;
        }

        console.log('✅ Login concluído com sucesso!');

    } catch (e) {
        console.error('💥 Erro crítico:', e);
        if (errorEl) {
            errorEl.textContent = 'Erro no sistema: ' + e.message;
            errorEl.classList.add('show');
        }
        if (loginBtn) {
            loginBtn.textContent = 'Entrar';
            loginBtn.disabled = false;
        }
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
    
    const loginBtn = document.getElementById('loginButton');
    if (loginBtn) {
        loginBtn.textContent = 'Entrar';
        loginBtn.disabled = false;
    }
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
