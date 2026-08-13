// =====================================================
// SESSÃO DO USUÁRIO
// =====================================================
export let usuarioLogado = null;
export let usuarioPermissoes = [];

// Tempo máximo de inatividade antes do logout automático
const TEMPO_LIMITE_INATIVIDADE_MS = 20 * 60 * 1000; // 20 minutos
const CHAVE_ULTIMA_ATIVIDADE = 'ultimaAtividade';
const EVENTOS_ATIVIDADE = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
const INTERVALO_VERIFICACAO_MS = 15000; // verifica a cada 15s

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
    // Nunca gravar a senha no localStorage (fica visível a qualquer um com
    // acesso ao navegador/dispositivo, ex: DevTools > Application > Local Storage).
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

export function temPermissao(area) {
    if (!usuarioPermissoes || usuarioPermissoes.length === 0) return true;
    return usuarioPermissoes.includes(area) || usuarioPermissoes.includes('*');
}

// =====================================================
// CONTROLE DE INATIVIDADE (logout automático de segurança)
// =====================================================
// A última atividade é gravada no localStorage (não só em memória),
// então o tempo de inatividade é respeitado mesmo se a página for
// recarregada, fechada e reaberta, ou se houver várias abas abertas.

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

// Chame após login/sessão validada. onExpirar é a função a ser
// executada quando o tempo de inatividade estourar (ex: logout automático).
export function iniciarMonitorInatividade(onExpirar) {
    callbackExpiracaoInatividade = onExpirar;
    registrarAtividade();

    EVENTOS_ATIVIDADE.forEach(evento => {
        document.addEventListener(evento, registrarAtividade, { passive: true });
    });

    if (intervaloInatividade) clearInterval(intervaloInatividade);
    intervaloInatividade = setInterval(verificarInatividade, INTERVALO_VERIFICACAO_MS);
}

// Chame no logout (manual ou automático) para parar de monitorar.
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
