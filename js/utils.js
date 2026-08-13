// =====================================================
// MÁSCARA DE VALOR (MOEDA)
// =====================================================
export function mascaraMoeda(input) {
    input.addEventListener('input', function (e) {
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
    input.addEventListener('blur', function () {
        if (this.value === '' || this.value === '0,00') { this.value = '0,00'; }
    });
    input.addEventListener('focus', function () {
        this.setSelectionRange(this.value.length, this.value.length);
    });
}

export function mascaraData(input) {
    input.addEventListener('input', function (e) {
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

export function aplicarMascaras() {
    document.querySelectorAll('.money-input').forEach(function (el) {
        el.replaceWith(el.cloneNode(true));
    });
    document.querySelectorAll('.date-input').forEach(function (el) {
        el.replaceWith(el.cloneNode(true));
    });
    document.querySelectorAll('.money-input').forEach(mascaraMoeda);
    document.querySelectorAll('.date-input').forEach(mascaraData);
}

export function valorParaNumero(valorFormatado) {
    if (!valorFormatado || valorFormatado === '' || valorFormatado === '0,00') return 0;
    // Remove pontos de milhar e substitui vírgula por ponto
    let valorLimpo = String(valorFormatado).replace(/\./g, '');
    valorLimpo = valorLimpo.replace(',', '.');
    const numero = parseFloat(valorLimpo);
    return isNaN(numero) ? 0 : numero;
}

// =====================================================
// PAGINAÇÃO (genérica, usada por DC's, Medições e Consumo DC)
// =====================================================
// Recorta a página atual de uma lista já filtrada/ordenada em memória.
export function paginar(lista, paginaAtual, itensPorPagina) {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return lista.slice(inicio, inicio + itensPorPagina);
}

// Gera o HTML dos controles (Anterior / Página X de Y / Próxima).
// `funcaoGlobal` é o nome (string) da função exposta em window que deve
// ser chamada ao trocar de página, ex: "irParaPaginaDC".
export function renderizarPaginacao(paginaAtual, totalItens, itensPorPagina, funcaoGlobal) {
    const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));
    if (totalPaginas <= 1) return '';
    return `
        <div class="pagination">
            <button type="button" class="btn-page" ${paginaAtual <= 1 ? 'disabled' : ''} onclick="${funcaoGlobal}(${paginaAtual - 1})">‹ Anterior</button>
            <span class="pagination-info">Página ${paginaAtual} de ${totalPaginas} <span class="pagination-total">(${totalItens} registro${totalItens === 1 ? '' : 's'})</span></span>
            <button type="button" class="btn-page" ${paginaAtual >= totalPaginas ? 'disabled' : ''} onclick="${funcaoGlobal}(${paginaAtual + 1})">Próxima ›</button>
        </div>
    `;
}

export function registrarUltimaAtualizacao() {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = String(agora.getFullYear()).slice(2);
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    const dataFormatada = `${dia}/${mes}/${ano}, ${horas}:${minutos}`;
    
    const badge = document.getElementById('badge-ultima-atualizacao');
    if (badge) {
        badge.innerText = dataFormatada;
    }
}

export function getMesesDoAno(ano) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const anoAtual = new Date().getFullYear();
    const mesAtual = new Date().getMonth();

    if (ano === anoAtual) {
        return meses.slice(0, mesAtual + 1);
    }
    return meses;
}

// =====================================================
// TOGGLE SIDEBAR (MOBILE)
// =====================================================
export function toggleSidebar() {
    document.getElementById('sidebarOverlay').classList.toggle('active');
    document.getElementById('sidebarMobile').classList.toggle('active');
}

// =====================================================
// LIMPAR FILTROS
// =====================================================
export function limparFiltros(tipo, callbacks) {
    if (tipo === 'don') {
        const ids = ['filt-don-projeto', 'filt-don-diretor', 'filt-don-ano', 'filt-don-mes'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (callbacks && callbacks.don) callbacks.don();
    } else if (tipo === 'aprop') {
        const ids = ['filt-aprop-gestor', 'filt-aprop-projeto', 'filt-aprop-ano', 'filt-aprop-mes'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (callbacks && callbacks.aprop) callbacks.aprop();
    } else if (tipo === 'cre') {
        const ids = ['filt-cre-gestor', 'filt-cre-projeto', 'filt-cre-ano', 'filt-cre-mes'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (callbacks && callbacks.cre) callbacks.cre();
    }
}

// =====================================================
// FLYOUTS DO MENU
// =====================================================
export function initFlyouts() {
    const wraps = Array.prototype.slice.call(document.querySelectorAll('[data-flyout]'));
    let closeTimer = null;
    const DELAY = 220;
    function closeAll(except) { wraps.forEach(function (w) { if (w !== except) w.classList.remove('is-open'); }); }
    wraps.forEach(function (wrap) {
        const trigger = wrap.querySelector('.flyout-trigger');
        wrap.addEventListener('mouseenter', function () {
            clearTimeout(closeTimer);
            closeAll(wrap);
            wrap.classList.add('is-open');
        });
        wrap.addEventListener('mouseleave', function () {
            closeTimer = setTimeout(function () { wrap.classList.remove('is-open'); }, DELAY);
        });
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            const isOpen = wrap.classList.contains('is-open');
            closeAll();
            if (!isOpen) wrap.classList.add('is-open');
        });
        wrap.addEventListener('focusin', function () {
            clearTimeout(closeTimer);
            closeAll(wrap);
            wrap.classList.add('is-open');
        });
    });
    document.addEventListener('click', function (e) {
        const insideAny = wraps.some(function (w) { return w.contains(e.target); });
        if (!insideAny) closeAll();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAll();
    });
}