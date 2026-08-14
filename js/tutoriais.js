import { supabaseClient } from './config.js';
import { aplicarMascaras, paginar, renderizarPaginacao } from './utils.js';

let _todosTutoriais = [];
const ITENS_POR_PAGINA_TUTORIAL = 15;
let _paginaAtualTutorial = 1;

// =====================================================
// CRUD TUTORIAIS
// =====================================================

export function irParaPaginaTutorial(pagina) {
    _paginaAtualTutorial = pagina;
    renderizarTabelaTutoriais();
}

export async function carregarTutoriais() {
    const tbody = document.getElementById('tabela-tutoriais');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('tutoriais')
            .select('*')
            .order('titulo', { ascending: true });

        if (error) {
            console.error('Erro ao carregar tutoriais:', error);
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar: ${error.message}</td></tr>`;
            return;
        }

        _todosTutoriais = data || [];
        _paginaAtualTutorial = 1;
        renderizarTabelaTutoriais();
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

function lerFiltrosTutoriais() {
    return {
        titulo: (document.getElementById('filt-tutorial-titulo')?.value || '').toLowerCase().trim()
    };
}

function aplicarFiltrosTutoriais(lista, f) {
    return lista.filter(item => {
        if (f.titulo && !String(item.titulo || '').toLowerCase().includes(f.titulo)) return false;
        return true;
    });
}

export function filtrarTutoriais() {
    _paginaAtualTutorial = 1;
    renderizarTabelaTutoriais();
}

export function limparFiltrosTutoriais() {
    document.getElementById('filt-tutorial-titulo').value = '';
    _paginaAtualTutorial = 1;
    renderizarTabelaTutoriais();
}

function renderizarTabelaTutoriais() {
    const tbody = document.getElementById('tabela-tutoriais');
    if (!tbody) return;

    const f = lerFiltrosTutoriais();
    const data = aplicarFiltrosTutoriais(_todosTutoriais, f);
    const paginacaoEl = document.getElementById('tutoriais-pagination');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Nenhum tutorial encontrado.</td></tr>';
        if (paginacaoEl) paginacaoEl.innerHTML = '';
        return;
    }

    const totalPaginas = Math.max(1, Math.ceil(data.length / ITENS_POR_PAGINA_TUTORIAL));
    if (_paginaAtualTutorial > totalPaginas) _paginaAtualTutorial = totalPaginas;
    const pagina = paginar(data, _paginaAtualTutorial, ITENS_POR_PAGINA_TUTORIAL);

    try {
        tbody.innerHTML = '';
        pagina.forEach(t => {
            const tagsHtml = t.tags ? t.tags.split(',').map(tag => 
                `<span class="permissions-badge" style="background:var(--primary-100);color:var(--primary);">${tag.trim()}</span>`
            ).join(' ') : '';
            
            tbody.innerHTML += `
                <tr class="td-row">
                    <td style="font-weight:600;">${t.titulo || '-'}</td>
                    <td><a href="${t.link}" target="_blank" style="color:var(--primary);text-decoration:underline;">${t.link || '-'}</a></td>
                    <td>${t.categoria || '-'}</td>
                    <td>${tagsHtml || '-'}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarTutorial(${t.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirTutorial(${t.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
        if (paginacaoEl) {
            paginacaoEl.innerHTML = renderizarPaginacao(_paginaAtualTutorial, data.length, ITENS_POR_PAGINA_TUTORIAL, 'irParaPaginaTutorial');
        }
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormTutorial() {
    const form = document.getElementById('form-tutorial');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('tutorial-edit-id').value;

        const titulo = document.getElementById('tutorial-titulo').value.trim();
        const link = document.getElementById('tutorial-link').value.trim();
        const categoria = document.getElementById('tutorial-categoria').value.trim();
        const tags = document.getElementById('tutorial-tags').value.trim();

        if (!titulo) {
            alert('O título do tutorial é obrigatório!');
            return;
        }
        if (!link) {
            alert('O link do tutorial é obrigatório!');
            return;
        }

        // Validar URL
        try {
            new URL(link);
        } catch {
            alert('Por favor, insira uma URL válida (ex: https://www.youtube.com/watch?v=xxx)');
            return;
        }

        const dados = {
            titulo: titulo,
            link: link,
            categoria: categoria || null,
            tags: tags || null,
            atualizado_em: new Date().toISOString()
        };

        try {
            let result;
            if (editId) {
                result = await supabaseClient
                    .from('tutoriais')
                    .update(dados)
                    .eq('id', parseInt(editId));
            } else {
                dados.criado_em = new Date().toISOString();
                result = await supabaseClient
                    .from('tutoriais')
                    .insert([dados]);
            }

            if (result.error) {
                alert('Erro: ' + result.error.message);
                return;
            }

            alert(editId ? 'Tutorial atualizado com sucesso!' : 'Tutorial salvo com sucesso!');
            form.reset();
            document.getElementById('tutorial-edit-id').value = '';
            document.getElementById('tutorial-cancel-btn').style.display = 'none';
            carregarTutoriais();
        } catch (err) {
            console.error('Erro ao salvar tutorial:', err);
            alert('Erro ao salvar tutorial.');
        }
    });
}

export async function editarTutorial(id) {
    try {
        const { data, error } = await supabaseClient
            .from('tutoriais')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) {
            alert('Tutorial não encontrado!');
            return;
        }

        // Mudar para a aba de cadastro de tutoriais
        window.mudarAba('adm-tutoriais');

        document.getElementById('tutorial-edit-id').value = id;
        document.getElementById('tutorial-titulo').value = data.titulo || '';
        document.getElementById('tutorial-link').value = data.link || '';
        document.getElementById('tutorial-categoria').value = data.categoria || '';
        document.getElementById('tutorial-tags').value = data.tags || '';
        document.getElementById('tutorial-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-tutorial').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar tutorial:', e);
        alert('Erro ao carregar dados do tutorial.');
    }
}

export async function excluirTutorial(id) {
    if (!confirm('Tem certeza que deseja excluir este tutorial?')) return;
    try {
        const { error } = await supabaseClient
            .from('tutoriais')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro: ' + error.message);
            return;
        }

        alert('Tutorial excluído com sucesso!');
        carregarTutoriais();
    } catch (e) {
        console.error('Erro ao excluir tutorial:', e);
        alert('Erro ao excluir tutorial.');
    }
}