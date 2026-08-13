// dccards.js
import { supabaseClient } from './config.js';
import { mudarAba } from './navigation.js';
import { carregarConsumos } from './consumo.js';
import { paginar, renderizarPaginacao } from './utils.js';

const ITENS_POR_PAGINA_DC = 12;
let _paginaAtualDC = 1;
let _consumoEmVisualizacao = null;

// Guardar o status ID de "Falta Aprovar CRE" para o filtro inicial
let _statusFaltaAprovarCREId = null;

export function irParaPaginaDC(pagina) {
    _paginaAtualDC = pagina;
    carregarDCCards();
}

// Chamado pelos filtros da tela (reseta para a página 1 a cada nova busca).
export function filtrarDCCards() {
    _paginaAtualDC = 1;
    carregarDCCards();
}

// Limpar todos os filtros da aba DC's
export function limparFiltrosDCCards() {
    document.getElementById('filt-dcs-dc').value = '';
    document.getElementById('filt-dcs-status').value = '';
    document.getElementById('filt-dcs-status-nf').value = '';
    document.getElementById('filt-dcs-projeto').value = '';
    document.getElementById('filt-dcs-data').value = '';
    _paginaAtualDC = 1;
    carregarDCCards();
}

// Função para formatar data no formato dd/mm/aaaa
function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string' && dataStr.includes('/')) {
            return dataStr;
        }
        if (typeof dataStr === 'string') {
            let dataPart = dataStr;
            if (dataStr.includes('T')) {
                dataPart = dataStr.split('T')[0];
            }
            const partes = dataPart.split('-');
            if (partes.length === 3) {
                return `${partes[2]}/${partes[1]}/${partes[0]}`;
            }
        }
        return '-';
    } catch {
        return '-';
    }
}

// Função para criar uma data a partir de uma string, interpretando corretamente
function criarData(dataStr) {
    if (!dataStr) return null;
    try {
        if (typeof dataStr === 'string' && dataStr.includes('/')) {
            const partes = dataStr.split('/');
            if (partes.length === 3) {
                return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
            }
        }
        if (typeof dataStr === 'string') {
            let dataPart = dataStr;
            if (dataStr.includes('T')) {
                dataPart = dataStr.split('T')[0];
            }
            const partes = dataPart.split('-');
            if (partes.length === 3) {
                return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
            }
        }
        const data = new Date(dataStr);
        if (!isNaN(data.getTime())) {
            return data;
        }
        return null;
    } catch {
        return null;
    }
}

// Função para calcular Aging
function calcularAging(dataSolicitacaoStr) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (!dataSolicitacaoStr) {
        return { dias: 0, class: 'verde', texto: '0 dia(s)' };
    }
    
    try {
        const dataSolicitacao = criarData(dataSolicitacaoStr);
        if (!dataSolicitacao || isNaN(dataSolicitacao.getTime())) {
            return { dias: 0, class: 'verde', texto: '0 dia(s)' };
        }
        dataSolicitacao.setHours(0, 0, 0, 0);
        const diffTime = hoje - dataSolicitacao;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const dias = diffDays < 0 ? 0 : diffDays;
        
        let agingClass = 'verde';
        if (dias >= 4 && dias <= 6) { agingClass = 'amarelo'; }
        else if (dias > 6) { agingClass = 'vermelho'; }
        
        return { dias: dias, class: agingClass, texto: `${dias} dia(s)` };
    } catch {
        return { dias: 0, class: 'verde', texto: '0 dia(s)' };
    }
}

// Função para buscar o ID do status "Falta Aprovar CRE"
async function buscarStatusFaltaAprovarCRE() {
    if (_statusFaltaAprovarCREId) return _statusFaltaAprovarCREId;
    
    try {
        const { data, error } = await supabaseClient
            .from('status_nf')
            .select('id')
            .ilike('nome', '%Falta aprovar CRE%')
            .maybeSingle();
        
        if (error) {
            console.error('Erro ao buscar status Falta Aprovar CRE:', error);
            return null;
        }
        if (data) {
            _statusFaltaAprovarCREId = String(data.id);
            return _statusFaltaAprovarCREId;
        }
        return null;
    } catch (e) {
        console.error('Erro ao buscar status Falta Aprovar CRE:', e);
        return null;
    }
}

export async function carregarDCCards() {
    const container = document.getElementById('dc-cards-container');
    if (!container) return;

    container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Carregando DC\'s...</div>';

    const filtroDC = document.getElementById('filt-dcs-dc')?.value?.toLowerCase() || '';
    const filtroStatus = document.getElementById('filt-dcs-status')?.value || '';
    const filtroStatusNf = document.getElementById('filt-dcs-status-nf')?.value || '';
    const filtroProjeto = document.getElementById('filt-dcs-projeto')?.value || '';
    const filtroData = document.getElementById('filt-dcs-data')?.value || '';

    try {
        let query = supabaseClient
            .from('consumo_dc')
            .select(`
                *,
                projetos (nome)
            `);

        const { data: consumos, error } = await query.order('criado_em', { ascending: false });

        const paginacaoEl = document.getElementById('dc-cards-pagination');

        if (error) {
            container.innerHTML = `<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar DC's: ${error.message}</div>`;
            if (paginacaoEl) paginacaoEl.innerHTML = '';
            return;
        }

        if (!consumos || consumos.length === 0) {
            container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Nenhuma DC cadastrada.</div>';
            if (paginacaoEl) paginacaoEl.innerHTML = '';
            return;
        }

        const { data: statusList } = await supabaseClient
            .from('status_dc')
            .select('id, codigo, nome, motivo, responsavel, cor');

        const statusMap = {};
        if (statusList) {
            statusList.forEach(s => {
                statusMap[s.id] = s;
            });
        }

        const dcMap = new Map();
        consumos.forEach(c => {
            const dcNum = c.dc;
            if (!dcMap.has(dcNum) || new Date(c.criado_em) > new Date(dcMap.get(dcNum).criado_em)) {
                dcMap.set(dcNum, c);
            }
        });

        const dcs = Array.from(dcMap.values());

        const filtrados = dcs.filter(c => {
            if (filtroDC && !c.dc.toLowerCase().includes(filtroDC)) return false;
            if (filtroStatus && c.status_id && c.status_id.toString() !== filtroStatus) return false;
            if (filtroStatusNf && c.status_nf && c.status_nf.toString() !== filtroStatusNf) return false;
            if (filtroProjeto) {
                const nomeProjeto = c.projetos?.nome || '';
                if (!nomeProjeto.toLowerCase().includes(filtroProjeto.toLowerCase())) return false;
            }
            if (filtroData) {
                const dataRef = c.data_solicitacao_faturamento || c.criado_em;
                if (!dataRef) return false;
                const dataObj = criarData(dataRef);
                if (!dataObj || isNaN(dataObj.getTime())) return false;
                const dataStr = dataObj.toISOString().split('T')[0];
                if (dataStr !== filtroData) return false;
            }
            return true;
        });

        if (filtrados.length === 0) {
            container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Nenhuma DC encontrada.</div>';
            if (paginacaoEl) paginacaoEl.innerHTML = '';
            return;
        }

        const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITENS_POR_PAGINA_DC));
        if (_paginaAtualDC > totalPaginas) _paginaAtualDC = totalPaginas;
        const pagina = paginar(filtrados, _paginaAtualDC, ITENS_POR_PAGINA_DC);

        container.innerHTML = '';

        pagina.forEach(c => {
            const statusInfo = c.status_id ? statusMap[c.status_id] : null;
            const statusNome = statusInfo ? `${statusInfo.codigo} - ${statusInfo.nome}` : (c.status_dc || 'Sem status');
            const statusMotivo = statusInfo ? statusInfo.motivo : (c.motivo || '');
            const statusResponsavel = statusInfo ? statusInfo.responsavel : (c.responsavel || '');

            const statusClass = statusResponsavel === 'V.tal' ? 'vtal' : 'logictel';
            const borderColor = statusResponsavel === 'V.tal' ? '#FF6B35' : '#3498DB';

            const valorDc = Number(c.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
            const projetoNome = c.projetos?.nome || 'N/A';

            const dataSolicitacao = c.data_solicitacao_faturamento || c.criado_em;
            const aging = calcularAging(dataSolicitacao);
            const dataExibicao = formatarDataBr(dataSolicitacao);

            const statusIcon = statusResponsavel === 'V.tal' ? '⚠️' : '✅';

            container.innerHTML += `
                <div class="dc-card" onclick="abrirVisualizacaoDC(${c.id})" style="border-left-color: ${borderColor};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <div class="dc-number" style="font-size:15px;">DC ${c.dc}</div>
                        <div style="font-family:'IBM Plex Mono', monospace; font-size:15px; font-weight:700; color:var(--text);">R$ ${valorDc}</div>
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                        <div class="dc-status ${statusClass}" style="font-size:10px; padding:2px 8px;">${statusNome}</div>
                    </div>
                    
                    <div style="font-size:11px; color:var(--text-soft); margin-bottom:4px;">📋 ${projetoNome}</div>
                    
                    <div class="dc-motivo" style="font-size:10.5px; padding:4px 8px; margin-bottom:6px;">${statusIcon} ${statusMotivo || 'Sem observação'}</div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; border-top:1px solid var(--border); padding-top:6px;">
                        <div class="dc-updated" style="margin:0; font-size:10.5px;">📅 ${dataExibicao}</div>
                        <div class="dc-aging ${aging.class}" style="margin:0; font-size:10.5px;">🏠 Aging: ${aging.texto}</div>
                    </div>
                    
                    ${c.pedido ? `<div style="font-size:10px;color:var(--text-soft);margin-top:4px;">👤 Pedido: ${c.pedido}</div>` : ''}
                    ${c.fr ? `<div style="font-size:10px;color:var(--text-soft);margin-top:2px;">📄 FR: ${c.fr}</div>` : ''}
                </div>
            `;
        });

        if (paginacaoEl) {
            paginacaoEl.innerHTML = renderizarPaginacao(_paginaAtualDC, filtrados.length, ITENS_POR_PAGINA_DC, 'irParaPaginaDC');
        }
    } catch (e) {
        console.error('Erro inesperado:', e);
        container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar DC\'s.</div>';
    }
}

// =====================================================
// FUNÇÕES DE VISUALIZAÇÃO DA DC
// =====================================================

// Abrir a visualização da DC
window.abrirVisualizacaoDC = async function(id) {
    try {
        // Buscar os dados do consumo
        const { data, error } = await supabaseClient
            .from('consumo_dc')
            .select(`
                *,
                projetos (nome)
            `)
            .eq('id', id)
            .single();

        if (error) {
            alert('Erro ao carregar dados: ' + error.message);
            return;
        }
        if (!data) {
            alert('Dados não encontrados!');
            return;
        }

        _consumoEmVisualizacao = data;
        
        // Buscar status DC para mostrar o nome
        let statusNome = data.status_dc || 'Sem status';
        if (data.status_id) {
            const { data: statusInfo } = await supabaseClient
                .from('status_dc')
                .select('codigo, nome')
                .eq('id', data.status_id)
                .single();
            if (statusInfo) {
                statusNome = `${statusInfo.codigo} - ${statusInfo.nome}`;
            }
        }

        // Buscar nome do status NF
        let statusNfNome = data.status_nf || 'Sem status';
        if (data.status_nf) {
            const { data: statusNfInfo } = await supabaseClient
                .from('status_nf')
                .select('nome')
                .eq('id', data.status_nf)
                .single();
            if (statusNfInfo) {
                statusNfNome = statusNfInfo.nome;
            }
        }

        // Buscar nome do gestor
        let gestorNome = 'N/A';
        if (data.gestor_logictel_id) {
            const { data: gestorInfo } = await supabaseClient
                .from('gestores_logictel')
                .select('nome')
                .eq('id', data.gestor_logictel_id)
                .single();
            if (gestorInfo) {
                gestorNome = gestorInfo.nome;
            }
        }

        // Buscar nome do diretor
        let diretorNome = 'N/A';
        if (data.diretor_id) {
            const { data: diretorInfo } = await supabaseClient
                .from('diretores')
                .select('nome')
                .eq('id', data.diretor_id)
                .single();
            if (diretorInfo) {
                diretorNome = diretorInfo.nome;
            }
        }

        // Buscar nome da empresa
        let empresaNome = 'N/A';
        if (data.empresa_id) {
            const { data: empresaInfo } = await supabaseClient
                .from('empresas')
                .select('nome')
                .eq('id', data.empresa_id)
                .single();
            if (empresaInfo) {
                empresaNome = empresaInfo.nome;
            }
        }

        const projetoNome = data.projetos?.nome || data.projeto || 'N/A';
        const valorFormatado = Number(data.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
        const dataSolicitacaoFormatada = formatarDataBr(data.data_solicitacao_faturamento);
        const dataEmissaoNfFormatada = formatarDataBr(data.data_emissao_nf);

        // Montar o HTML do modal
        const conteudo = document.getElementById('modal-visualizacao-conteudo');
        conteudo.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px 24px; font-size:13px;">
                <div><strong>DC:</strong> <span id="vis-dc">${data.dc || '-'}</span></div>
                <div><strong>Valor:</strong> <span id="vis-valor">R$ ${valorFormatado}</span></div>
                <div><strong>Projeto:</strong> <span id="vis-projeto">${projetoNome}</span></div>
                <div><strong>Status DC:</strong> <span id="vis-status-dc">${statusNome}</span></div>
                <div><strong>Status NF:</strong> <span id="vis-status-nf">${statusNfNome}</span></div>
                <div><strong>Tipo Medição:</strong> <span id="vis-tipo-medicao">${data.tipo_medicao || 'PA'}</span></div>
                <div><strong>Data Solicitação:</strong> <span id="vis-data-solicitacao">${dataSolicitacaoFormatada}</span></div>
                <div><strong>Data Emissão NF:</strong> <span id="vis-data-nf">${dataEmissaoNfFormatada}</span></div>
                <div><strong>Nº NF:</strong> <span id="vis-num-nf">${data.num_nf || '-'}</span></div>
                <div><strong>Pedido:</strong> <span id="vis-pedido">${data.pedido || '-'}</span></div>
                <div><strong>FR:</strong> <span id="vis-fr">${data.fr || '-'}</span></div>
                <div><strong>Mês Apropriação:</strong> <span id="vis-mes-aprop">${data.mes_apropriacao || '-'}</span></div>
                <div><strong>Mês Medido:</strong> <span id="vis-mes-medido">${data.mes_medido || '-'}</span></div>
                <div><strong>Ano:</strong> <span id="vis-ano">${data.ano || '-'}</span></div>
                <div><strong>Empresa:</strong> <span id="vis-empresa">${empresaNome}</span></div>
                <div><strong>Gestor Logictel:</strong> <span id="vis-gestor">${gestorNome}</span></div>
                <div><strong>Diretor Cliente:</strong> <span id="vis-diretor">${diretorNome}</span></div>
                <div><strong>Centro de Custo:</strong> <span id="vis-centro-custo">${data.centro_custo || '-'}</span></div>
                <div><strong>Item:</strong> <span id="vis-item">${data.item || '-'}</span></div>
                <div><strong>PO:</strong> <span id="vis-po">${data.po || '-'}</span></div>
            </div>
            <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border);">
                <strong>Motivo/Observação:</strong><br>
                <span id="vis-motivo" style="color:var(--text-muted);">${data.motivo || 'Sem observação'}</span>
            </div>
        `;

        // Salvar o ID para uso no botão editar
        document.getElementById('btn-editar-visualizacao').dataset.id = id;

        // Mostrar o modal
        document.getElementById('modal-visualizacao-dc').style.display = 'flex';
        document.getElementById('btn-editar-visualizacao').textContent = '✏️ Editar';
        document.getElementById('btn-editar-visualizacao').className = 'btn-primary';
        document.getElementById('btn-editar-visualizacao').style.padding = '10px 24px';

    } catch (e) {
        console.error('Erro ao abrir visualização:', e);
        alert('Erro ao carregar dados para visualização.');
    }
};

// Fechar a visualização
window.fecharVisualizacaoDC = function() {
    document.getElementById('modal-visualizacao-dc').style.display = 'none';
    _consumoEmVisualizacao = null;
};

// Habilitar edição a partir da visualização
window.habilitarEdicaoVisualizacao = function() {
    const id = document.getElementById('btn-editar-visualizacao').dataset.id;
    if (!id) return;
    
    // Fechar o modal
    fecharVisualizacaoDC();
    
    // Abrir a edição completa
    window.mudarAba('cad-consumo');
    setTimeout(function() {
        window.editarConsumo(parseInt(id));
    }, 300);
};

export function irParaConsumo(dc) {
    mudarAba('cad-consumo');
    document.getElementById('dc-numero').value = dc;
    carregarConsumos();
}