import { supabaseClient } from './config.js';
import { valorParaNumero, aplicarMascaras, paginar, renderizarPaginacao } from './utils.js';
import { carregarFiltros } from './selects.js';
import { carregarDCCards } from './dccards.js';
import { mudarAba } from './navigation.js';

// =====================================================
// GESTORES POR PROJETO (combo dependente)
// =====================================================
export async function carregarGestoresPorProjeto() {
    const projetoId = document.getElementById('dc-projeto').value;
    const gestorSelect = document.getElementById('dc-gestor');

    if (!projetoId) {
        gestorSelect.innerHTML = '<option value="">Selecione...</option>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .rpc('get_gestores_by_projeto', { p_projeto_id: parseInt(projetoId) });

        if (error) {
            console.error('Erro ao carregar gestores por projeto:', error);
            return;
        }

        gestorSelect.innerHTML = '<option value="">Selecione...</option>';
        if (data && data.length > 0) {
            data.forEach(g => {
                gestorSelect.innerHTML += `<option value="${g.id}">${g.nome}</option>`;
            });
        }
    } catch (e) {
        console.error('Erro ao carregar gestores por projeto:', e);
    }
}

// =====================================================
// CONTROLAR CAMPOS DE NF (habilitar/exigir conforme status)
// =====================================================
export function controlarCamposNF() {
    const selectStatusNf = document.getElementById('dc-status-nf');
    const nomeStatus = (selectStatusNf?.selectedOptions?.[0]?.textContent || '').toLowerCase();
    const numNf = document.getElementById('dc-num-nf');
    const dataNf = document.getElementById('dc-data-nf');
    const extras = document.getElementById('campos-extras-consumo');

    const isEmitida = nomeStatus.includes('emitid');

    if (numNf && dataNf && extras) {
        if (isEmitida) {
            numNf.disabled = false;
            numNf.required = true;
            dataNf.disabled = false;
            dataNf.required = true;
            extras.classList.add('visible');
        } else {
            numNf.disabled = true;
            numNf.required = false;
            extras.classList.remove('visible');
        }
    }
}

// =====================================================
// FUNÇÃO PARA CARREGAR TODOS OS SELECTS DO FORMULÁRIO
// =====================================================
async function carregarSelectsConsumo() {
    await carregarStatusDCCustom('dc-status-dc');
    await carregarSelectStatus('dc-status-nf', 'status_nf');
    await carregarSelectGestores('dc-gestor', 'gestores_logictel');
    await carregarSelectDiretores('dc-diretor');
    await carregarSelectEmpresas('dc-empresa');
    await carregarSelectProjetos('dc-projeto');
}

// =====================================================
// CRUD CONSUMOS
// =====================================================
let _todosConsumos = [];
let _statusNfMap = {};

const ITENS_POR_PAGINA_CONSUMO = 15;
let _paginaAtualConsumo = 1;

export function irParaPaginaConsumo(pagina) {
    _paginaAtualConsumo = pagina;
    renderizarTabelaConsumos();
}

export async function carregarConsumos() {
    const tbody = document.getElementById('tabela-consumos');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id,
                dc,
                pedido,
                empresa_id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes_apropriacao,
                ano,
                valor,
                mes_medido,
                data_solicitacao_faturamento,
                status_dc,
                status_id,
                status_nf,
                num_nf,
                data_emissao_nf,
                centro_custo,
                item,
                po,
                fr,
                tipo_medicao,
                motivo,
                responsavel,
                ultima_atualizacao,
                observacoes_consumo,
                empresas(nome),
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome)
            `)
            .order('id', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`;
            return;
        }

        const { data: statusNfList } = await supabaseClient.from('status_nf').select('id, nome');
        _statusNfMap = {};
        if (statusNfList) {
            statusNfList.forEach(s => { _statusNfMap[s.id] = s.nome; });
        }

        _todosConsumos = data || [];
        atualizarDatalistsConsumo(_todosConsumos);
        _paginaAtualConsumo = 1;
        renderizarTabelaConsumos();
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

function atualizarDatalistsConsumo(data) {
    const dcList = document.getElementById('dclist-consumo');
    if (dcList) {
        const dcs = [...new Set(data.map(c => c.dc).filter(Boolean))].sort();
        dcList.innerHTML = dcs.map(v => `<option value="${v}"></option>`).join('');
    }
    const pedidoList = document.getElementById('pedidolist-consumo');
    if (pedidoList) {
        const pedidos = [...new Set(data.map(c => c.pedido).filter(Boolean))].sort();
        pedidoList.innerHTML = pedidos.map(v => `<option value="${v}"></option>`).join('');
    }
}

function lerFiltrosConsumo() {
    return {
        dc: (document.getElementById('filt-consumo-dc')?.value || '').toLowerCase().trim(),
        pedido: (document.getElementById('filt-consumo-pedido')?.value || '').toLowerCase().trim(),
        projeto: document.getElementById('filt-consumo-projeto')?.value || '',
        tipoMedicao: document.getElementById('filt-consumo-tipo-medicao')?.value || '',
        diretor: document.getElementById('filt-consumo-diretor')?.value || '',
        mesApropriacao: document.getElementById('filt-consumo-mes-apropriacao')?.value || '',
        mesMedido: document.getElementById('filt-consumo-mes-medido')?.value || '',
        dataSolicitacao: (document.getElementById('filt-consumo-data-solicitacao')?.value || '').trim(),
        fr: (document.getElementById('filt-consumo-fr')?.value || '').toLowerCase().trim(),
        statusDc: document.getElementById('filt-consumo-status-dc')?.value || '',
        statusNf: document.getElementById('filt-consumo-status-nf')?.value || '',
        numNf: (document.getElementById('filt-consumo-num-nf')?.value || '').toLowerCase().trim(),
        dataEmissaoNf: (document.getElementById('filt-consumo-data-emissao-nf')?.value || '').trim(),
        // NOVOS FILTROS DE VALOR
        valorExato: document.getElementById('filt-consumo-valor-exato')?.value || '',
        valorDe: document.getElementById('filt-consumo-valor-de')?.value || '',
        valorAte: document.getElementById('filt-consumo-valor-ate')?.value || ''
    };
}

function aplicarFiltrosConsumo(lista, f) {
    // Converter valores para número
    const valorExato = f.valorExato ? valorParaNumero(f.valorExato) : null;
    const valorDe = f.valorDe ? valorParaNumero(f.valorDe) : null;
    const valorAte = f.valorAte ? valorParaNumero(f.valorAte) : null;

    return lista.filter(c => {
        if (f.dc && !String(c.dc || '').toLowerCase().includes(f.dc)) return false;
        if (f.pedido && !String(c.pedido || '').toLowerCase().includes(f.pedido)) return false;
        if (f.projeto && String(c.projeto_id) !== f.projeto) return false;
        if (f.tipoMedicao && (c.tipo_medicao || 'PA') !== f.tipoMedicao) return false;
        if (f.diretor && String(c.diretor_id) !== f.diretor) return false;
        if (f.mesApropriacao && c.mes_apropriacao !== f.mesApropriacao) return false;
        if (f.mesMedido && c.mes_medido !== f.mesMedido) return false;
        if (f.dataSolicitacao && !String(c.data_solicitacao_faturamento || '').includes(f.dataSolicitacao)) return false;
        if (f.fr && !String(c.fr || '').toLowerCase().includes(f.fr)) return false;
        if (f.statusDc && String(c.status_id) !== f.statusDc) return false;
        if (f.statusNf && String(c.status_nf) !== f.statusNf) return false;
        if (f.numNf && !String(c.num_nf || '').toLowerCase().includes(f.numNf)) return false;
        if (f.dataEmissaoNf && !String(c.data_emissao_nf || '').includes(f.dataEmissaoNf)) return false;
        
        // FILTROS DE VALOR
        const valor = Number(c.valor || 0);
        
        // Valor exato (se preenchido)
        if (valorExato !== null && valor !== valorExato) return false;
        
        // Range de valores (se preenchidos)
        if (valorDe !== null && valor < valorDe) return false;
        if (valorAte !== null && valor > valorAte) return false;
        
        return true;
    });
}

export function filtrarConsumos() {
    _paginaAtualConsumo = 1;
    renderizarTabelaConsumos();
}

export function limparFiltrosConsumo() {
    [
        'filt-consumo-dc', 'filt-consumo-pedido', 'filt-consumo-projeto', 'filt-consumo-tipo-medicao',
        'filt-consumo-diretor', 'filt-consumo-mes-apropriacao', 'filt-consumo-mes-medido',
        'filt-consumo-data-solicitacao', 'filt-consumo-fr', 'filt-consumo-status-dc',
        'filt-consumo-status-nf', 'filt-consumo-num-nf', 'filt-consumo-data-emissao-nf',
        // NOVOS FILTROS DE VALOR
        'filt-consumo-valor-exato', 'filt-consumo-valor-de', 'filt-consumo-valor-ate'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    _paginaAtualConsumo = 1;
    renderizarTabelaConsumos();
}

function renderizarTabelaConsumos() {
    const tbody = document.getElementById('tabela-consumos');
    if (!tbody) return;

    const f = lerFiltrosConsumo();
    const data = aplicarFiltrosConsumo(_todosConsumos, f);
    const paginacaoEl = document.getElementById('consumo-pagination');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Nenhum consumo encontrado.</td></tr>';
        if (paginacaoEl) paginacaoEl.innerHTML = '';
        return;
    }

    const totalPaginas = Math.max(1, Math.ceil(data.length / ITENS_POR_PAGINA_CONSUMO));
    if (_paginaAtualConsumo > totalPaginas) _paginaAtualConsumo = totalPaginas;
    const pagina = paginar(data, _paginaAtualConsumo, ITENS_POR_PAGINA_CONSUMO);

    try {
        tbody.innerHTML = '';
        pagina.forEach(c => {
            const tipoMed = c.tipo_medicao || 'PA';
            const nomeStatusNf = _statusNfMap[c.status_nf] || c.status_nf || '-';
            const isEmitida = String(nomeStatusNf).toLowerCase().includes('emitid');
            
            const tipoClass = tipoMed === 'FI' ? 'fi' : 'pa';
            const statusBadgeClass = isEmitida ? 'logictel' : 'vtal';
            
            const gestorNome = c.gestores_logictel?.nome || '-';
            const gestorTruncado = gestorNome.length > 14 ? gestorNome.substring(0, 12) + '…' : gestorNome;
            
            const projetoNome = c.projetos?.nome || '-';
            const projetoTruncado = projetoNome.length > 12 ? projetoNome.substring(0, 10) + '…' : projetoNome;
            
            tbody.innerHTML += `
                <tr class="td-row">
                    <td class="coluna-sticky coluna-sticky-first" style="font-weight:600;">${c.dc || '-'}</td>
                    <td title="${projetoNome}">${projetoTruncado}</td>
                    <td title="${gestorNome}">${gestorTruncado}</td>
                    <td><span class="tipo-badge ${tipoClass}">${tipoMed}</span></td>
                    <td>${c.mes_apropriacao || '-'}</td>
                    <td>${c.mes_medido || '-'}</td>
                    <td><span class="status-badge-compact ${statusBadgeClass}">${nomeStatusNf}</span></td>
                    <td class="coluna-valor">R$ ${Number(c.valor).toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                    <td class="coluna-acoes">
                        <button onclick="editarConsumo(${c.id})" class="btn-edit" title="Editar">✎</button>
                        <button onclick="excluirConsumo(${c.id})" class="btn-danger" title="Excluir">✕</button>
                        ${isEmitida ? `<button onclick="exportarExcel(${c.id})" class="btn-excel" title="Exportar Excel">📊</button>` : ''}
                    </td>
                </tr>`;
        });
        if (paginacaoEl) {
            paginacaoEl.innerHTML = renderizarPaginacao(_paginaAtualConsumo, data.length, ITENS_POR_PAGINA_CONSUMO, 'irParaPaginaConsumo');
        }
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormConsumo() {
    document.getElementById('form-consumo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('consumo-edit-id').value;
        const agora = new Date().toISOString();

        const empresaId = document.getElementById('dc-empresa').value;
        const projetoId = document.getElementById('dc-projeto').value;
        const gestorId = document.getElementById('dc-gestor').value;
        const diretorId = document.getElementById('dc-diretor').value || null;
        const statusId = document.getElementById('dc-status-dc').value;

        if (!empresaId || !projetoId || !gestorId) {
            alert('Empresa, Projeto e Gestor são obrigatórios!');
            return;
        }

        const dados = {
            dc: document.getElementById('dc-numero').value.trim(),
            pedido: document.getElementById('dc-pedido').value.trim() || null,
            empresa_id: parseInt(empresaId),
            projeto_id: parseInt(projetoId),
            gestor_logictel_id: parseInt(gestorId),
            diretor_id: diretorId ? parseInt(diretorId) : null,
            tipo_medicao: document.getElementById('dc-tipo-medicao').value,
            mes_apropriacao: document.getElementById('dc-mes-apropriacao').value,
            ano: parseInt(document.getElementById('dc-ano').value),
            valor: valorParaNumero(document.getElementById('dc-valor').value),
            mes_medido: document.getElementById('dc-mes-medido').value,
            data_solicitacao_faturamento: document.getElementById('dc-data-solicitacao').value,
            fr: document.getElementById('dc-fr').value.trim() || null,
            status_id: statusId || null,
            status_nf: document.getElementById('dc-status-nf').value,
            num_nf: document.getElementById('dc-num-nf').value || null,
            data_emissao_nf: document.getElementById('dc-data-nf').value || null,
            centro_custo: document.getElementById('dc-centro-custo').value || null,
            item: document.getElementById('dc-item').value || null,
            po: document.getElementById('dc-po').value || null,
            observacoes_consumo: document.getElementById('dc-observacoes').value || null,
            ultima_atualizacao: agora
        };

        if (!dados.dc) {
            alert('Número da DC é obrigatório!');
            return;
        }

        try {
            let result;
            if (editId) {
                result = await supabaseClient
                    .from('consumo_dc')
                    .update(dados)
                    .eq('id', parseInt(editId));
            } else {
                result = await supabaseClient
                    .from('consumo_dc')
                    .insert([dados]);
            }

            if (result.error) {
                alert('Erro: ' + result.error.message);
                return;
            }

            alert(editId ? 'Consumo atualizado!' : 'Consumo salvo!');
            
            // Limpar o formulário
            e.target.reset();
            document.getElementById('consumo-edit-id').value = '';
            document.getElementById('consumo-cancel-btn').style.display = 'none';
            document.getElementById('campos-extras-consumo').classList.remove('visible');
            controlarCamposNF();
            
            // Recarregar os dados
            carregarConsumos();
            carregarFiltros();
            carregarDCCards();
            aplicarMascaras();
            
            // Redirecionar para a tela de Histórico Consumo das DCs
            mudarAba('historico-consumo-dcs');
            
        } catch (err) {
            console.error('Erro ao salvar consumo:', err);
            alert('Erro ao salvar consumo.');
        }
    });
}

export async function editarConsumo(id) {
    try {
        const { data, error } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id,
                dc,
                pedido,
                empresa_id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes_apropriacao,
                ano,
                valor,
                mes_medido,
                data_solicitacao_faturamento,
                status_dc,
                status_id,
                status_nf,
                num_nf,
                data_emissao_nf,
                centro_custo,
                item,
                po,
                fr,
                tipo_medicao,
                observacoes_consumo
            `)
            .eq('id', id)
            .single();

        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) {
            alert('Dados não encontrados!');
            return;
        }

        mudarAba('cad-consumo');

        await carregarSelectsConsumo();

        document.getElementById('consumo-edit-id').value = id;
        document.getElementById('dc-numero').value = data.dc || '';
        document.getElementById('dc-pedido').value = data.pedido || '';
        
        document.getElementById('dc-empresa').value = data.empresa_id || '';
        document.getElementById('dc-projeto').value = data.projeto_id || '';
        document.getElementById('dc-gestor').value = data.gestor_logictel_id || '';
        document.getElementById('dc-tipo-medicao').value = data.tipo_medicao || '';
        document.getElementById('dc-diretor').value = data.diretor_id || '';
        document.getElementById('dc-mes-apropriacao').value = data.mes_apropriacao || '';
        document.getElementById('dc-ano').value = data.ano || '';
        document.getElementById('dc-mes-medido').value = data.mes_medido || '';
        document.getElementById('dc-data-solicitacao').value = data.data_solicitacao_faturamento || '';
        document.getElementById('dc-fr').value = data.fr || '';
        document.getElementById('dc-status-dc').value = data.status_id || '';
        document.getElementById('dc-status-nf').value = data.status_nf || '';
        document.getElementById('dc-num-nf').value = data.num_nf || '';
        document.getElementById('dc-data-nf').value = data.data_emissao_nf || '';
        document.getElementById('dc-centro-custo').value = data.centro_custo || '';
        document.getElementById('dc-item').value = data.item || '';
        document.getElementById('dc-po').value = data.po || '';
        document.getElementById('dc-observacoes').value = data.observacoes_consumo || '';
        document.getElementById('dc-valor').value = Number(data.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });

        if (data.projeto_id) {
            await carregarGestoresPorProjeto();
            document.getElementById('dc-gestor').value = data.gestor_logictel_id || '';
        }

        const selectStatusNf = document.getElementById('dc-status-nf');
        const nomeStatus = (selectStatusNf?.selectedOptions?.[0]?.textContent || '').toLowerCase();
        const isEmitida = nomeStatus.includes('emitid');
        
        if (isEmitida) {
            document.getElementById('dc-num-nf').disabled = false;
            document.getElementById('dc-num-nf').required = true;
            document.getElementById('dc-data-nf').disabled = false;
            document.getElementById('dc-data-nf').required = true;
            document.getElementById('campos-extras-consumo').classList.add('visible');
        } else {
            document.getElementById('dc-num-nf').disabled = true;
            document.getElementById('dc-num-nf').required = false;
            document.getElementById('dc-data-nf').disabled = true;
            document.getElementById('dc-data-nf').required = false;
            document.getElementById('campos-extras-consumo').classList.remove('visible');
        }

        document.getElementById('consumo-cancel-btn').style.display = 'inline-block';
        document.getElementById('form-consumo').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar consumo:', e);
        alert('Erro ao carregar dados do consumo.');
    }
}

export async function excluirConsumo(id) {
    if (!confirm('Tem certeza que deseja excluir este consumo?')) return;
    try {
        const { error } = await supabaseClient
            .from('consumo_dc')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro: ' + error.message);
            return;
        }

        alert('Consumo excluído!');
        carregarConsumos();
        carregarFiltros();
        carregarDCCards();
    } catch (e) {
        console.error('Erro ao excluir consumo:', e);
        alert('Erro ao excluir consumo.');
    }
}

export async function exportarExcel(id) {
    try {
        const { data, error } = await supabaseClient
            .from('consumo_dc')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            alert('Erro ao buscar dados: ' + error.message);
            return;
        }
        if (!data) {
            alert('Dados não encontrados!');
            return;
        }

        const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const mesIndex = meses.indexOf(data.mes_apropriacao?.toLowerCase().slice(0, 3) || '') + 1;
        const mesAno = `${String(mesIndex || 1).padStart(2, '0')}-${String(data.ano || 2026).slice(2)}`;

        const dadosExcel = {
            'Projeto': data.projeto || '',
            'Contrato': data.num_nf || '',
            'Cent': '',
            'PO': data.po || '',
            'Item': data.item || '',
            'Folha de Registro': data.fr || '',
            'Valor': Number(data.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 }).replace('.', ','),
            'mês/apropriação': mesAno
        };

        const ws = XLSX.utils.json_to_sheet([dadosExcel]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Consumo DC');

        ws['!cols'] = [
            { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
            { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 18 }
        ];

        XLSX.writeFile(wb, `Consumo_DC_${data.dc || 'sem_dc'}_${mesAno}.xlsx`);
    } catch (e) {
        console.error('Erro ao exportar Excel:', e);
        alert('Erro ao exportar arquivo Excel.');
    }
}

import { carregarSelectStatus, carregarSelectGestores, carregarSelectDiretores, carregarSelectEmpresas, carregarSelectProjetos, carregarStatusDCCustom } from './selects.js';