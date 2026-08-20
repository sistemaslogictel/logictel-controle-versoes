import { supabaseClient } from './config.js';
import { aplicarMascaras, paginar, renderizarPaginacao } from './utils.js';

// =====================================================
// VARIÁVEIS GLOBAIS
// =====================================================
let _todasPaginas = [];
let _todasSecoes = [];
let _paginaAtualPagina = 1;
let _paginaAtualVisualizar = 1;
const ITENS_POR_PAGINA = 12;

// =====================================================
// PÁGINAS DE TUTORIAIS (CRUD)
// =====================================================

// Carregar todas as páginas
export async function carregarPaginasTutoriais() {
    const tbody = document.getElementById('tabela-paginas-tutoriais');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Carregando páginas...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('tutoriais_paginas')
            .select('*')
            .order('ordem', { ascending: true });

        if (error) {
            console.error('Erro ao carregar páginas:', error);
            tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar: ${error.message}</td></tr>`;
            return;
        }

        _todasPaginas = data || [];
        _paginaAtualPagina = 1;
        renderizarTabelaPaginas();
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// Renderizar tabela de páginas
function renderizarTabelaPaginas() {
    const tbody = document.getElementById('tabela-paginas-tutoriais');
    if (!tbody) return;

    const filtro = (document.getElementById('filt-pagina-titulo')?.value || '').toLowerCase().trim();
    let dados = _todasPaginas;
    if (filtro) {
        dados = dados.filter(p => String(p.titulo || '').toLowerCase().includes(filtro));
    }

    const paginacaoEl = document.getElementById('paginas-tutoriais-pagination');

    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Nenhuma página cadastrada.</td></tr>';
        if (paginacaoEl) paginacaoEl.innerHTML = '';
        return;
    }

    const totalPaginas = Math.max(1, Math.ceil(dados.length / ITENS_POR_PAGINA));
    if (_paginaAtualPagina > totalPaginas) _paginaAtualPagina = totalPaginas;
    const pagina = paginar(dados, _paginaAtualPagina, ITENS_POR_PAGINA);

    tbody.innerHTML = '';
    pagina.forEach(p => {
        tbody.innerHTML += `
            <tr class="td-row">
                <td style="font-weight:600;">${p.titulo || '-'}</td>
                <td>${p.ordem || 0}</td>
                <td>
                    <button onclick="editarPaginaTutorial(${p.id})" class="btn-edit" style="font-size:9px; padding:3px 8px;">Editar</button>
                    <button onclick="excluirPaginaTutorial(${p.id})" class="btn-danger" style="font-size:9px; padding:3px 8px;">Excluir</button>
                </td>
                <td>
                    <button onclick="carregarSecoesPagina(${p.id})" class="btn-primary" style="font-size:9px; padding:3px 8px;">Gerenciar Seções</button>
                </td>
            </tr>`;
    });

    if (paginacaoEl) {
        paginacaoEl.innerHTML = renderizarPaginacao(_paginaAtualPagina, dados.length, ITENS_POR_PAGINA, 'irParaPaginaPaginaTutorial');
    }
}

// Ir para página específica
export function irParaPaginaPaginaTutorial(pagina) {
    _paginaAtualPagina = pagina;
    renderizarTabelaPaginas();
}

// Filtrar páginas
export function filtrarPaginasTutoriais() {
    _paginaAtualPagina = 1;
    renderizarTabelaPaginas();
}

export function limparFiltrosPaginasTutoriais() {
    document.getElementById('filt-pagina-titulo').value = '';
    _paginaAtualPagina = 1;
    renderizarTabelaPaginas();
}

// Inicializar formulário de página
export function initFormPaginaTutorial() {
    const form = document.getElementById('form-pagina-tutorial');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('pagina-edit-id').value;
        const titulo = document.getElementById('pagina-titulo').value.trim();
        const ordem = parseInt(document.getElementById('pagina-ordem').value) || 0;

        if (!titulo) {
            alert('O título da página é obrigatório!');
            return;
        }

        const dados = {
            titulo: titulo,
            ordem: ordem,
            atualizado_em: new Date().toISOString()
        };

        try {
            let result;
            if (editId) {
                result = await supabaseClient
                    .from('tutoriais_paginas')
                    .update(dados)
                    .eq('id', parseInt(editId));
            } else {
                dados.criado_em = new Date().toISOString();
                result = await supabaseClient
                    .from('tutoriais_paginas')
                    .insert([dados]);
            }

            if (result.error) {
                alert('Erro: ' + result.error.message);
                return;
            }

            alert(editId ? 'Página atualizada com sucesso!' : 'Página salva com sucesso!');
            form.reset();
            document.getElementById('pagina-edit-id').value = '';
            document.getElementById('pagina-cancel-btn').style.display = 'none';
            carregarPaginasTutoriais();
            carregarPaginasVisualizar();
        } catch (err) {
            console.error('Erro ao salvar página:', err);
            alert('Erro ao salvar página.');
        }
    });
}

// Editar página
export async function editarPaginaTutorial(id) {
    try {
        const { data, error } = await supabaseClient
            .from('tutoriais_paginas')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) {
            alert('Página não encontrada!');
            return;
        }

        window.mudarAba('tutoriais-gerenciar');

        document.getElementById('pagina-edit-id').value = id;
        document.getElementById('pagina-titulo').value = data.titulo || '';
        document.getElementById('pagina-ordem').value = data.ordem || 0;
        document.getElementById('pagina-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-pagina-tutorial').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar página:', e);
        alert('Erro ao carregar dados da página.');
    }
}

// Excluir página
export async function excluirPaginaTutorial(id) {
    if (!confirm('Tem certeza que deseja excluir esta página e todas as suas seções?')) return;
    try {
        // Excluir seções primeiro
        const { error: secoesError } = await supabaseClient
            .from('tutoriais_secoes')
            .delete()
            .eq('pagina_id', id);

        if (secoesError) {
            alert('Erro ao excluir seções: ' + secoesError.message);
            return;
        }

        const { error } = await supabaseClient
            .from('tutoriais_paginas')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro: ' + error.message);
            return;
        }

        alert('Página excluída com sucesso!');
        carregarPaginasTutoriais();
        carregarPaginasVisualizar();
    } catch (e) {
        console.error('Erro ao excluir página:', e);
        alert('Erro ao excluir página.');
    }
}

// Cancelar edição de página
export function cancelarEdicaoPaginaTutorial() {
    document.getElementById('pagina-edit-id').value = '';
    document.getElementById('pagina-cancel-btn').style.display = 'none';
    document.getElementById('form-pagina-tutorial').reset();
    carregarPaginasTutoriais();
}

// Fechar gerenciador de seções
export function fecharGerenciadorSecoes() {
    document.getElementById('secoes-manager').style.display = 'none';
    document.getElementById('form-secao-tutorial').style.display = 'none';
    document.getElementById('secoes-tutoriais-container').innerHTML = '';
}

// =====================================================
// SEÇÕES DE TUTORIAIS (CRUD dentro de uma página)
// =====================================================

let _paginaAtualSelecionada = null;
let _todasSecoesPagina = [];

// Carregar seções de uma página específica
export async function carregarSecoesPagina(paginaId) {
    _paginaAtualSelecionada = paginaId;
    const container = document.getElementById('secoes-tutoriais-container');
    if (!container) return;

    container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Carregando seções...</div>';

    try {
        // Buscar nome da página
        const { data: paginaData } = await supabaseClient
            .from('tutoriais_paginas')
            .select('titulo')
            .eq('id', paginaId)
            .single();

        const tituloPagina = paginaData?.titulo || 'Página não encontrada';

        // Buscar seções
        const { data, error } = await supabaseClient
            .from('tutoriais_secoes')
            .select('*')
            .eq('pagina_id', paginaId)
            .order('ordem', { ascending: true });

        if (error) {
            container.innerHTML = `<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar seções: ${error.message}</div>`;
            return;
        }

        _todasSecoesPagina = data || [];

        // Mostrar o gerenciador de seções
        document.getElementById('secoes-pagina-titulo').textContent = tituloPagina;
        document.getElementById('secoes-pagina-id').value = paginaId;
        document.getElementById('secoes-manager').style.display = 'block';
        document.getElementById('form-secao-tutorial').style.display = 'block';

        renderizarSecoesPagina();
    } catch (e) {
        console.error('Erro ao carregar seções:', e);
        container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</div>';
    }
}

// Renderizar seções
function renderizarSecoesPagina() {
    const container = document.getElementById('secoes-tutoriais-container');
    if (!container) return;

    if (_todasSecoesPagina.length === 0) {
        container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Nenhuma seção cadastrada. Clique em "Salvar Seção" para começar.</div>';
        return;
    }

    container.innerHTML = '';
    _todasSecoesPagina.forEach((s, index) => {
        // Gerar nome do arquivo GIF baseado na ordem
        const gifNumber = s.ordem || (index + 1);
        const gifPath = `assets/gifs/${gifNumber}.gif`;
        
        container.innerHTML += `
            <div class="secao-card" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:4px;">
                            ${index + 1}. ${s.subtitulo || 'Sem título'}
                        </div>
                        ${s.descricao ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">${s.descricao}</div>` : ''}
                        <div style="font-size:12px;color:var(--primary);">GIF: ${gifNumber}.gif</div>
                        <div style="font-size:10px;color:var(--text-soft);">Ordem: ${s.ordem || 0}</div>
                    </div>
                    <div style="display:flex;gap:4px;flex-shrink:0;">
                        <button onclick="editarSecaoTutorial(${s.id})" class="btn-edit" style="font-size:9px;padding:3px 8px;">Editar</button>
                        <button onclick="excluirSecaoTutorial(${s.id})" class="btn-danger" style="font-size:9px;padding:3px 8px;">Excluir</button>
                    </div>
                </div>
                <div style="margin-top:8px; background:var(--paper); border-radius:4px; padding:8px; text-align:center; border:1px solid var(--border);">
                    <img src="${gifPath}" alt="${s.subtitulo}" style="max-width:100%; max-height:200px; border-radius:4px; display:block; margin:0 auto;" onerror="this.style.display='none';">
                    <div style="font-size:9px; color:var(--text-soft); margin-top:2px;">${gifNumber}.gif</div>
                </div>
            </div>
        `;
    });
}

// Inicializar formulário de seção
export function initFormSecaoTutorial() {
    const form = document.getElementById('form-secao-tutorial');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const paginaId = document.getElementById('secoes-pagina-id').value;
        const editId = document.getElementById('secao-edit-id').value;
        const subtitulo = document.getElementById('secao-subtitulo').value.trim();
        const descricao = document.getElementById('secao-descricao').value.trim();
        const ordem = parseInt(document.getElementById('secao-ordem').value) || 0;

        if (!subtitulo) {
            alert('O subtítulo da seção é obrigatório!');
            return;
        }

        if (!paginaId) {
            alert('Nenhuma página selecionada!');
            return;
        }

        const dados = {
            pagina_id: parseInt(paginaId),
            subtitulo: subtitulo,
            descricao: descricao || null,
            ordem: ordem,
            atualizado_em: new Date().toISOString()
        };

        try {
            let result;
            if (editId) {
                result = await supabaseClient
                    .from('tutoriais_secoes')
                    .update(dados)
                    .eq('id', parseInt(editId));
            } else {
                dados.criado_em = new Date().toISOString();
                result = await supabaseClient
                    .from('tutoriais_secoes')
                    .insert([dados]);
            }

            if (result.error) {
                alert('Erro: ' + result.error.message);
                return;
            }

            alert(editId ? 'Seção atualizada com sucesso!' : 'Seção salva com sucesso!');
            
            // Reset do formulário
            form.reset();
            document.getElementById('secao-edit-id').value = '';
            document.getElementById('secao-cancel-btn').style.display = 'none';
            
            if (paginaId) {
                await carregarSecoesPagina(parseInt(paginaId));
            }
            carregarPaginasVisualizar();
        } catch (err) {
            console.error('Erro ao salvar seção:', err);
            alert('Erro ao salvar seção.');
        }
    });
}

// Editar seção
export async function editarSecaoTutorial(id) {
    try {
        const { data, error } = await supabaseClient
            .from('tutoriais_secoes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) {
            alert('Seção não encontrada!');
            return;
        }

        document.getElementById('secao-edit-id').value = id;
        document.getElementById('secao-subtitulo').value = data.subtitulo || '';
        document.getElementById('secao-descricao').value = data.descricao || '';
        document.getElementById('secao-ordem').value = data.ordem || 0;
        document.getElementById('secao-cancel-btn').style.display = 'inline-block';

        // Garantir que o gerenciador de seções esteja visível
        document.getElementById('secoes-manager').style.display = 'block';
        document.getElementById('form-secao-tutorial').style.display = 'block';

        document.getElementById('form-secao-tutorial').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar seção:', e);
        alert('Erro ao carregar dados da seção.');
    }
}

// Excluir seção
export async function excluirSecaoTutorial(id) {
    if (!confirm('Tem certeza que deseja excluir esta seção?')) return;
    try {
        const { error } = await supabaseClient
            .from('tutoriais_secoes')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro: ' + error.message);
            return;
        }

        alert('Seção excluída com sucesso!');
        const paginaId = document.getElementById('secoes-pagina-id').value;
        if (paginaId) {
            await carregarSecoesPagina(parseInt(paginaId));
        }
        carregarPaginasVisualizar();
    } catch (e) {
        console.error('Erro ao excluir seção:', e);
        alert('Erro ao excluir seção.');
    }
}

// Cancelar edição de seção
export function cancelarEdicaoSecao() {
    document.getElementById('secao-edit-id').value = '';
    document.getElementById('secao-cancel-btn').style.display = 'none';
    document.getElementById('form-secao-tutorial').reset();
}

// =====================================================
// VISUALIZAR TUTORIAIS (CARDS)
// =====================================================

let _paginaAtualVisualizarPaginas = 1;

export function irParaPaginaVisualizarTutoriais(pagina) {
    _paginaAtualVisualizarPaginas = pagina;
    carregarPaginasVisualizar();
}

export async function carregarPaginasVisualizar() {
    const container = document.getElementById('tutoriais-paginas-container');
    if (!container) return;

    container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Carregando tutoriais...</div>';

    try {
        const { data, error } = await supabaseClient
            .from('tutoriais_paginas')
            .select('*')
            .order('ordem', { ascending: true });

        if (error) {
            container.innerHTML = `<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar: ${error.message}</div>`;
            return;
        }

        const filtro = (document.getElementById('filt-tutorial-visualizar-titulo')?.value || '').toLowerCase().trim();
        let dados = data || [];
        if (filtro) {
            dados = dados.filter(p => String(p.titulo || '').toLowerCase().includes(filtro));
        }

        const paginacaoEl = document.getElementById('tutoriais-visualizar-pagination');

        if (dados.length === 0) {
            container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Nenhum tutorial encontrado.</div>';
            if (paginacaoEl) paginacaoEl.innerHTML = '';
            return;
        }

        const totalPaginas = Math.max(1, Math.ceil(dados.length / ITENS_POR_PAGINA));
        if (_paginaAtualVisualizarPaginas > totalPaginas) _paginaAtualVisualizarPaginas = totalPaginas;
        const pagina = paginar(dados, _paginaAtualVisualizarPaginas, ITENS_POR_PAGINA);

        container.innerHTML = '';

        pagina.forEach(p => {
            container.innerHTML += `
                <div class="dc-card" style="border-left-color: var(--primary); cursor:pointer;" onclick="abrirPaginaTutorial(${p.id})">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <div class="dc-number" style="font-size:16px;">${p.titulo}</div>
                        <div style="font-size:12px; color:var(--text-soft);">Ordem: ${p.ordem || 0}</div>
                    </div>
                    <div style="margin-top:8px; padding-top:6px; border-top:1px solid var(--border); display:flex; justify-content:flex-end;">
                        <button onclick="event.stopPropagation(); abrirPaginaTutorial(${p.id})" class="btn-primary" style="font-size:10.5px; padding:4px 14px;">Abrir</button>
                    </div>
                </div>
            `;
        });

        if (paginacaoEl) {
            paginacaoEl.innerHTML = renderizarPaginacao(_paginaAtualVisualizarPaginas, dados.length, ITENS_POR_PAGINA, 'irParaPaginaVisualizarTutoriais');
        }
    } catch (e) {
        console.error('Erro inesperado:', e);
        container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar tutoriais.</div>';
    }
}

// Abrir página de tutorial para visualização
window.abrirPaginaTutorial = async function(paginaId) {
    try {
        // Buscar dados da página
        const { data: pagina, error: paginaError } = await supabaseClient
            .from('tutoriais_paginas')
            .select('*')
            .eq('id', paginaId)
            .single();

        if (paginaError || !pagina) {
            alert('Página não encontrada!');
            return;
        }

        // Buscar seções da página
        const { data: secoes, error: secoesError } = await supabaseClient
            .from('tutoriais_secoes')
            .select('*')
            .eq('pagina_id', paginaId)
            .order('ordem', { ascending: true });

        if (secoesError) {
            alert('Erro ao carregar seções: ' + secoesError.message);
            return;
        }

        // Montar conteúdo do modal
        const conteudo = document.getElementById('modal-tutorial-conteudo');
        let html = `
            <div style="font-family:'Space Grotesk', sans-serif; font-size:22px; font-weight:700; color:var(--text); margin-bottom:20px; text-align:center; border-bottom:2px solid var(--border); padding-bottom:12px;">
                ${pagina.titulo}
            </div>
        `;

        if (!secoes || secoes.length === 0) {
            html += `<div class="p-6 text-center" style="color:var(--text-soft);">Nenhuma seção cadastrada para este tutorial.</div>`;
        } else {
            secoes.forEach((s, index) => {
                // Gerar nome do arquivo GIF baseado na ordem
                const gifNumber = s.ordem || (index + 1);
                const gifPath = `assets/gifs/${gifNumber}.gif`;
                
                html += `
                    <div style="margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid var(--border);">
                        <div style="font-family:'Inter', sans-serif; font-size:16px; font-weight:700; color:var(--text); margin-bottom:8px;">
                            ${index + 1}. ${s.subtitulo}
                        </div>
                        <div style="margin:12px 0; text-align:center; background:var(--paper); border-radius:8px; padding:12px; border:1px solid var(--border);">
                            <img src="${gifPath}" alt="${s.subtitulo}" style="max-width:100%; max-height:400px; border-radius:4px; display:block; margin:0 auto;" onerror="this.style.display='none';">
                            <div style="font-size:10px; color:var(--text-soft); margin-top:4px;">${gifNumber}.gif</div>
                        </div>
                        ${s.descricao ? `
                            <div style="font-size:13px; color:var(--text); line-height:1.6; padding:8px 0;">
                                ${s.descricao}
                            </div>
                        ` : ''}
                    </div>
                `;
            });
        }

        conteudo.innerHTML = html;

        // Mostrar o modal
        document.getElementById('modal-visualizacao-tutorial').style.display = 'flex';

    } catch (e) {
        console.error('Erro ao abrir tutorial:', e);
        alert('Erro ao carregar tutorial.');
    }
};

// Fechar visualização do tutorial
window.fecharVisualizacaoTutorial = function() {
    document.getElementById('modal-visualizacao-tutorial').style.display = 'none';
};

// Filtrar visualizar tutoriais
export function filtrarVisualizarTutoriais() {
    _paginaAtualVisualizarPaginas = 1;
    carregarPaginasVisualizar();
}

export function limparFiltrosVisualizarTutoriais() {
    document.getElementById('filt-tutorial-visualizar-titulo').value = '';
    _paginaAtualVisualizarPaginas = 1;
    carregarPaginasVisualizar();
}