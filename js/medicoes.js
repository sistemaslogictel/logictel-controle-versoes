import { supabaseClient } from './config.js';
import { valorParaNumero, aplicarMascaras, paginar, renderizarPaginacao } from './utils.js';
import { carregarFiltros } from './selects.js';

// Guarda a última lista buscada no banco, para os filtros da tela
let _todasMedicoes = [];
let _todasMedicoesHistorico = [];

const ITENS_POR_PAGINA_MED = 15;
let _paginaAtualMed = 1;

const ITENS_POR_PAGINA_HIST_MED = 15;
let _paginaAtualHistMed = 1;

export function irParaPaginaMed(pagina) {
    _paginaAtualMed = pagina;
    renderizarTabelaMedicoes();
}

export function irParaPaginaHistMed(pagina) {
    _paginaAtualHistMed = pagina;
    renderizarTabelaHistoricoMedicoes();
}

// =====================================================
// TOGGLE TIPO ACERTO
// =====================================================
export function toggleTipoAcerto() {
    const checkbox = document.getElementById('med-tipo-acerto');
    const campoStatusWrap = document.getElementById('campo-valor-status-wrap');
    const campoValorStatus = document.getElementById('med-valor-status');
    const labelValorDon = document.getElementById('label-valor-don');
    const campoValorDon = document.getElementById('med-valor-don');

    if (!checkbox) return;

    if (checkbox.checked) {
        // É acerto: esconde Valor Status e destaca Valor DON
        if (campoStatusWrap) campoStatusWrap.style.display = 'none';
        if (campoValorStatus) {
            campoValorStatus.required = false;
            campoValorStatus.value = '0,00';
        }
        if (labelValorDon) {
            labelValorDon.innerHTML = 'Valor DON (ACERTO) *';
            labelValorDon.style.color = '#8A6A0A';
        }
        if (campoValorDon) {
            campoValorDon.placeholder = '-0,00';
            // Sugere valor negativo automaticamente
            const atual = campoValorDon.value;
            if (atual && !atual.startsWith('-')) {
                campoValorDon.value = '-' + atual;
            }
        }
    } else {
        // Não é acerto
        if (campoStatusWrap) campoStatusWrap.style.display = '';
        if (campoValorStatus) {
            campoValorStatus.required = true;
        }
        if (labelValorDon) {
            labelValorDon.innerHTML = 'Valor DON *';
            labelValorDon.style.color = '';
        }
        if (campoValorDon) {
            campoValorDon.placeholder = '0,00';
            // Remove sinal negativo
            const atual = campoValorDon.value;
            if (atual && atual.startsWith('-')) {
                campoValorDon.value = atual.substring(1);
            }
        }
    }
    aplicarMascaras();
}

// =====================================================
// DETECTAR SE UMA MEDIÇÃO É ACERTO
// =====================================================
function medicoesEAcerto(m) {
    // É acerto quando o valor_don é negativo
    return Number(m.valor_don || 0) < 0;
}

export async function carregarMedicoes() {
    const tbody = document.getElementById('tabela-medicoes');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('medicoes')
            .select(`
                id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes,
                ano,
                valor_don,
                valor_status,
                observacao,
                data_email_medicao,
                status_medicao,
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome)
            `)
            .order('id', { ascending: false });

        if (error) {
            console.error('Erro ao carregar medições:', error);
            tbody.innerHTML = `<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar: ${error.message}</td></tr>`;
            return;
        }

        _todasMedicoes = data || [];
        _paginaAtualMed = 1;
        renderizarTabelaMedicoes();
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export async function carregarHistoricoMedicoes() {
    const tbody = document.getElementById('tabela-historico-medicoes');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('medicoes')
            .select(`
                id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes,
                ano,
                valor_don,
                valor_status,
                observacao,
                data_email_medicao,
                status_medicao,
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome)
            `)
            .order('id', { ascending: false });

        if (error) {
            console.error('Erro ao carregar histórico de medições:', error);
            tbody.innerHTML = `<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar: ${error.message}</td></tr>`;
            return;
        }

        _todasMedicoesHistorico = data || [];
        _paginaAtualHistMed = 1;
        renderizarTabelaHistoricoMedicoes();
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

function lerFiltrosHistoricoMedicoes() {
    return {
        projeto: document.getElementById('filt-hist-med-projeto')?.value || '',
        diretor: document.getElementById('filt-hist-med-diretor')?.value || '',
        status: document.getElementById('filt-hist-med-status')?.value || ''
    };
}

export function filtrarHistoricoMedicoes() {
    _paginaAtualHistMed = 1;
    renderizarTabelaHistoricoMedicoes();
}

export function limparFiltrosHistoricoMedicoes() {
    ['filt-hist-med-projeto', 'filt-hist-med-diretor', 'filt-hist-med-status'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    _paginaAtualHistMed = 1;
    renderizarTabelaHistoricoMedicoes();
}

function renderizarTabelaHistoricoMedicoes() {
    const tbody = document.getElementById('tabela-historico-medicoes');
    if (!tbody) return;

    const f = lerFiltrosHistoricoMedicoes();
    const data = _todasMedicoesHistorico.filter(m => {
        if (f.projeto && String(m.projeto_id) !== f.projeto) return false;
        if (f.diretor && String(m.diretor_id) !== f.diretor) return false;
        if (f.status && String(m.status_medicao) !== f.status) return false;
        return true;
    });

    const paginacaoEl = document.getElementById('historico-medicoes-pagination');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Nenhuma medição encontrada.</td></tr>';
        if (paginacaoEl) paginacaoEl.innerHTML = '';
        return;
    }

    const totalPaginas = Math.max(1, Math.ceil(data.length / ITENS_POR_PAGINA_HIST_MED));
    if (_paginaAtualHistMed > totalPaginas) _paginaAtualHistMed = totalPaginas;
    const pagina = paginar(data, _paginaAtualHistMed, ITENS_POR_PAGINA_HIST_MED);

    try {
        tbody.innerHTML = '';
        pagina.forEach(m => {
            const valorDon = Number(m.valor_don || 0);
            const valorStatus = Number(m.valor_status || 0);
            const isAcerto = valorDon < 0;

            const badgeAcerto = isAcerto
                ? `<span style="background:var(--gold-bg); color:#8A6A0A; padding:2px 8px; border-radius:10px; font-size:9px; font-weight:700; margin-left:6px; border:1px solid var(--gold);">ACERTO</span>`
                : '';

            // Linha vermelha para acertos
            const rowStyle = isAcerto
                ? 'background:#FDE8E8; border-left:4px solid var(--danger);'
                : '';

            tbody.innerHTML += `
                <tr class="td-row" style="${rowStyle}">
                    <td>${m.id}${badgeAcerto}</td>
                    <td>${m.projetos?.nome || '-'}</td>
                    <td>${m.gestores_logictel?.nome || '-'}</td>
                    <td>${m.diretores?.nome || '-'}</td>
                    <td>${m.mes}</td>
                    <td>${m.ano}</td>
                    <td class="text-right mono ${isAcerto ? 'text-neg' : ''}" style="${isAcerto ? 'color:var(--danger);font-weight:700;' : ''}">R$ ${valorDon.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                    <td class="text-right mono">R$ ${valorStatus.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                    <td>${m.status_medicao || '-'}</td>
                    <td>${m.observacao || '-'}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarMedicao(${m.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirMedicao(${m.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
        if (paginacaoEl) {
            paginacaoEl.innerHTML = renderizarPaginacao(_paginaAtualHistMed, data.length, ITENS_POR_PAGINA_HIST_MED, 'irParaPaginaHistMed');
        }
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

function lerFiltrosMedicoes() {
    return {
        projeto: document.getElementById('filt-med-projeto')?.value || '',
        diretor: document.getElementById('filt-med-diretor')?.value || '',
        mes: document.getElementById('filt-med-mes')?.value || ''
    };
}

export function filtrarMedicoes() {
    _paginaAtualMed = 1;
    renderizarTabelaMedicoes();
}

export function limparFiltrosMedicoes() {
    ['filt-med-projeto', 'filt-med-diretor', 'filt-med-mes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    _paginaAtualMed = 1;
    renderizarTabelaMedicoes();
}

function renderizarTabelaMedicoes() {
    const tbody = document.getElementById('tabela-medicoes');
    if (!tbody) return;

    const f = lerFiltrosMedicoes();
    const data = _todasMedicoes.filter(m => {
        if (f.projeto && String(m.projeto_id) !== f.projeto) return false;
        if (f.diretor && String(m.diretor_id) !== f.diretor) return false;
        if (f.mes && m.mes !== f.mes) return false;
        return true;
    });

    const paginacaoEl = document.getElementById('medicoes-pagination');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Nenhuma medição encontrada.</td></tr>';
        if (paginacaoEl) paginacaoEl.innerHTML = '';
        return;
    }

    const totalPaginas = Math.max(1, Math.ceil(data.length / ITENS_POR_PAGINA_MED));
    if (_paginaAtualMed > totalPaginas) _paginaAtualMed = totalPaginas;
    const pagina = paginar(data, _paginaAtualMed, ITENS_POR_PAGINA_MED);

    try {
        tbody.innerHTML = '';
        pagina.forEach(m => {
            const valorDon = Number(m.valor_don || 0);
            const valorStatus = Number(m.valor_status || 0);
            const isAcerto = medicoesEAcerto(m);
            
            const badgeAcerto = isAcerto 
                ? `<span style="background:var(--gold-bg); color:#8A6A0A; padding:2px 8px; border-radius:10px; font-size:9px; font-weight:700; margin-left:6px; border:1px solid var(--gold);">ACERTO</span>` 
                : '';
            
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${m.id}${badgeAcerto}</td>
                    <td>${m.projetos?.nome || '-'}</td>
                    <td>${m.gestores_logictel?.nome || '-'}</td>
                    <td>${m.diretores?.nome || '-'}</td>
                    <td>${m.mes}</td>
                    <td>${m.ano}</td>
                    <td class="text-right mono ${valorDon < 0 ? 'text-neg' : ''}">R$ ${valorDon.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                    <td class="text-right mono">R$ ${valorStatus.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                    <td>${m.status_medicao || '-'}</td>
                    <td>${m.observacao || '-'}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarMedicao(${m.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirMedicao(${m.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
        if (paginacaoEl) {
            paginacaoEl.innerHTML = renderizarPaginacao(_paginaAtualMed, data.length, ITENS_POR_PAGINA_MED, 'irParaPaginaMed');
        }
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="11" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormMedicao() {
    const form = document.getElementById('form-medicao');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('med-edit-id').value;

        const projetoId = document.getElementById('med-projeto').value;
        const gestorId = document.getElementById('med-gestor').value;
        const diretorId = document.getElementById('med-diretor').value || null;
        
        if (!projetoId || !gestorId) {
            alert('Projeto e Gestor são obrigatórios!');
            return;
        }

        const isAcerto = document.getElementById('med-tipo-acerto')?.checked || false;
        
        const valorDonStr = document.getElementById('med-valor-don').value;
        const valorStatusStr = document.getElementById('med-valor-status').value;
        
        let valorDon = valorParaNumero(valorDonStr);
        let valorStatus = valorParaNumero(valorStatusStr);

        // Se for ACERTO: força valor_don negativo e zera o status
        if (isAcerto) {
            // Garante que o valor seja negativo
            valorDon = -Math.abs(valorDon);
            valorStatus = 0;
        }

        const dados = {
            projeto_id: parseInt(projetoId),
            gestor_logictel_id: parseInt(gestorId),
            diretor_id: diretorId ? parseInt(diretorId) : null,
            mes: document.getElementById('med-mes').value,
            ano: parseInt(document.getElementById('med-ano').value),
            valor_don: valorDon,
            valor_status: valorStatus,
            observacao: document.getElementById('med-observacao').value || null,
            data_email_medicao: document.getElementById('med-data-email').value || null,
            status_medicao: document.getElementById('med-status').value
        };

        try {
            let result;
            if (editId) {
                result = await supabaseClient
                    .from('medicoes')
                    .update(dados)
                    .eq('id', parseInt(editId));
            } else {
                result = await supabaseClient
                    .from('medicoes')
                    .insert([dados]);
            }

            if (result.error) {
                alert('Erro: ' + result.error.message);
                return;
            }

            alert(editId ? 'Medição atualizada!' : 'Medição salva!');
            form.reset();
            document.getElementById('med-edit-id').value = '';
            document.getElementById('med-cancel-btn').style.display = 'none';
            
            const checkbox = document.getElementById('med-tipo-acerto');
            if (checkbox) {
                checkbox.checked = false;
                toggleTipoAcerto();
            }
            
            carregarMedicoes();
            carregarHistoricoMedicoes();
            carregarFiltros();
            aplicarMascaras();
        } catch (err) {
            console.error('Erro ao salvar medição:', err);
            alert('Erro ao salvar medição.');
        }
    });
}

// =====================================================
// EDIÇÃO DE MEDIÇÃO
// =====================================================
export async function editarMedicao(id) {
    try {
        const { data, error } = await supabaseClient
            .from('medicoes')
            .select(`
                id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes,
                ano,
                valor_don,
                valor_status,
                observacao,
                data_email_medicao,
                status_medicao
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao carregar medição:', error);
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) {
            alert('Medição não encontrada!');
            return;
        }

        window.mudarAba('cad-medicao');

        setTimeout(() => {
            const valorDon = Number(data.valor_don || 0);
            const valorStatus = Number(data.valor_status || 0);
            const isAcerto = valorDon < 0;

            document.getElementById('med-edit-id').value = id;
            document.getElementById('med-projeto').value = data.projeto_id || '';
            document.getElementById('med-gestor').value = data.gestor_logictel_id || '';
            document.getElementById('med-diretor').value = data.diretor_id || '';
            document.getElementById('med-mes').value = data.mes || '';
            document.getElementById('med-ano').value = data.ano || '';
            document.getElementById('med-valor-don').value = valorDon.toLocaleString('pt-BR', { minFractionDigits: 2 });
            document.getElementById('med-valor-status').value = valorStatus.toLocaleString('pt-BR', { minFractionDigits: 2 });
            document.getElementById('med-observacao').value = data.observacao || '';
            document.getElementById('med-data-email').value = data.data_email_medicao || '';
            document.getElementById('med-status').value = data.status_medicao || '';
            document.getElementById('med-cancel-btn').style.display = 'inline-block';

            const checkbox = document.getElementById('med-tipo-acerto');
            if (checkbox) {
                checkbox.checked = isAcerto;
                toggleTipoAcerto();
            }

            document.getElementById('form-medicao').scrollIntoView({ behavior: 'smooth' });
        }, 300);
        
    } catch (e) {
        console.error('Erro ao editar medição:', e);
        alert('Erro ao carregar dados da medição.');
    }
}

export async function excluirMedicao(id) {
    if (!confirm('Tem certeza que deseja excluir esta medição?')) return;
    try {
        const { error } = await supabaseClient
            .from('medicoes')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro: ' + error.message);
            return;
        }

        alert('Medição excluída!');
        carregarMedicoes();
        carregarHistoricoMedicoes();
        carregarFiltros();
    } catch (e) {
        console.error('Erro ao excluir medição:', e);
        alert('Erro ao excluir medição.');
    }
}

if (typeof window !== 'undefined') {
    window.editarMedicao = editarMedicao;
    window.excluirMedicao = excluirMedicao;
    window.irParaPaginaMed = irParaPaginaMed;
    window.irParaPaginaHistMed = irParaPaginaHistMed;
    window.filtrarMedicoes = filtrarMedicoes;
    window.limparFiltrosMedicoes = limparFiltrosMedicoes;
    window.filtrarHistoricoMedicoes = filtrarHistoricoMedicoes;
    window.limparFiltrosHistoricoMedicoes = limparFiltrosHistoricoMedicoes;
    window.toggleTipoAcerto = toggleTipoAcerto;
}