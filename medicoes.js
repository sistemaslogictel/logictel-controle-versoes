// =====================================================
// PONTO DE ENTRADA DA APLICAÇÃO
// =====================================================

import { verificarSessao, fazerLogin, fazerLogout, validarSenha, gerarSenhaForte } from './auth.js';
import { aplicarMascaras, toggleSidebar, limparFiltros } from './utils.js';
import { mudarAba, carregarTodasListas, cancelarEdicao, irParaPrimeiraAbaAcessivel } from './navigation.js';

import { carregarDashApropriacao, carregarDashDON, carregarDashCRE, exportarExcelDON, exportarExcelStatus, exportarExcelCRE } from './dashboards.js';
import { carregarDCCards, irParaConsumo, irParaPaginaDC, filtrarDCCards, limparFiltrosDCCards, inicializarFiltrosDCCards } from './dccards.js';
import { carregarGestoresPorProjeto, controlarCamposNF, initFormConsumo, editarConsumo, excluirConsumo, exportarExcel, filtrarConsumos, limparFiltrosConsumo, irParaPaginaConsumo } from './consumo.js';
import { initFormMedicao, editarMedicao, excluirMedicao, filtrarMedicoes, limparFiltrosMedicoes, irParaPaginaMed, carregarHistoricoMedicoes, filtrarHistoricoMedicoes, limparFiltrosHistoricoMedicoes, irParaPaginaHistMed } from './medicoes.js';
import { carregarDatasLimites, initFormDataLimite, editarDataLimite, excluirDataLimite, atualizarTopbarDatasLimites, filtrarDatasLimites, limparFiltrosDatasLimites } from './datasLimites.js';

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
    // auth
    fazerLogin, fazerLogout, validarSenha, gerarSenhaForte,
    // navegação
    mudarAba, cancelarEdicao, toggleSidebar,
    limparFiltros: (tipo) => limparFiltros(tipo, {
        aprop: carregarDashApropriacao,
        don: carregarDashDON,
        cre: carregarDashCRE
    }),
    // dashboards
    carregarDashApropriacao, carregarDashDON, carregarDashCRE, exportarExcelDON, exportarExcelStatus, exportarExcelCRE,
    // DC cards
    carregarDCCards, irParaConsumo, irParaPaginaDC, filtrarDCCards, limparFiltrosDCCards, inicializarFiltrosDCCards,
    // consumo
    carregarGestoresPorProjeto, controlarCamposNF, initFormConsumo, editarConsumo, excluirConsumo, exportarExcel,
    filtrarConsumos, limparFiltrosConsumo, irParaPaginaConsumo,
    // medições
    editarMedicao, excluirMedicao, filtrarMedicoes, limparFiltrosMedicoes, irParaPaginaMed,
    carregarHistoricoMedicoes, filtrarHistoricoMedicoes, limparFiltrosHistoricoMedicoes, irParaPaginaHistMed,
    // datas limites
    editarDataLimite, excluirDataLimite, filtrarDatasLimites, limparFiltrosDatasLimites,
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