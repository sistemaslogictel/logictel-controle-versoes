// =====================================================
// PONTO DE ENTRADA DA APLICAÇÃO
// =====================================================

import { verificarSessao, fazerLogin, fazerLogout, validarSenha, gerarSenhaForte } from './auth.js';
import { aplicarMascaras, toggleSidebar, limparFiltros } from './utils.js';
import { mudarAba, carregarTodasListas, cancelarEdicao } from './navigation.js';

import { carregarDashboard, carregarDashApropriacao, carregarDashDON } from './dashboards.js';
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
// EXPOSIÇÃO DAS FUNÇÕES USADAS EM ATRIBUTOS DO HTML
// =====================================================
Object.assign(window, {
    // auth
    fazerLogin, fazerLogout, validarSenha, gerarSenhaForte,
    // navegação
    mudarAba, cancelarEdicao, toggleSidebar,
    limparFiltros: (tipo) => limparFiltros(tipo, {
        dash: carregarDashboard,
        aprop: carregarDashApropriacao,
        don: carregarDashDON
    }),
    // dashboards
    carregarDashboard, carregarDashApropriacao, carregarDashDON,
    // DC cards
    carregarDCCards, irParaConsumo,
    // consumo
    carregarGestoresPorProjeto, controlarCamposNF, editarConsumo, excluirConsumo, exportarExcel,
    // medições
    editarMedicao, excluirMedicao,
    // histórico
    carregarApropriacaoHist, carregarMedicaoHist,
    // cadastros
    editarEmpresa, excluirEmpresa,
    editarDiretor, excluirDiretor,
    editarContrato, excluirContrato,
    editarProjeto, excluirProjeto,
    editarGestorLogictel, excluirGestorLogictel,
    editarStatusDC, excluirStatusDC,
    editarStatusMed, excluirStatusMed,
    editarStatusNF, excluirStatusNF,
    // usuários
    editarUsuario, excluirUsuario
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
// CONFIGURA O BOTÃO DE LOGIN VIA addEventListener
// =====================================================
function configurarBotaoLogin() {
    const loginBtn = document.getElementById('loginButton');
    if (loginBtn) {
        // Remove listeners antigos para evitar duplicação
        const novoBtn = loginBtn.cloneNode(true);
        loginBtn.parentNode.replaceChild(novoBtn, loginBtn);
        novoBtn.addEventListener('click', fazerLogin);
        console.log('✅ Botão de login configurado via addEventListener');
    } else {
        console.error('❌ Botão de login não encontrado!');
    }
}

// =====================================================
// BOOTSTRAP DA APLICAÇÃO
// =====================================================
function iniciarApp() {
    console.log('🚀 Iniciando aplicação...');
    
    initFormListeners();
    configurarBotaoLogin();

    if (verificarSessao()) {
        mudarAba('dashboard');
        carregarDashboard();
        carregarTodasListas();
        aplicarMascaras();
    }
}

// Scripts com type="module" já são deferidos
iniciarApp();
