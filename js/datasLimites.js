// datasLimites.js
import { supabaseClient } from './config.js';

// =====================================================
// CRUD DATAS LIMITES
// =====================================================
let _todasDatasLimites = [];

export async function carregarDatasLimites() {
    const tbody = document.getElementById('tabela-datas-limites');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('datas_limites')
            .select('*')
            .order('ano', { ascending: true })
            .order('mes', { ascending: true });

        if (error) {
            console.error('Erro ao carregar datas limites:', error);
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar: ${error.message}</td></tr>`;
            return;
        }

        _todasDatasLimites = data || [];
        carregarFiltrosDatasLimites();
        aplicarFiltrosDatasLimites();

    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// Função para aplicar filtros na tabela
function aplicarFiltrosDatasLimites() {
    const tbody = document.getElementById('tabela-datas-limites');
    if (!tbody) return;

    const filtroMes = document.getElementById('filt-datas-mes')?.value || '';
    const filtroAno = document.getElementById('filt-datas-ano')?.value || '';

    let dadosFiltrados = _todasDatasLimites;

    if (filtroMes) {
        dadosFiltrados = dadosFiltrados.filter(d => d.mes === filtroMes);
    }
    if (filtroAno) {
        dadosFiltrados = dadosFiltrados.filter(d => String(d.ano) === filtroAno);
    }

    // Ordenar por Data Limite FR (do menor para o maior)
    dadosFiltrados.sort((a, b) => {
        const dataA = new Date(a.data_fr + 'T00:00:00');
        const dataB = new Date(b.data_fr + 'T00:00:00');
        return dataA - dataB;
    });

    if (dadosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Nenhuma data limite encontrada.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    dadosFiltrados.forEach(d => {
        const dataFr = formatarDataParaExibicao(d.data_fr);
        const dataNf = formatarDataParaExibicao(d.data_nf);
        tbody.innerHTML += `
            <tr class="td-row">
                <td>${d.mes}</td>
                <td>${d.ano}</td>
                <td>${dataFr}</td>
                <td>${dataNf}</td>
                <td class="text-right">
                    <div class="table-actions" style="justify-content:flex-end;">
                        <button onclick="editarDataLimite(${d.id})" class="btn-edit">Editar</button>
                        <button onclick="excluirDataLimite(${d.id})" class="btn-danger">Excluir</button>
                    </div>
                </td>
            </tr>`;
    });
}

// Função auxiliar para formatar data sem problemas de fuso horário
function formatarDataParaExibicao(dataStr) {
    if (!dataStr) return '-';
    const partes = dataStr.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    try {
        const data = new Date(dataStr + 'T00:00:00');
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    } catch {
        return dataStr;
    }
}

// Função para carregar os filtros de mês e ano
export function carregarFiltrosDatasLimites() {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const selectMes = document.getElementById('filt-datas-mes');
    if (selectMes) {
        const valorAtual = selectMes.value;
        selectMes.innerHTML = '<option value="">Todos os Meses</option>';
        meses.forEach(m => {
            selectMes.innerHTML += `<option value="${m}">${m}</option>`;
        });
        if (valorAtual) selectMes.value = valorAtual;
    }

    // Carregar anos disponíveis a partir dos dados
    const selectAno = document.getElementById('filt-datas-ano');
    if (selectAno) {
        const anos = new Set();
        _todasDatasLimites.forEach(d => anos.add(d.ano));
        const valorAtual = selectAno.value;
        selectAno.innerHTML = '<option value="">Todos os Anos</option>';
        Array.from(anos).sort().forEach(a => {
            selectAno.innerHTML += `<option value="${a}">${a}</option>`;
        });
        if (valorAtual) selectAno.value = valorAtual;
    }
}

// Funções de filtro (expostas no window)
export function filtrarDatasLimites() {
    aplicarFiltrosDatasLimites();
}

export function limparFiltrosDatasLimites() {
    document.getElementById('filt-datas-mes').value = '';
    document.getElementById('filt-datas-ano').value = '';
    aplicarFiltrosDatasLimites();
}

export function initFormDataLimite() {
    const form = document.getElementById('form-datas-limites');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const editId = document.getElementById('datalimite-edit-id').value;
        
        const mes = document.getElementById('datalimite-mes').value;
        const ano = parseInt(document.getElementById('datalimite-ano').value);
        const dataFr = document.getElementById('datalimite-data-fr').value;
        const dataNf = document.getElementById('datalimite-data-nf').value;

        if (!mes || !ano || !dataFr || !dataNf) {
            alert('Todos os campos são obrigatórios!');
            return;
        }

        if (isNaN(new Date(dataFr).getTime()) || isNaN(new Date(dataNf).getTime())) {
            alert('Por favor, selecione datas válidas.');
            return;
        }

        const dados = {
            mes,
            ano,
            data_fr: dataFr,
            data_nf: dataNf,
            atualizado_em: new Date().toISOString()
        };

        try {
            let result;
            
            if (editId) {
                result = await supabaseClient
                    .from('datas_limites')
                    .update(dados)
                    .eq('id', parseInt(editId));
            } else {
                const { data: existente } = await supabaseClient
                    .from('datas_limites')
                    .select('id')
                    .eq('mes', mes)
                    .eq('ano', ano);

                if (existente && existente.length > 0) {
                    alert(`Já existe um registro para ${mes}/${ano}. Use a edição para alterar.`);
                    return;
                }

                dados.criado_em = new Date().toISOString();
                result = await supabaseClient
                    .from('datas_limites')
                    .insert([dados]);
            }

            if (result.error) {
                console.error('Erro do Supabase:', result.error);
                alert('Erro ao salvar: ' + result.error.message);
                return;
            }

            alert(editId ? 'Data limite atualizada com sucesso!' : 'Data limite salva com sucesso!');
            
            form.reset();
            document.getElementById('datalimite-edit-id').value = '';
            document.getElementById('datalimite-cancel-btn').style.display = 'none';
            
            await carregarDatasLimites();
            await atualizarTopbarDatasLimites();
            
        } catch (err) {
            console.error('Erro ao salvar data limite:', err);
            alert('Erro ao salvar data limite.');
        }
    });
}

export async function editarDataLimite(id) {
    try {
        const { data, error } = await supabaseClient
            .from('datas_limites')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            alert('Erro ao carregar: ' + error.message);
            return;
        }
        if (!data) return;

        document.getElementById('datalimite-edit-id').value = id;
        document.getElementById('datalimite-mes').value = data.mes;
        document.getElementById('datalimite-ano').value = data.ano;
        document.getElementById('datalimite-data-fr').value = data.data_fr;
        document.getElementById('datalimite-data-nf').value = data.data_nf;
        document.getElementById('datalimite-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-datas-limites').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar data limite:', e);
        alert('Erro ao carregar dados da data limite.');
    }
}

export async function excluirDataLimite(id) {
    if (!confirm('Tem certeza que deseja excluir esta data limite?')) return;
    try {
        const { error } = await supabaseClient
            .from('datas_limites')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro: ' + error.message);
            return;
        }

        alert('Data limite excluída com sucesso!');
        await carregarDatasLimites();
        await atualizarTopbarDatasLimites();
    } catch (e) {
        console.error('Erro ao excluir data limite:', e);
        alert('Erro ao excluir data limite.');
    }
}

// =====================================================
// ATUALIZAR TOPBAR COM DATAS LIMITES
// =====================================================
export async function atualizarTopbarDatasLimites() {
    const container = document.getElementById('datas-limites-topbar');
    if (!container) return;

    try {
        const hoje = new Date();
        const mesAtual = hoje.toLocaleDateString('pt-BR', { month: 'long' });
        const anoAtual = hoje.getFullYear();

        let { data, error } = await supabaseClient
            .from('datas_limites')
            .select('*')
            .eq('mes', mesAtual)
            .eq('ano', anoAtual)
            .maybeSingle();

        if (!data) {
            const { data: proxima } = await supabaseClient
                .from('datas_limites')
                .select('*')
                .gte('ano', anoAtual)
                .order('ano', { ascending: true })
                .order('mes', { ascending: true });

            if (proxima && proxima.length > 0) {
                data = proxima[0];
            }
        }

        if (!data) {
            container.innerHTML = `
                <div class="flex items-center gap-4 text-xs" style="color:var(--text-muted);">
                    <span>📅 Nenhuma data limite cadastrada</span>
                </div>
            `;
            return;
        }

        // Criar datas manualmente para evitar problemas de fuso horário
        const dataFr = new Date(data.data_fr + 'T00:00:00');
        const dataNf = new Date(data.data_nf + 'T00:00:00');

        const frHtml = formatarDataLimiteTopbar(dataFr, 'FR (12h)');
        const nfHtml = formatarDataLimiteTopbar(dataNf, 'NF (23h)');

        container.innerHTML = `
            <div class="flex items-center gap-4 text-xs" style="color:var(--text-muted);">
                <span style="font-weight:600;color:var(--text);">📅 ${data.mes}/${data.ano}</span>
                ${frHtml}
                ${nfHtml}
            </div>
        `;

    } catch (e) {
        console.error('Erro ao carregar datas limites para topbar:', e);
        container.innerHTML = `
            <div class="flex items-center gap-4 text-xs" style="color:var(--text-muted);">
                <span>📅 Erro ao carregar datas</span>
            </div>
        `;
    }
}

function formatarDataLimiteTopbar(data, label) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataLimite = new Date(data);
    dataLimite.setHours(0, 0, 0, 0);
    
    const diffDias = Math.floor((dataLimite - hoje) / (1000 * 60 * 60 * 24));
    
    const dia = String(dataLimite.getDate()).padStart(2, '0');
    const mes = String(dataLimite.getMonth() + 1).padStart(2, '0');
    const ano = dataLimite.getFullYear();
    const dataStr = `${dia}/${mes}/${ano}`;
    
    // NOVA LÓGICA DE CORES:
    // - Amarela: 7 dias antes (diffDias <= 7 e diffDias > 3)
    // - Vermelha: 3 dias antes (diffDias <= 3 e diffDias > 0)
    // - Preta piscando: No dia (diffDias === 0)
    // - Sem cor: Passou ou mais de 7 dias
    
    // Passou da data limite
    if (diffDias < 0) {
        return `<span style="color:var(--text-soft);">${label}: ${dataStr}</span>`;
    }
    
    // No dia (diffDias === 0) - PRETO PISCANDO
    if (diffDias === 0) {
        return `<span class="piscando" style="background:#000;color:#fff;font-weight:bold;padding:2px 8px;border-radius:4px;">${label}: ${dataStr}</span>`;
    }
    // Três dias antes (diffDias <= 3) - VERMELHO
    else if (diffDias <= 3) {
        return `<span class="vermelho" style="background:#FF0000;color:#fff;font-weight:bold;padding:2px 8px;border-radius:4px;">${label}: ${dataStr}</span>`;
    }
    // Sete dias antes (diffDias <= 7) - AMARELO
    else if (diffDias <= 7) {
        return `<span class="amarelo" style="background:#FFD700;color:#000;padding:2px 8px;border-radius:4px;">${label}: ${dataStr}</span>`;
    }
    
    // Mais de 7 dias - SEM COR
    return `<span style="color:var(--text-soft);">${label}: ${dataStr}</span>`;
}