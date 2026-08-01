// =====================================================
// COMPONENTES REUTILIZÁVEIS
// =====================================================

// Máscara para valor monetário
function mascaraMoeda(input) {
    if (!input) return;
    input.addEventListener('input', function(e) {
        let valor = this.value.replace(/\D/g, '');
        if (valor === '') { this.value = '0,00'; return; }
        valor = valor.replace(/^0+/, '');
        if (valor === '') valor = '0';
        while (valor.length < 3) { valor = '0' + valor; }
        let inteiro = valor.slice(0, -2);
        let centavos = valor.slice(-2);
        let inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        this.value = inteiroFormatado + ',' + centavos;
        this.setSelectionRange(this.value.length, this.value.length);
    });
    input.addEventListener('blur', function() {
        if (this.value === '' || this.value === '0,00') { this.value = '0,00'; }
    });
}

// Máscara para data
function mascaraData(input) {
    if (!input) return;
    input.addEventListener('input', function(e) {
        let valor = this.value.replace(/\D/g, '');
        if (valor.length > 8) valor = valor.slice(0, 8);
        let formatado = '';
        if (valor.length > 0) {
            formatado = valor.slice(0, 2);
            if (valor.length > 2) formatado += '/' + valor.slice(2, 4);
            if (valor.length > 4) formatado += '/' + valor.slice(4, 8);
        }
        this.value = formatado;
    });
}

function aplicarMascaras() {
    document.querySelectorAll('.money-input').forEach(function(el) {
        el.replaceWith(el.cloneNode(true));
    });
    document.querySelectorAll('.date-input').forEach(function(el) {
        el.replaceWith(el.cloneNode(true));
    });
    document.querySelectorAll('.money-input').forEach(mascaraMoeda);
    document.querySelectorAll('.date-input').forEach(mascaraData);
}

// =====================================================
// GERAR MENU DINÂMICO
// =====================================================

function gerarMenu(permissoes) {
    const desktopNav = document.getElementById('desktopNav');
    const mobileNav = document.getElementById('mobileNav');
    
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', area: 'dashboard', type: 'flyout', children: [
            { id: 'dashboard', label: 'Visão Geral de Saldos', area: 'dashboard' },
            { id: 'dash-apropriacao', label: 'Dashboard Apropriação', area: 'dash-apropriacao' },
            { id: 'dash-don', label: 'Dashboard DON', area: 'dash-don' }
        ]},
        { id: 'dcs', label: 'DC\'s', icon: 'dcs', area: 'dcs', type: 'link' },
        { id: 'medicoes', label: 'Medições', icon: 'medicoes', area: 'medicoes', type: 'flyout', children: [
            { id: 'cad-medicao', label: 'Cadastro de Medição', area: 'medicoes' },
            { id: 'cad-consumo', label: 'Consumo DC', area: 'consumos' }
        ]},
        { id: 'historicos', label: 'Históricos', icon: 'historico', area: 'historico-aprop', type: 'flyout', children: [
            { id: 'apropriacao-hist', label: 'Histórico Apropriação', area: 'historico-aprop' },
            { id: 'medicao-gestor-hist', label: 'Histórico Gestor', area: 'historico-gestor' }
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
        { id: 'atualizacoes', label: 'Atualizações', icon: 'atualizacoes', area: 'atualizacoes', type: 'link' }
    ];

    function temAcesso(item) {
        if (item.area === 'dashboard') return true;
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
            'atualizacoes': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>'
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
        if (item.area === 'dashboard') return true;
        if (!permissoes || permissoes.length === 0 || permissoes.includes('*')) return true;
        if (item.type === 'link') return permissoes.includes(item.area);
        if (item.type === 'flyout') return item.children.some(child => permissoes.includes(child.area));
        return false;
    });

    buildMenuHTML(desktopNav, desktopItems, false);
    buildMenuHTML(mobileNav, desktopItems, true);
}

// =====================================================
// NAVEGAÇÃO
// =====================================================

function mudarAba(nomeAba) {
    const areaMap = {
        'dashboard': 'dashboard',
        'dash-apropriacao': 'dash-apropriacao',
        'dash-don': 'dash-don',
        'dcs': 'dcs',
        'cad-medicao': 'medicoes',
        'cad-consumo': 'consumos',
        'apropriacao-hist': 'historico-aprop',
        'medicao-gestor-hist': 'historico-gestor',
        'adm-user': 'adm-user',
        'adm-empresa': 'adm-cliente',
        'adm-diretor': 'adm-cliente',
        'adm-contrato': 'adm-cliente',
        'adm-projeto': 'adm-logictel',
        'adm-gestor': 'adm-logictel',
        'adm-status-dc': 'adm-status',
        'adm-status-med': 'adm-status',
        'adm-status-nf': 'adm-status',
        'atualizacoes': 'atualizacoes'
    };
    const area = areaMap[nomeAba] || nomeAba;
    if (area !== 'dashboard' && !temPermissao(area)) {
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

function toggleSidebar() {
    document.getElementById('sidebarOverlay').classList.toggle('active');
    document.getElementById('sidebarMobile').classList.toggle('active');
}

// =====================================================
// VALIDAÇÃO DE SENHA
// =====================================================

function validarSenha() {
    const senha = document.getElementById('user-senha')?.value || '';
    const criterios = {
        tamanho: senha.length >= 8,
        maiuscula: /[A-Z]/.test(senha),
        minuscula: /[a-z]/.test(senha),
        numero: /[0-9]/.test(senha),
        especial: /[!@#$%^&*(),.?":{}|<>]/.test(senha)
    };

    const ids = {
        tamanho: 'criterio-tamanho',
        maiuscula: 'criterio-maiuscula',
        minuscula: 'criterio-minuscula',
        numero: 'criterio-numero',
        especial: 'criterio-especial'
    };

    let todosAtendidos = true;
    for (const [key, value] of Object.entries(criterios)) {
        const el = document.getElementById(ids[key]);
        if (el) {
            el.className = `criteria ${value ? 'met' : 'unmet'}`;
            el.innerHTML = `<span class="check">${value ? '✓' : '✕'}</span> ${getCriterioLabel(key)}`;
        }
        if (!value) todosAtendidos = false;
    }

    const submitBtn = document.getElementById('user-submit-btn');
    if (submitBtn) submitBtn.disabled = !todosAtendidos || !senha;
    return todosAtendidos;
}

function getCriterioLabel(key) {
    const labels = {
        tamanho: 'Mínimo 8 caracteres',
        maiuscula: '1 maiúscula',
        minuscula: '1 minúscula',
        numero: '1 número',
        especial: '1 caractere especial'
    };
    return labels[key] || key;
}

function gerarSenhaForte() {
    const maiusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const minusculas = 'abcdefghijklmnopqrstuvwxyz';
    const numeros = '0123456789';
    const especiais = '!@#$%^&*(),.?":{}|<>';
    const todos = maiusculas + minusculas + numeros + especiais;
    
    let senha = '';
    senha += maiusculas[Math.floor(Math.random() * maiusculas.length)];
    senha += minusculas[Math.floor(Math.random() * minusculas.length)];
    senha += numeros[Math.floor(Math.random() * numeros.length)];
    senha += especiais[Math.floor(Math.random() * especiais.length)];
    
    for (let i = 4; i < 12; i++) {
        senha += todos[Math.floor(Math.random() * todos.length)];
    }
    
    senha = senha.split('').sort(() => Math.random() - 0.5).join('');
    
    const input = document.getElementById('user-senha');
    if (input) {
        input.value = senha;
        validarSenha();
    }
}