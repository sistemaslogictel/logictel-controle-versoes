// =====================================================
// SESSÃO DO USUÁRIO
// =====================================================
export let usuarioLogado = null;
export let usuarioPermissoes = [];

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
    localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
    usuarioLogado = usuario;
    usuarioPermissoes = usuario.permissoes || [];
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
