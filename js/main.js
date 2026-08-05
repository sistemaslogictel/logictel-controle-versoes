// =====================================================
// PONTO DE ENTRADA DA APLICAÇÃO
// =====================================================
// Este arquivo importa todos os módulos e expõe no `window` apenas
// as funções que o HTML precisa chamar via onclick/onchange/oninput
// (o próprio index.html continua usando esses atributos inline,
// então as funções precisam existir no escopo global do navegador).

import { verificarSessao, fazerLogin, fazerLogout, validarSenha, gerarSenhaForte } from './auth.js';
import { aplicarMascaras, toggleSidebar, limparFiltros } from './utils.js';
import { mudarAba, carregarTodasListas, cancelarEdicao, irParaPrimeiraAbaAcessivel } from './navigation.js';

import { carregarDashApropriacao, carregarDashDON } from './dashboards.js';
import { carregarDCCards, irParaConsumo } from './dccards.js';
import { carregarGestoresPorProjeto, controlarCamposNF, initFormConsumo, editarConsumo, excluirConsumo, exportarExcel } from './consumo.js';
import { initFormMedicao, editarMedicao, excluirMedicao } from './medicoes.js';
import { carregarApropriacaoHist, carregarMedicaoHist } from './historico.js';

import {
    initFormEmpresa, editarEmpresa, excluirEmpresa,
    initFormDiretor, editarDiretor, excluirDiretor,
    initFormContrato, editarContrato, excluirContrato,
    initFormProjeto, editarProjeto, excluirProjeto,
    initFormGestor, editarGestorLogictel, excluirGestorLogictel,
    initFormStatusDC, editarStatusDC, excluirStatusDC,
    initFormStatusMed, editarStatusMed, excluirStatusMed,
    initFormStatusNF, editarStatusNF, excluirStatusNF
} from './cadastros.js';

import { initFormUsuario, editarUsuario, excluirUsuario } from './usuarios.js';

// =====================================================
// EXPOSIÇÃO DAS FUNÇÕES USADAS EM ATRIBUTOS onclick/onchange/oninput DO HTML
// =====================================================
Object.assign(window, {
    // AUTH - FUNÇÕES DE LOGIN (CRÍTICO PARA O FUNCIONAMENTO)
    fazerLogin,
    fazerLogout,
    validarSenha,
    gerarSenhaForte,
    
    // NAVEGAÇÃO
    mudarAba,
    cancelarEdicao,
    toggleSidebar,
    limparFiltros: (tipo) => limparFiltros(tipo, {
        aprop: carregarDashApropriacao,
        don: carregarDashDON
    }),
    
    // DASHBOARDS
    carregarDashApropriacao,
    carregarDashDON,
    
    // DC CARDS
    carregarDCCards,
    irParaConsumo,
    
    // CONSUMO
    carregarGestoresPorProjeto,
    controlarCamposNF,
    editarConsumo,
    excluirConsumo,
    exportarExcel,
    
    // MEDIÇÕES
    editarMedicao,
    excluirMedicao,
    
    // HISTÓRICO
    carregarApropriacaoHist,
    carregarMedicaoHist,
    
    // CADASTROS - EMPRESA
    editarEmpresa,
    excluirEmpresa,
    
    // CADASTROS - DIRETOR
    editarDiretor,
    excluirDiretor,
    
    // CADASTROS - CONTRATO
    editarContrato,
    excluirContrato,
    
    // CADASTROS - PROJETO
    editarProjeto,
    excluirProjeto,
    
    // CADASTROS - GESTOR
    editarGestorLogictel,
    excluirGestorLogictel,
    
    // CADASTROS - STATUS DC
    editarStatusDC,
    excluirStatusDC,
    
    // CADASTROS - STATUS MEDIÇÃO
    editarStatusMed,
    excluirStatusMed,
    
    // CADASTROS - STATUS NF
    editarStatusNF,
    excluirStatusNF,
    
    // USUÁRIOS
    editarUsuario,
    excluirUsuario
});

// =====================================================
// INICIALIZAÇÃO DOS LISTENERS DE FORMULÁRIO
// =====================================================
function initFormListeners() {
    initFormMedicao();
    initFormConsumo();
    initFormEmpresa();
    initFormDiretor();
    initFormContrato();
    initFormProjeto();
    initFormGestor();
    initFormStatusDC();
    initFormStatusMed();
    initFormStatusNF();
    initFormUsuario();
}

// =====================================================
// BOOTSTRAP DA APLICAÇÃO
// =====================================================
function iniciarApp() {
    // Inicializa todos os listeners dos formulários
    initFormListeners();

    // Verifica se já existe uma sessão ativa
    if (verificarSessao()) {
        // Se estiver logado, vai para a primeira aba acessível
        irParaPrimeiraAbaAcessivel();
        // Carrega todas as listas
        carregarTodasListas();
        // Aplica as máscaras de input
        aplicarMascaras();
    }
}

// =====================================================
// INICIALIZAÇÃO ADICIONAL - GARANTIR QUE O LOGIN FUNCIONE
// =====================================================
// Como o HTML usa onsubmit="return fazerLogin(event)", precisamos garantir
// que a função esteja disponível no window ANTES do formulário ser submetido.
// O Object.assign(window, {...}) já faz isso, mas vamos garantir também
// com uma verificação extra.

// Verifica se o DOM já está carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Garante que fazerLogin está disponível
        if (typeof window.fazerLogin !== 'function') {
            console.warn('⚠️ fazerLogin não está disponível no window. Reforçando...');
            window.fazerLogin = fazerLogin;
        }
        iniciarApp();
    });
} else {
    // DOM já carregado
    iniciarApp();
}

// =====================================================
// EXPORTAÇÃO PARA DEBUG (opcional)
// =====================================================
console.log('✅ Sistema Financeiro - main.js carregado com sucesso!');
console.log('📌 Funções disponíveis globalmente:', Object.keys(window).filter(key => 
    typeof window[key] === 'function' && 
    ['fazerLogin', 'fazerLogout', 'mudarAba', 'carregarDashDON', 'carregarDashApropriacao'].includes(key)
));
