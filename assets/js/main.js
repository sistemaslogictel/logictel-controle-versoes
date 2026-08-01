// =====================================================
// ARQUIVO PRINCIPAL - INICIALIZAÇÃO DO SISTEMA
// =====================================================

// Versão do sistema
const VERSAO_SISTEMA = '0.0.1';

// Inicialização do sistema
document.addEventListener('DOMContentLoaded', function() {
    // Exibir versão no sistema
    const versaoElements = document.querySelectorAll('.versao-sistema, #versao-sistema');
    versaoElements.forEach(el => {
        if (el) el.textContent = 'v' + VERSAO_SISTEMA;
    });

    // Verificar sessão
    if (verificarSessao()) {
        // Carregar dados iniciais
        setTimeout(function() {
            mudarAba('dashboard');
            carregarDashboard();
            carregarTodasListas();
            aplicarMascaras();
        }, 100);
    }

    // Configurar eventos globais
    configurarEventosGlobais();
});

// =====================================================
// EVENTOS GLOBAIS
// =====================================================

function configurarEventosGlobais() {
    // Fechar sidebar ao clicar fora
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebarMobile');
        const overlay = document.getElementById('sidebarOverlay');
        const toggleBtn = document.querySelector('.mobile-menu-toggle');
        
        if (sidebar && sidebar.classList.contains('active')) {
            if (!sidebar.contains(e.target) && !toggleBtn?.contains(e.target)) {
                toggleSidebar();
            }
        }
    });

    // Fechar flyouts ao clicar fora
    document.addEventListener('click', function(e) {
        const flyouts = document.querySelectorAll('.flyout-wrap');
        let clickedInside = false;
        flyouts.forEach(f => {
            if (f.contains(e.target)) clickedInside = true;
        });
        if (!clickedInside) {
            flyouts.forEach(f => f.classList.remove('is-open'));
        }
    });

    // Tecla ESC fecha flyouts e sidebar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.flyout-wrap').forEach(f => f.classList.remove('is-open'));
            if (document.getElementById('sidebarMobile')?.classList.contains('active')) {
                toggleSidebar();
            }
        }
    });

    // Prevenir envio de formulários com Enter acidentalmente
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const target = e.target;
                if (target.tagName === 'INPUT' && target.type !== 'submit') {
                    e.preventDefault();
                }
            }
        });
    });
}

// =====================================================
// FUNÇÕES DE CARREGAMENTO DE DADOS POR ABA
// =====================================================

function carregarDadosAba(nomeAba) {
    const loadingElement = document.querySelector(`#tab-${nomeAba} .loading-indicator`);
    if (loadingElement) loadingElement.style.display = 'block';

    switch(nomeAba) {
        case 'dashboard':
            carregarDashboard();
            break;
        case 'dash-apropriacao':
            carregarDashApropriacao();
            break;
        case 'dash-don':
            carregarDashDON();
            break;
        case 'dcs':
            carregarDCCards();
            break;
        case 'apropriacao-hist':
            carregarApropriacaoHist();
            break;
        case 'medicao-gestor-hist':
            carregarMedicaoHist();
            break;
        case 'cad-medicao':
            carregarMedicoes();
            break;
        case 'cad-consumo':
            carregarConsumos();
            carregarSelectStatus('dc-status-dc', 'status_dc');
            carregarSelectStatus('dc-status-nf', 'status_nf');
            carregarSelectGestores('dc-gestor', 'gestores_logictel');
            carregarSelectDiretores('dc-diretor');
            carregarSelectEmpresas('dc-empresa');
            carregarSelectProjetos('dc-projeto');
            break;
        case 'adm-user':
            carregarUsuarios();
            break;
        case 'adm-empresa':
            carregarEmpresas();
            carregarSelectEmpresas('empresa');
            break;
        case 'adm-diretor':
            carregarDiretores();
            carregarSelectEmpresas('diretor-empresa');
            break;
        case 'adm-contrato':
            carregarContratos();
            carregarSelectEmpresas('contrato-empresa');
            carregarSelectDiretores('contrato-diretor');
            break;
        case 'adm-projeto':
            carregarProjetos();
            carregarSelectProjetos('gestor-projeto');
            break;
        case 'adm-gestor':
            carregarGestoresLogictel();
            carregarSelectProjetos('gestor-projeto');
            break;
        case 'adm-status-dc':
            carregarStatusDC();
            break;
        case 'adm-status-med':
            carregarStatusMed();
            carregarSelectStatus('med-status', 'status_medicao');
            break;
        case 'adm-status-nf':
            carregarStatusNF();
            break;
        case 'atualizacoes':
            carregarLogsAtualizacoes();
            break;
        default:
            console.warn('Aba não reconhecida:', nomeAba);
    }

    if (loadingElement) loadingElement.style.display = 'none';
}

// =====================================================
// FUNÇÃO PARA CARREGAR TODAS AS LISTAS
// =====================================================

function carregarTodasListas() {
    carregarMedicoes();
    carregarConsumos();
    carregarUsuarios();
    carregarEmpresas();
    carregarDiretores();
    carregarContratos();
    carregarProjetos();
    carregarGestoresLogictel();
    carregarStatusDC();
    carregarStatusMed();
    carregarStatusNF();
    
    carregarSelectEmpresas('contrato-empresa');
    carregarSelectEmpresas('projeto-empresa');
    carregarSelectEmpresas('diretor-empresa');
    carregarSelectEmpresas('dc-empresa');
    carregarSelectEmpresas('med-empresa');
    
    carregarSelectDiretores('contrato-diretor');
    carregarSelectDiretores('projeto-diretor');
    carregarSelectDiretores('dc-diretor');
    carregarSelectDiretores('med-diretor');
    
    carregarSelectContratos('projeto-contrato');
    carregarSelectProjetos('dc-projeto');
    carregarSelectProjetos('med-projeto');
    carregarSelectProjetos('gestor-projeto');
    
    carregarSelectStatus('dc-status-dc', 'status_dc');
    carregarSelectStatus('dc-status-nf', 'status_nf');
    carregarSelectStatus('med-status', 'status_medicao');
    carregarSelectStatus('filt-dcs-status', 'status_dc');
    
    carregarSelectGestores('dc-gestor', 'gestores_logictel');
    carregarSelectGestores('med-gestor', 'gestores_logictel');
    
    carregarFiltros();
    carregarDCCards();
    carregarLogsAtualizacoes();
}

// =====================================================
// FUNÇÃO PARA CANCELAR EDIÇÃO
// =====================================================

function cancelarEdicao(tipo) {
    const prefixos = {
        'med': 'med',
        'consumo': 'consumo',
        'user': 'user',
        'empresa': 'empresa',
        'diretor': 'diretor',
        'contrato': 'contrato',
        'projeto': 'projeto',
        'gestor': 'gestor',
        'statusdc': 'statusdc',
        'statusmed': 'statusmed',
        'statusnf': 'statusnf'
    };
    const prefixo = prefixos[tipo] || tipo;
    
    const editId = document.getElementById(prefixo + '-edit-id');
    if (editId) editId.value = '';
    
    const form = document.getElementById('form-' + prefixo);
    if (form) form.reset();
    
    const cancelBtn = document.getElementById(prefixo + '-cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    if (tipo === 'user') {
        setPermissoes([]);
        const submitBtn = document.getElementById('user-submit-btn');
        if (submitBtn) submitBtn.disabled = true;
    }
    
    const extras = document.getElementById('campos-extras-consumo');
    if (extras) extras.classList.remove('visible');
    
    aplicarMascaras();
    carregarTodasListas();
}

// =====================================================
// LIMPAR FILTROS
// =====================================================

function limparFiltros(tipo) {
    const filtros = {
        'dash': ['filt-dash-gestor', 'filt-dash-projeto', 'filt-dash-ano'],
        'aprop': ['filt-aprop-gestor', 'filt-aprop-projeto', 'filt-aprop-ano'],
        'don': ['filt-don-gestor', 'filt-don-projeto', 'filt-don-ano']
    };
    const ids = filtros[tipo] || [];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    if (tipo === 'dash') carregarDashboard();
    else if (tipo === 'aprop') carregarDashApropriacao();
    else if (tipo === 'don') carregarDashDON();
}

// =====================================================
// PERMISSÕES
// =====================================================

function getPermissoes() {
    const checks = document.querySelectorAll('.permission-check:checked');
    return Array.from(checks).map(c => c.value);
}

function setPermissoes(permissoes) {
    document.querySelectorAll('.permission-check').forEach(c => {
        c.checked = permissoes.includes(c.value);
    });
}