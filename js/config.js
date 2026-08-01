// =====================================================
// CONFIGURAÇÕES DO SISTEMA
// =====================================================

const SISTEMA = {
    versao: '0.0.1',
    nome: 'Sistema Financeiro Logictel',
    empresa: 'Logictel',
    desenvolvedor: 'Nelson Martins',
    ano: 2026
};

// Configurações do Supabase
const SUPABASE_CONFIG = {
    url: 'https://gqrktjlwiownfezkvtgh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxcmt0amx3aW93bmZlemt2dGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0OTUxNDgsImV4cCI6MjEwMTA3MTE0OH0.ntyHDf5fgBKzlslvcK5n1JleuRnjGu8xG2ZzSm2CKH8'
};

// Bloquear acesso ao console e ferramentas de desenvolvimento
if (typeof window !== 'undefined') {
    // Impedir clique direito
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // Impedir atalhos de desenvolvedor
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
            e.preventDefault();
            return false;
        }
        // Ctrl+U
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            return false;
        }
    });

    // Limpar console
    console.clear();

    // Sobrescrever console.log em produção
    if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
        console.log = function() {};
        console.info = function() {};
        console.debug = function() {};
    }
}

// Versão do sistema
document.addEventListener('DOMContentLoaded', function() {
    const versaoElements = document.querySelectorAll('#versao-sistema, .versao-sistema');
    versaoElements.forEach(el => {
        if (el) el.textContent = 'v' + SISTEMA.versao;
    });
});