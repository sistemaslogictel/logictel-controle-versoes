import { temPermissao } from './session.js';
import { aplicarMascaras, initFlyouts } from './utils.js';
import { setPermissoes } from './usuarios.js';

import { carregarDashApropriacao, carregarDashDON, carregarDashCRE } from './dashboards.js';
import { carregarDCCards } from './dccards.js';
import { carregarFiltroStatus, carregarSelectStatus, carregarSelectGestores, carregarSelectDiretores, carregarSelectEmpresas, carregarSelectProjetos, carregarSelectContratos, carregarFiltros, carregarStatusDCCustom } from './selects.js';
import { carregarMedicoes, carregarHistoricoMedicoes } from './medicoes.js';
import { carregarConsumos } from './consumo.js';
import { carregarUsuarios } from './usuarios.js';
import {
    carregarEmpresas, carregarDiretores, carregarContratos, carregarProjetos,
    carregarGestoresLogictel, carregarStatusDC, carregarStatusMed, carregarStatusNF
} from './cadastros.js';
import { carregarDatasLimites, atualizarTopbarDatasLimites } from './datasLimites.js';

// =====================================================
// GERAR MENU DINÂMICO
// =====================================================
export function gerarMenu(permissoes) {
    const desktopNav = document.getElementById('desktopNav');
    const mobileNav = document.getElementById('mobileNav');

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', area: 'dash-don', type: 'flyout', children: [
            { id: 'dash-don', label: 'Dashboard DON', area: 'dash-don' },
            { id: 'dash-apropriacao', label: 'Dashboard Status', area: 'dash-apropriacao' },
            { id: 'dash-cre', label: 'Tratitando CRE', area: 'dash-cre' }
        ]},
        { id: 'medicoes', label: 'Medições', icon: 'medicoes', area: 'medicoes', type: 'flyout', children: [
            { id: 'cad-medicao', label: 'Cadastro de Medição', area: 'medicoes' },
            { id: 'historico-medicoes', label: 'Histórico das Medições', area: 'medicoes' }
        ]},
        { id: 'dcs', label: 'DC\'s', icon: 'dcs', area: 'dcs', type: 'flyout', children: [
            { id: 'cad-consumo', label: 'Consumo DC', area: 'consumos' },
            { id: 'historico-consumo-dcs', label: 'Histórico Consumo das DCs', area: 'consumos' },
            { id: 'dcs', label: 'DC\'s', area: 'dcs' }
        ]},
        { id: 'cadastros-adm', label: 'Cadastro ADM', icon: 'adm', area: 'adm-user', type: 'flyout', children: [
            { id: 'adm-user', label: 'Usuário', area: 'adm-user' }
        ]},
        { id: 'cadastros-cliente', label: 'Cadastro Cliente', icon: 'cliente', area: 'adm-cliente', type: 'flyout', children: [
            { id: 'adm-empresa', label: 'Empresa', area: 'adm-cliente' },
            { id: 'adm-diretor', label: 'Diretor Cliente', area: 'adm-cliente' },
            { id: 'adm-contrato', label: 'Contrato', area: 'adm-cliente' }
        ]},
        { id: 'cadastros-logictel', label: 'Cadastro Logictel', icon: 'logictel', area: 'adm-logictel', type: 'flyout', children: [
            { id: 'adm-projeto', label: 'Projeto', area: 'adm-logictel' },
            { id: 'adm-gestor', label: 'Gestor Logictel', area: 'adm-logictel' }
        ]},
        { id: 'cadastros-status', label: 'Cadastro Status', icon: 'status', area: 'adm-status', type: 'flyout', children: [
            { id: 'adm-status-dc', label: 'Status DC', area: 'adm-status' },
            { id: 'adm-status-med', label: 'Status Medição', area: 'adm-status' },
            { id: 'adm-status-nf', label: 'Status NF', area: 'adm-status' }
        ]},
        { id: 'cadastros-datas', label: 'Datas Limites', icon: 'datas', area: 'adm-datas', type: 'flyout', children: [
            { id: 'adm-datas-limites', label: 'Datas Limites', area: 'adm-datas' }
        ]}
    ];

    function temAcesso(item) {
        if (!permissoes || permissoes.length === 0 || permissoes.includes('*')) return true;
        if (item.type === 'link') return permissoes.includes(item.area);
        if (item.type === 'flyout') return item.children.some(child => permissoes.includes(child.area));
        return false;
    }

    function getIcon(name) {
        const icons = {
            'dashboard': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
            'dcs': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
            'medicoes': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 16l13-13 5 5-13 13H3v-5z"/><path d="M13.5 6.5l4 4"/><path d="M9 11l1.5 1.5"/><path d="M6 14l1.5 1.5"/></svg>',
            'historico': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
            'adm': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l-.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
            'cliente': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
            'logictel': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
            'status': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
            'atualizacoes': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
            'datas': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
        };
        return icons[name] || '';
    }

    function buildMenuHTML(container, items, isMobile) {
        let html = '';
        let hasVisibleItems = false;

        items.forEach(item => {
            if (!temAcesso(item)) return;
            hasVisibleItems = true;

            if (item.type === 'link') {
                const activeClass = item.id === 'dashboard' ? ' is-active' : '';
                html += `
                    <button onclick="mudarAba('${item.id}')" id="btn-${item.id}${isMobile ? '-mobile' : ''}" class="sidebar-link js-nav${activeClass}">
                        ${getIcon(item.icon)}
                        <span>${item.label}</span>
                    </button>
                `;
            } else if (item.type === 'flyout') {
                const hasAccessibleChild = item.children.some(child => {
                    if (!permissoes || permissoes.length === 0 || permissoes.includes('*')) return true;
                    return permissoes.includes(child.area);
                });
                if (!hasAccessibleChild) return;

                html += `
                    <div class="flyout-wrap" data-flyout>
                        <button class="flyout-trigger">
                            <span class="lbl">
                                ${getIcon(item.icon)}
                                ${item.label}
                            </span>
                            <span class="chev"></span>
                        </button>
                        <div class="flyout" role="menu">
                            <div class="flyout-section-title">${item.label}</div>
                `;

                item.children.forEach(child => {
                    if (!permissoes || permissoes.length === 0 || permissoes.includes('*') || permissoes.includes(child.area)) {
                        html += `
                            <button onclick="mudarAba('${child.id}')" id="btn-${child.id}${isMobile ? '-mobile' : ''}" class="flyout-link js-nav">${child.label}</button>
                        `;
                    }
                });

                html += `
                        </div>
                    </div>
                `;
            }
        });

        if (hasVisibleItems) {
            container.innerHTML = `
                <div class="nav-section-label">Menu</div>
                ${html}
            `;
        } else {
            container.innerHTML = '<div class="nav-section-label">Sem acesso</div>';
        }
    }

    const desktopItems = menuItems.filter(item => {
        if (!permissoes || permissoes.length === 0 || permissoes.includes('*')) return true;
        if (item.type === 'link') return permissoes.includes(item.area);
        if (item.type === 'flyout') return item.children.some(child => permissoes.includes(child.area));
        return false;
    });

    buildMenuHTML(desktopNav, desktopItems, false);
    buildMenuHTML(mobileNav, desktopItems, true);

    initFlyouts();
}

// =====================================================
// MAPA DE ABAS -> ÁREA DE PERMISSÃO
// =====================================================
const AREA_MAP = {
    'dash-don': 'dash-don',
    'dash-apropriacao': 'dash-apropriacao',
    'dash-cre': 'dash-cre',
    'cad-medicao': 'medicoes',
    'historico-medicoes': 'medicoes',
    'cad-consumo': 'consumos',
    'historico-consumo-dcs': 'consumos',
    'dcs': 'dcs',
    'adm-user': 'adm-user',
    'adm-empresa': 'adm-cliente',
    'adm-diretor': 'adm-cliente',
    'adm-contrato': 'adm-cliente',
    'adm-projeto': 'adm-logictel',
    'adm-gestor': 'adm-logictel',
    'adm-status-dc': 'adm-status',
    'adm-status-med': 'adm-status',
    'adm-status-nf': 'adm-status',
    'adm-datas-limites': 'adm-datas'
};

// Ordem de prioridade usada para decidir em qual aba cair logo após o login
const ORDEM_ABAS_PADRAO = Object.keys(AREA_MAP);

// =====================================================
// NAVEGAÇÃO ENTRE ABAS
// =====================================================
export function mudarAba(nomeAba) {
    const area = AREA_MAP[nomeAba] || nomeAba;
    if (!temPermissao(area)) {
        alert('Você não tem permissão para acessar esta área.');
        return;
    }
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.js-nav').forEach(el => el.classList.remove('is-active'));
    const target = document.getElementById('tab-' + nomeAba);
    if (target) target.classList.add('active');
    const btnAtivo = document.getElementById('btn-' + nomeAba);
    if (btnAtivo) btnAtivo.classList.add('is-active');
    const btnMobile = document.getElementById('btn-' + nomeAba + '-mobile');
    if (btnMobile) btnMobile.classList.add('is-active');
    carregarDadosAba(nomeAba);
}

export function carregarDadosAba(nomeAba) {
    if (nomeAba === 'dash-apropriacao') carregarDashApropriacao();
    else if (nomeAba === 'dash-don') carregarDashDON();
    else if (nomeAba === 'dash-cre') carregarDashCRE();
    else if (nomeAba === 'cad-medicao') {
        carregarMedicoes();
        carregarSelectProjetos('filt-med-projeto');
        carregarSelectDiretores('filt-med-diretor');
        carregarSelectProjetos('med-projeto');
        carregarSelectGestores('med-gestor', 'gestores_logictel');
        carregarSelectDiretores('med-diretor');
        carregarSelectStatus('med-status', 'status_medicao');
    }
    else if (nomeAba === 'historico-medicoes') {
        carregarHistoricoMedicoes();
        carregarSelectProjetos('filt-hist-med-projeto');
        carregarSelectDiretores('filt-hist-med-diretor');
        carregarSelectStatus('filt-hist-med-status', 'status_medicao');
    }
    else if (nomeAba === 'cad-consumo') {
        carregarStatusDCCustom();
        carregarSelectStatus('dc-status-nf', 'status_nf');
        carregarSelectGestores('dc-gestor', 'gestores_logictel');
        carregarSelectDiretores('dc-diretor');
        carregarSelectEmpresas('dc-empresa');
        carregarSelectProjetos('dc-projeto');
        carregarConsumos();
    }
    else if (nomeAba === 'historico-consumo-dcs') {
        carregarConsumos();
        carregarSelectProjetos('filt-consumo-projeto');
        carregarSelectDiretores('filt-consumo-diretor');
        carregarStatusDCCustom('filt-consumo-status-dc');
        carregarSelectStatus('filt-consumo-status-nf', 'status_nf');
    }
    else if (nomeAba === 'dcs') { 
        carregarDCCards(); 
        carregarFiltroStatus();
        carregarSelectProjetos('filt-dcs-projeto');
        carregarSelectGestores('filt-dcs-gestor', 'gestores_logictel');
    }
    else if (nomeAba === 'adm-user') carregarUsuarios();
    else if (nomeAba === 'adm-empresa') { carregarEmpresas(); carregarSelectEmpresas('empresa'); }
    else if (nomeAba === 'adm-diretor') { carregarDiretores(); carregarSelectEmpresas('diretor-empresa'); }
    else if (nomeAba === 'adm-contrato') { carregarContratos(); carregarSelectEmpresas('contrato-empresa'); carregarSelectDiretores('contrato-diretor'); }
    else if (nomeAba === 'adm-projeto') { carregarProjetos(); carregarSelectProjetos('gestor-projeto'); }
    else if (nomeAba === 'adm-gestor') { carregarGestoresLogictel(); carregarSelectProjetos('gestor-projeto'); }
    else if (nomeAba === 'adm-status-dc') carregarStatusDC();
    else if (nomeAba === 'adm-status-med') { carregarStatusMed(); carregarSelectStatus('med-status', 'status_medicao'); }
    else if (nomeAba === 'adm-status-nf') carregarStatusNF();
    else if (nomeAba === 'adm-datas-limites') carregarDatasLimites();
}

export function irParaPrimeiraAbaAcessivel() {
    for (const nomeAba of ORDEM_ABAS_PADRAO) {
        const area = AREA_MAP[nomeAba];
        if (temPermissao(area)) {
            mudarAba(nomeAba);
            return;
        }
    }
}

export function carregarTodasListas() {
    carregarMedicoes();
    carregarHistoricoMedicoes();
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
    carregarDatasLimites();
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
    carregarSelectGestores('dc-gestor', 'gestores_logictel');
    carregarSelectGestores('med-gestor', 'gestores_logictel');
    carregarFiltros();
    carregarDCCards();
    carregarStatusDCCustom();
    carregarFiltroStatus();
    carregarSelectProjetos('filt-med-projeto');
    carregarSelectDiretores('filt-med-diretor');
    carregarSelectStatus('filt-med-status', 'status_medicao');
    carregarSelectProjetos('filt-hist-med-projeto');
    carregarSelectDiretores('filt-hist-med-diretor');
    carregarSelectStatus('filt-hist-med-status', 'status_medicao');
    carregarSelectProjetos('filt-consumo-projeto');
    carregarSelectDiretores('filt-consumo-diretor');
    carregarStatusDCCustom('filt-consumo-status-dc');
    carregarSelectStatus('filt-consumo-status-nf', 'status_nf');
    carregarSelectProjetos('filt-dcs-projeto');
    carregarSelectGestores('filt-dcs-gestor', 'gestores_logictel');
    carregarFiltroStatus();
    atualizarTopbarDatasLimites();
}

export function cancelarEdicao(tipo) {
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
        'statusnf': 'statusnf',
        'datalimite': 'datalimite'
    };
    const prefixo = prefixos[tipo] || tipo;
    document.getElementById(prefixo + '-edit-id').value = '';
    const form = document.getElementById('form-' + prefixo);
    if (form) form.reset();
    const cancelBtn = document.getElementById(prefixo + '-cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (tipo === 'user') {
        setPermissoes([]);
        document.getElementById('user-submit-btn').disabled = true;
    }
    document.getElementById('campos-extras-consumo').classList.remove('visible');
    aplicarMascaras();
    carregarTodasListas();
}