// =====================================================
// SESSÃO DO USUÁRIO
// =====================================================
export let usuarioLogado = null;
export let usuarioPermissoes = [];

const TEMPO_LIMITE_INATIVIDADE_MS = 20 * 60 * 1000;
const CHAVE_ULTIMA_ATIVIDADE = 'ultimaAtividade';
const EVENTOS_ATIVIDADE = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
const INTERVALO_VERIFICACAO_MS = 15000;

let intervaloInatividade = null;
let callbackExpiracaoInatividade = null;

export function getUsuarioLogado() {
    const saved = localStorage.getItem('usuarioLogado');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            usuarioLogado = data;
            usuarioPermissoes = data.permissoes || [];
            return data;
        } catch (e) { return null; }
    }
    return null;
}

export function salvarUsuarioLogado(usuario) {
    const usuarioSeguro = { ...usuario };
    delete usuarioSeguro.senha;

    localStorage.setItem('usuarioLogado', JSON.stringify(usuarioSeguro));
    usuarioLogado = usuarioSeguro;
    usuarioPermissoes = usuarioSeguro.permissoes || [];
}

export function limparUsuarioLogado() {
    localStorage.removeItem('usuarioLogado');
    usuarioLogado = null;
    usuarioPermissoes = [];
}

// =====================================================
// CORRIGIDO: FAIL-CLOSED (negar por padrão)
// =====================================================
export function temPermissao(area) {
    // Se não houver usuário logado, negar
    if (!usuarioLogado) return false;
    
    // Se não houver permissões, negar
    if (!usuarioPermissoes || usuarioPermissoes.length === 0) return false;
    
    // Permitir apenas se a área estiver explicitamente nas permissões
    return usuarioPermissoes.includes(area) || usuarioPermissoes.includes('*');
}

// =====================================================
// CONTROLE DE INATIVIDADE
// =====================================================
function registrarAtividade() {
    localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));
}

export function sessaoExpiradaPorInatividade() {
    const ultima = Number(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE) || 0);
    if (!ultima) return false;
    return (Date.now() - ultima) >= TEMPO_LIMITE_INATIVIDADE_MS;
}

function verificarInatividade() {
    if (sessaoExpiradaPorInatividade()) {
        pararMonitorInatividade();
        if (typeof callbackExpiracaoInatividade === 'function') {
            callbackExpiracaoInatividade();
        }
    }
}

export function iniciarMonitorInatividade(onExpirar) {
    callbackExpiracaoInatividade = onExpirar;
    registrarAtividade();

    EVENTOS_ATIVIDADE.forEach(evento => {
        document.addEventListener(evento, registrarAtividade, { passive: true });
    });

    if (intervaloInatividade) clearInterval(intervaloInatividade);
    intervaloInatividade = setInterval(verificarInatividade, INTERVALO_VERIFICACAO_MS);
}

export function pararMonitorInatividade() {
    EVENTOS_ATIVIDADE.forEach(evento => {
        document.removeEventListener(evento, registrarAtividade);
    });
    if (intervaloInatividade) {
        clearInterval(intervaloInatividade);
        intervaloInatividade = null;
    }
    localStorage.removeItem(CHAVE_ULTIMA_ATIVIDADE);
}