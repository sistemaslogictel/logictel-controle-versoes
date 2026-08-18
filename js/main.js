// =====================================================
// PONTO DE ENTRADA DA APLICAÇÃO
// =====================================================

import { verificarSessao, fazerLogin, fazerLogout, validarSenha, gerarSenhaForte } from './auth.js';
import { aplicarMascaras, toggleSidebar, limparFiltros } from './utils.js';
import { mudarAba, carregarTodasListas, cancelarEdicao, irParaPrimeiraAbaAcessivel } from './navigation.js';

import { 
    carregarDashApropriacao, 
    carregarDashDON, 
    carregarDashCRE, 
    carregarDashPendencias, 
    exportarExcelDON, 
    exportarExcelStatus, 
    exportarExcelCRE, 
    exportarExcelPendencias,
    exportarRelatorioCompleto
} from './dashboards.js';
import { carregarDCCards, irParaConsumo, irParaPaginaDC, filtrarDCCards, limparFiltrosDCCards, inicializarFiltrosDCCards } from './dccards.js';
import { carregarGestoresPorProjeto, controlarCamposNF, initFormConsumo, editarConsumo, excluirConsumo, exportarExcel, filtrarConsumos, limparFiltrosConsumo, irParaPaginaConsumo } from './consumo.js';
import { initFormMedicao, editarMedicao, excluirMedicao, filtrarMedicoes, limparFiltrosMedicoes, irParaPaginaMed, carregarHistoricoMedicoes, filtrarHistoricoMedicoes, limparFiltrosHistoricoMedicoes, irParaPaginaHistMed } from './medicoes.js';
import { carregarDatasLimites, initFormDataLimite, editarDataLimite, excluirDataLimite, atualizarTopbarDatasLimites, filtrarDatasLimites, limparFiltrosDatasLimites } from './datasLimites.js';
import { 
    carregarTutoriais, initFormTutorial, editarTutorial, excluirTutorial, 
    filtrarTutoriais, limparFiltrosTutoriais, irParaPaginaTutorial,
    carregarTutoriaisVisualizar, filtrarVisualizarTutoriais, 
    limparFiltrosVisualizarTutoriais, irParaPaginaVisualizarTutoriais
} from './tutoriais.js';

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
// Todas as funções que são chamadas diretamente do HTML (onclick, onchange, etc)
// precisam estar no objeto window para serem acessíveis globalmente.
window.fazerLogin = fazerLogin;
window.fazerLogout = fazerLogout;
window.validarSenha = validarSenha;
window.gerarSenhaForte = gerarSenhaForte;
window.mudarAba = mudarAba;
window.cancelarEdicao = cancelarEdicao;
window.toggleSidebar = toggleSidebar;
window.limparFiltros = (tipo) => limparFiltros(tipo, {
    aprop: carregarDashApropriacao,
    don: carregarDashDON,
    cre: carregarDashCRE,
    pend: carregarDashPendencias
});

// Dashboards
window.carregarDashApropriacao = carregarDashApropriacao;
window.carregarDashDON = carregarDashDON;
window.carregarDashCRE = carregarDashCRE;
window.carregarDashPendencias = carregarDashPendencias;
window.exportarExcelDON = exportarExcelDON;
window.exportarExcelStatus = exportarExcelStatus;
window.exportarExcelCRE = exportarExcelCRE;
window.exportarExcelPendencias = exportarExcelPendencias;
window.exportarRelatorioCompleto = exportarRelatorioCompleto; // <-- CORREÇÃO AQUI

// DC cards
window.carregarDCCards = carregarDCCards;
window.irParaConsumo = irParaConsumo;
window.irParaPaginaDC = irParaPaginaDC;
window.filtrarDCCards = filtrarDCCards;
window.limparFiltrosDCCards = limparFiltrosDCCards;
window.inicializarFiltrosDCCards = inicializarFiltrosDCCards;

// Consumo
window.carregarGestoresPorProjeto = carregarGestoresPorProjeto;
window.controlarCamposNF = controlarCamposNF;
window.initFormConsumo = initFormConsumo;
window.editarConsumo = editarConsumo;
window.excluirConsumo = excluirConsumo;
window.exportarExcel = exportarExcel;
window.filtrarConsumos = filtrarConsumos;
window.limparFiltrosConsumo = limparFiltrosConsumo;
window.irParaPaginaConsumo = irParaPaginaConsumo;

// Medições
window.editarMedicao = editarMedicao;
window.excluirMedicao = excluirMedicao;
window.filtrarMedicoes = filtrarMedicoes;
window.limparFiltrosMedicoes = limparFiltrosMedicoes;
window.irParaPaginaMed = irParaPaginaMed;
window.carregarHistoricoMedicoes = carregarHistoricoMedicoes;
window.filtrarHistoricoMedicoes = filtrarHistoricoMedicoes;
window.limparFiltrosHistoricoMedicoes = limparFiltrosHistoricoMedicoes;
window.irParaPaginaHistMed = irParaPaginaHistMed;

// Datas Limites
window.editarDataLimite = editarDataLimite;
window.excluirDataLimite = excluirDataLimite;
window.filtrarDatasLimites = filtrarDatasLimites;
window.limparFiltrosDatasLimites = limparFiltrosDatasLimites;

// Tutoriais
window.carregarTutoriais = carregarTutoriais;
window.initFormTutorial = initFormTutorial;
window.editarTutorial = editarTutorial;
window.excluirTutorial = excluirTutorial;
window.filtrarTutoriais = filtrarTutoriais;
window.limparFiltrosTutoriais = limparFiltrosTutoriais;
window.irParaPaginaTutorial = irParaPaginaTutorial;
window.carregarTutoriaisVisualizar = carregarTutoriaisVisualizar;
window.filtrarVisualizarTutoriais = filtrarVisualizarTutoriais;
window.limparFiltrosVisualizarTutoriais = limparFiltrosVisualizarTutoriais;
window.irParaPaginaVisualizarTutoriais = irParaPaginaVisualizarTutoriais;

// Cadastros
window.editarEmpresa = editarEmpresa;
window.excluirEmpresa = excluirEmpresa;
window.editarDiretor = editarDiretor;
window.excluirDiretor = excluirDiretor;
window.editarContrato = editarContrato;
window.excluirContrato = excluirContrato;
window.editarProjeto = editarProjeto;
window.excluirProjeto = excluirProjeto;
window.editarGestorLogictel = editarGestorLogictel;
window.excluirGestorLogictel = excluirGestorLogictel;
window.editarStatusDC = editarStatusDC;
window.excluirStatusDC = excluirStatusDC;
window.editarStatusMed = editarStatusMed;
window.excluirStatusMed = excluirStatusMed;
window.editarStatusNF = editarStatusNF;
window.excluirStatusNF = excluirStatusNF;

// Usuários
window.editarUsuario = editarUsuario;
window.excluirUsuario = excluirUsuario;

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
    initFormDataLimite();
    initFormTutorial();
}

function iniciarApp() {
    initFormListeners();

    if (verificarSessao()) {
        irParaPrimeiraAbaAcessivel();
        carregarTodasListas();
        aplicarMascaras();
    }
}

iniciarApp();
