// =====================================================
// CONEXÃO COM BANCO DE DADOS
// =====================================================

const supabaseClient = supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// Funções auxiliares para consultas seguras
function valorParaNumero(valorFormatado) {
    if (!valorFormatado) return 0;
    return parseFloat(String(valorFormatado).replace(/\./g, '').replace(',', '.'));
}

function registrarUltimaAtualizacao() {
    const agora = new Date().toLocaleString('pt-BR');
    const badge = document.getElementById('badge-ultima-atualizacao');
    if (badge) {
        badge.innerText = `Última atualização: ${agora}`;
    }
}

function getMeses() {
    return ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
}

function getAnos() {
    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let i = anoAtual - 2; i <= anoAtual + 1; i++) {
        anos.push(i);
    }
    return anos;
}

// Função para executar consultas com timeout
async function executarConsulta(promise, timeoutMs = 30000) {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tempo limite da consulta excedido')), timeoutMs);
    });
    return Promise.race([promise, timeout]);
}