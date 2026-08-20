// tutoriais.js
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
let _paginaAtualVisualizacao = 0;
let _secoesAtuais = [];
let _cacheArquivos = {};
let _zoomNivel = 0;
const ZOOM_MAXIMO = 5;
const ZOOM_PASSO = 0.2;

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

// Editar página - CORRIGIDO
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

        // Mudar para a aba de gerenciamento
        window.mudarAba('tutoriais-gerenciar');

        // Aguardar a aba carregar e preencher o formulário
        setTimeout(() => {
            const editIdField = document.getElementById('pagina-edit-id');
            const tituloField = document.getElementById('pagina-titulo');
            const ordemField = document.getElementById('pagina-ordem');
            const cancelBtn = document.getElementById('pagina-cancel-btn');

            if (editIdField) editIdField.value = id;
            if (tituloField) tituloField.value = data.titulo || '';
            if (ordemField) ordemField.value = data.ordem || 0;
            if (cancelBtn) cancelBtn.style.display = 'inline-block';

            const form = document.getElementById('form-pagina-tutorial');
            if (form) form.scrollIntoView({ behavior: 'smooth' });
        }, 400);
    } catch (e) {
        console.error('Erro ao editar página:', e);
        alert('Erro ao carregar dados da página.');
    }
}

// Excluir página
export async function excluirPaginaTutorial(id) {
    if (!confirm('Tem certeza que deseja excluir esta página e todas as suas seções?')) return;
    try {
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

// Função para verificar se um arquivo existe (com cache)
function verificarArquivoExiste(url) {
    return new Promise((resolve) => {
        if (_cacheArquivos[url] !== undefined) {
            resolve(_cacheArquivos[url]);
            return;
        }
        
        const img = new Image();
        img.onload = function() {
            _cacheArquivos[url] = true;
            resolve(true);
        };
        img.onerror = function() {
            _cacheArquivos[url] = false;
            resolve(false);
        };
        img.src = url;
    });
}

// Carregar seções de uma página específica
export async function carregarSecoesPagina(paginaId) {
    _paginaAtualSelecionada = paginaId;
    const container = document.getElementById('secoes-tutoriais-container');
    if (!container) return;

    container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Carregando seções...</div>';

    try {
        const { data: paginaData } = await supabaseClient
            .from('tutoriais_paginas')
            .select('titulo')
            .eq('id', paginaId)
            .single();

        const tituloPagina = paginaData?.titulo || 'Página não encontrada';

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

        document.getElementById('secoes-pagina-titulo').textContent = tituloPagina;
        document.getElementById('secoes-pagina-id').value = paginaId;
        document.getElementById('secoes-manager').style.display = 'block';
        document.getElementById('form-secao-tutorial').style.display = 'block';

        // Renderizar com placeholder primeiro
        renderizarSecoesPaginaPlaceholder();
        
        // Verificar arquivos em background
        await verificarArquivosSecoes();
        
        // Renderizar com resultados
        renderizarSecoesPagina();
    } catch (e) {
        console.error('Erro ao carregar seções:', e);
        container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</div>';
    }
}

// Renderizar placeholder enquanto verifica arquivos
function renderizarSecoesPaginaPlaceholder() {
    const container = document.getElementById('secoes-tutoriais-container');
    if (!container) return;

    if (_todasSecoesPagina.length === 0) {
        container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Nenhuma seção cadastrada.</div>';
        return;
    }

    container.innerHTML = '';
    _todasSecoesPagina.forEach((s, index) => {
        const nomeArquivo = s.nome_arquivo || s.subtitulo || 'sem_nome';
        
        container.innerHTML += `
            <div class="secao-card" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:4px;">
                            ${index + 1}. ${s.subtitulo || 'Sem título'}
                        </div>
                        ${s.descricao ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">${s.descricao}</div>` : ''}
                        <div style="font-size:12px;color:var(--primary);">Arquivo: ${nomeArquivo}</div>
                        <div style="font-size:10px;color:var(--text-soft);">Ordem: ${s.ordem || 0}</div>
                    </div>
                    <div style="display:flex;gap:4px;flex-shrink:0;">
                        <button onclick="editarSecaoTutorial(${s.id})" class="btn-edit" style="font-size:9px;padding:3px 8px;">Editar</button>
                        <button onclick="excluirSecaoTutorial(${s.id})" class="btn-danger" style="font-size:9px;padding:3px 8px;">Excluir</button>
                    </div>
                </div>
                <div style="margin-top:8px; background:var(--paper); border-radius:4px; padding:8px; text-align:center; border:1px solid var(--border);">
                    <div style="color:var(--text-soft); padding:10px;" id="loading-${s.id}">Carregando imagem...</div>
                    <div id="imagem-container-${s.id}" style="display:none;"></div>
                </div>
            </div>
        `;
    });
}

// Verificar arquivos em background
async function verificarArquivosSecoes() {
    for (const s of _todasSecoesPagina) {
        const nomeArquivo = s.nome_arquivo || s.subtitulo || 'sem_nome';
        // Remove extensão se já tiver
        const nomeSemExtensao = nomeArquivo.replace(/\.[^.]+$/, '');
        const basePath = `assets/gifs/${nomeSemExtensao}`;
        
        // Verificar .gif
        const gifExiste = await verificarArquivoExiste(`${basePath}.gif`);
        let imagemEncontrada = false;
        let caminhoImagem = '';
        let extensao = '';
        
        if (gifExiste) {
            imagemEncontrada = true;
            caminhoImagem = `${basePath}.gif`;
            extensao = '.gif';
        } else {
            // Verificar .png
            const pngExiste = await verificarArquivoExiste(`${basePath}.png`);
            if (pngExiste) {
                imagemEncontrada = true;
                caminhoImagem = `${basePath}.png`;
                extensao = '.png';
            }
        }
        
        // Atualizar o DOM com o resultado
        const loadingEl = document.getElementById(`loading-${s.id}`);
        const containerEl = document.getElementById(`imagem-container-${s.id}`);
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (containerEl) {
            containerEl.style.display = 'block';
            if (imagemEncontrada) {
                containerEl.innerHTML = `
                    <img src="${caminhoImagem}" alt="${s.subtitulo}" style="max-width:100%; max-height:200px; border-radius:4px; display:block; margin:0 auto;">
                    <div style="font-size:9px; color:var(--text-soft); margin-top:2px;">${nomeSemExtensao}${extensao}</div>
                `;
            } else {
                containerEl.innerHTML = `
                    <div style="color:var(--text-soft); padding:10px;">Arquivo não encontrado: ${nomeSemExtensao}.gif ou .png</div>
                `;
            }
        }
    }
}

// Renderizar seções com resultados
function renderizarSecoesPagina() {
    // Já foi feito pelo verificarArquivosSecoes
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
        const nomeArquivo = document.getElementById('secao-nome-arquivo').value.trim();

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
            nome_arquivo: nomeArquivo || null,
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
            
            form.reset();
            document.getElementById('secao-edit-id').value = '';
            document.getElementById('secao-cancel-btn').style.display = 'none';
            
            // Limpar cache para recarregar
            _cacheArquivos = {};
            
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

        document.getElementById('secoes-manager').style.display = 'block';
        document.getElementById('form-secao-tutorial').style.display = 'block';

        document.getElementById('secao-edit-id').value = id;
        document.getElementById('secao-subtitulo').value = data.subtitulo || '';
        document.getElementById('secao-descricao').value = data.descricao || '';
        document.getElementById('secao-ordem').value = data.ordem || 0;
        document.getElementById('secao-nome-arquivo').value = data.nome_arquivo || '';
        document.getElementById('secao-cancel-btn').style.display = 'inline-block';

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
        _cacheArquivos = {};
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

// =====================================================
// FUNÇÕES DE ZOOM
// =====================================================
function aplicarZoom(img, nivel) {
    const escala = 1 + (nivel * ZOOM_PASSO);
    img.style.transform = `scale(${escala})`;
    img.style.transition = 'transform 0.2s ease';
}

function handleZoomClick(img, event) {
    event.stopPropagation();
    
    // Se o zoom está no máximo, começa a diminuir
    if (_zoomNivel >= ZOOM_MAXIMO) {
        _zoomNivel = -1;
    }
    
    _zoomNivel++;
    
    // Se passou do máximo, volta para 0
    if (_zoomNivel > ZOOM_MAXIMO) {
        _zoomNivel = 0;
    }
    
    aplicarZoom(img, _zoomNivel);
}

// =====================================================
// FUNÇÕES DE NAVEGAÇÃO ENTRE PASSOS
// =====================================================

function atualizarIndicadoresPassos() {
    document.querySelectorAll('.passo-indicador').forEach((el, idx) => {
        el.classList.remove('passo-ativo');
        el.style.background = 'transparent';
        if (idx === _paginaAtualVisualizacao) {
            el.classList.add('passo-ativo');
            el.style.background = '#FFD700';
            el.style.borderColor = '#D4A800';
            el.style.boxShadow = '0 0 12px rgba(255,215,0,0.6)';
        } else {
            el.style.borderColor = 'var(--primary)';
            el.style.boxShadow = 'none';
        }
    });
}

function irParaPasso(index) {
    _paginaAtualVisualizacao = index;
    const secao = _secoesAtuais[index];
    if (secao) {
        const elemento = document.getElementById(`secao-${secao.id}`);
        if (elemento) {
            elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    atualizarIndicadoresPassos();
}

function proximoPasso() {
    if (_paginaAtualVisualizacao < _secoesAtuais.length - 1) {
        _paginaAtualVisualizacao++;
        irParaPasso(_paginaAtualVisualizacao);
    }
}

function passoAnterior() {
    if (_paginaAtualVisualizacao > 0) {
        _paginaAtualVisualizacao--;
        irParaPasso(_paginaAtualVisualizacao);
    }
}

// =====================================================
// EXPORTAÇÃO DE FUNÇÕES GLOBAIS
// =====================================================
window.irParaPasso = irParaPasso;
window.proximoPasso = proximoPasso;
window.passoAnterior = passoAnterior;
window.handleZoomClick = handleZoomClick;

// =====================================================
// ABRIR PÁGINA DE TUTORIAL PARA VISUALIZAÇÃO
// =====================================================
window.abrirPaginaTutorial = async function(paginaId) {
    try {
        const { data: pagina, error: paginaError } = await supabaseClient
            .from('tutoriais_paginas')
            .select('*')
            .eq('id', paginaId)
            .single();

        if (paginaError || !pagina) {
            alert('Página não encontrada!');
            return;
        }

        const { data: secoes, error: secoesError } = await supabaseClient
            .from('tutoriais_secoes')
            .select('*')
            .eq('pagina_id', paginaId)
            .order('ordem', { ascending: true });

        if (secoesError) {
            alert('Erro ao carregar seções: ' + secoesError.message);
            return;
        }

        _secoesAtuais = secoes || [];
        _paginaAtualVisualizacao = 0;
        _zoomNivel = 0;

        const conteudo = document.getElementById('modal-tutorial-conteudo');
        let html = `
            <div style="font-family:'Space Grotesk', sans-serif; font-size:22px; font-weight:700; color:var(--text); margin-bottom:20px; text-align:center; border-bottom:2px solid var(--border); padding-bottom:12px;">
                ${pagina.titulo}
            </div>
        `;

        if (!secoes || secoes.length === 0) {
            html += `<div class="p-6 text-center" style="color:var(--text-soft);">Nenhuma seção cadastrada para este tutorial.</div>`;
        } else {
            // Indicadores de passo
            html += `
                <div style="display:flex; justify-content:center; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
                    ${secoes.map((s, idx) => `
                        <button class="passo-indicador" 
                                onclick="irParaPasso(${idx})" 
                                style="width:14px; height:14px; border-radius:50%; border:2px solid var(--primary); background:transparent; cursor:pointer; transition:all 0.3s ease; padding:0;"
                                title="Passo ${idx + 1}: ${s.subtitulo}">
                        </button>
                    `).join('')}
                </div>
            `;

            // Limpar cache antes de verificar
            _cacheArquivos = {};

            for (const s of secoes) {
                const nomeArquivo = s.nome_arquivo || s.subtitulo || 'sem_nome';
                const nomeSemExtensao = nomeArquivo.replace(/\.[^.]+$/, '');
                const basePath = `assets/gifs/${nomeSemExtensao}`;
                
                // Verificar arquivos com cache
                const gifExiste = await verificarArquivoExiste(`${basePath}.gif`);
                let caminhoImagem = '';
                let extensao = '';
                let imagemEncontrada = false;
                
                if (gifExiste) {
                    imagemEncontrada = true;
                    caminhoImagem = `${basePath}.gif`;
                    extensao = '.gif';
                } else {
                    const pngExiste = await verificarArquivoExiste(`${basePath}.png`);
                    if (pngExiste) {
                        imagemEncontrada = true;
                        caminhoImagem = `${basePath}.png`;
                        extensao = '.png';
                    }
                }
                
                const index = secoes.indexOf(s);
                const imgId = `img-${s.id}`;
                html += `
                    <div id="secao-${s.id}" style="margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid var(--border); scroll-margin-top: 20px;">
                        <div style="font-family:'Inter', sans-serif; font-size:16px; font-weight:700; color:var(--text); margin-bottom:8px;">
                            ${index + 1}. ${s.subtitulo}
                        </div>
                        <div style="margin:12px 0; text-align:center; background:var(--paper); border-radius:8px; padding:12px; border:1px solid var(--border); position:relative; overflow:hidden;">
                            ${imagemEncontrada ? `
                                <div style="position:relative; overflow:hidden;">
                                    <img id="${imgId}" 
                                         src="${caminhoImagem}" 
                                         alt="${s.subtitulo}" 
                                         style="max-width:100%; max-height:400px; border-radius:4px; display:block; margin:0 auto; cursor:pointer; transition:transform 0.2s ease; transform:scale(1);"
                                         onclick="handleZoomClick(this, event)">
                                    <div style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.7); color:white; padding:4px 10px; border-radius:4px; font-size:10px; pointer-events:none; opacity:0.7;">
                                        Clique para zoom (${ZOOM_MAXIMO} níveis)
                                    </div>
                                    <div style="font-size:10px; color:var(--text-soft); margin-top:4px;">${nomeSemExtensao}${extensao} (Clique na imagem para zoom)</div>
                                </div>
                            ` : `
                                <div style="color:var(--text-soft); padding:20px;">Arquivo não encontrado: ${nomeSemExtensao}.gif ou .png</div>
                            `}
                        </div>
                        ${s.descricao ? `
                            <div style="font-size:13px; color:var(--text); line-height:1.6; padding:8px 0;">
                                ${s.descricao}
                            </div>
                        ` : ''}
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:12px; border-top:1px solid var(--border);">
                            <div style="font-size:11px; color:var(--text-soft);">
                                Passo ${index + 1} de ${secoes.length}
                            </div>
                            <div style="display:flex; gap:8px;">
                                ${index > 0 ? `<button onclick="passoAnterior()" class="btn-secondary" style="font-size:10px; padding:4px 12px;">Anterior</button>` : ''}
                                ${index < secoes.length - 1 ? `<button onclick="proximoPasso()" class="btn-primary" style="font-size:10px; padding:4px 12px;">Próximo</button>` : `<button onclick="fecharVisualizacaoTutorial()" class="btn-primary" style="font-size:10px; padding:4px 12px;">Concluir</button>`}
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        conteudo.innerHTML = html;

        // Atualizar indicadores após renderizar
        setTimeout(atualizarIndicadoresPassos, 100);

        // Fechar ao clicar fora do modal
        const modal = document.getElementById('modal-visualizacao-tutorial');
        modal.addEventListener('click', function(event) {
            if (event.target === this) {
                fecharVisualizacaoTutorial();
            }
        });

        document.getElementById('modal-visualizacao-tutorial').style.display = 'flex';

    } catch (e) {
        console.error('Erro ao abrir tutorial:', e);
        alert('Erro ao carregar tutorial.');
    }
};

// Fechar visualização
window.fecharVisualizacaoTutorial = function() {
    document.getElementById('modal-visualizacao-tutorial').style.display = 'none';
    _zoomNivel = 0;
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