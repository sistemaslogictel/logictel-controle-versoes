// backup.js
import { supabaseClient } from './config.js';

// =====================================================
// LISTA DE TABELAS PARA BACKUP
// =====================================================
const TABELAS_BACKUP = [
    'consumo_dc',
    'contratos',
    'datas_limites',
    'diretores',
    'empresas',
    'gestores_logictel',
    'medicoes',
    'projetos',
    'status_dc',
    'status_medicao',
    'status_nf',
    'tutoriais_paginas',
    'tutoriais_secoes',
    'usuarios'
];

// =====================================================
// CARREGAR ABA DE BACKUP
// =====================================================
export async function carregarBackup() {
    const container = document.getElementById('backup-container');
    if (!container) return;

    container.innerHTML = `
        <div class="p-6 text-center" style="color:var(--text-soft);">
            <p style="margin-bottom:12px;">📦 Clique no botão abaixo para baixar um backup completo de todas as tabelas do sistema.</p>
            <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
                <button onclick="baixarBackupJSON()" class="btn-primary" style="font-size:14px; padding:12px 32px; background:linear-gradient(135deg, #1A3A7A, #2A4A8A);">
                    📥 Baixar Backup (JSON)
                </button>
                <button onclick="baixarBackupCSV()" class="btn-primary" style="font-size:14px; padding:12px 32px; background:linear-gradient(135deg, #217346, #2A8A5A);">
                    📊 Baixar Backup (CSV)
                </button>
            </div>
            <p style="margin-top:12px; font-size:11px; color:var(--text-soft);">
                JSON = arquivo único com todas as tabelas | CSV = um arquivo por tabela (separador ;)
            </p>
        </div>
        <div id="backup-status" style="margin-top:16px;"></div>
    `;
}

// =====================================================
// BAIXAR BACKUP EM JSON
// =====================================================
window.baixarBackupJSON = async function() {
    const statusEl = document.getElementById('backup-status');
    if (!statusEl) return;

    statusEl.innerHTML = `
        <div class="p-4 text-center" style="background:var(--primary-100); border-radius:8px; color:var(--primary);">
            ⏳ Carregando dados do banco...
        </div>
    `;

    try {
        const backupData = {};
        let totalRegistros = 0;

        for (const tabela of TABELAS_BACKUP) {
            statusEl.innerHTML = `
                <div class="p-4 text-center" style="background:var(--primary-100); border-radius:8px; color:var(--primary);">
                    ⏳ Baixando ${tabela}...
                </div>
            `;

            const { data, error } = await supabaseClient
                .from(tabela)
                .select('*');

            if (error) {
                console.error(`Erro ao baixar ${tabela}:`, error);
                backupData[tabela] = { error: error.message, data: [] };
            } else {
                backupData[tabela] = { data: data || [] };
                totalRegistros += (data || []).length;
            }
        }

        const backupCompleto = {
            metadata: {
                data_backup: new Date().toISOString(),
                total_tabelas: TABELAS_BACKUP.length,
                total_registros: totalRegistros,
                versao_sistema: 'V.23.22',
                formato: 'json'
            },
            tabelas: backupData
        };

        const json = JSON.stringify(backupCompleto, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const dataAtual = new Date();
        const dia = String(dataAtual.getDate()).padStart(2, '0');
        const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
        const ano = dataAtual.getFullYear();
        const hora = String(dataAtual.getHours()).padStart(2, '0');
        const minuto = String(dataAtual.getMinutes()).padStart(2, '0');
        const nomeArquivo = `backup_json_${dia}_${mes}_${ano}_${hora}${minuto}.json`;

        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        statusEl.innerHTML = `
            <div class="p-4 text-center" style="background:var(--success-bg); border-radius:8px; color:var(--success);">
                ✅ Backup JSON concluído com sucesso!<br>
                <span style="font-size:12px;">${TABELAS_BACKUP.length} tabelas, ${totalRegistros} registros baixados.</span>
            </div>
        `;

    } catch (e) {
        console.error('Erro ao fazer backup JSON:', e);
        statusEl.innerHTML = `
            <div class="p-4 text-center" style="background:var(--danger-bg); border-radius:8px; color:var(--danger);">
                ❌ Erro ao fazer backup JSON: ${e.message}
            </div>
        `;
    }
};

// =====================================================
// FUNÇÃO PARA CONVERTER DADOS EM CSV (separador ;)
// =====================================================
function converterParaCSV(dados) {
    if (!dados || dados.length === 0) {
        return '';
    }

    // Obter todas as chaves (colunas) do primeiro registro
    const colunas = Object.keys(dados[0]);
    
    // Cabeçalho
    let csv = colunas.join(';') + '\n';

    // Linhas
    for (const registro of dados) {
        const linha = colunas.map(col => {
            let valor = registro[col];
            if (valor === null || valor === undefined) {
                return '';
            }
            // Converter para string
            valor = String(valor);
            // Se contiver ; ou " ou quebra de linha, envolver em aspas
            if (valor.includes(';') || valor.includes('"') || valor.includes('\n') || valor.includes('\r')) {
                valor = '"' + valor.replace(/"/g, '""') + '"';
            }
            return valor;
        });
        csv += linha.join(';') + '\n';
    }

    return csv;
}

// =====================================================
// BAIXAR BACKUP EM CSV (um arquivo por tabela)
// =====================================================
window.baixarBackupCSV = async function() {
    const statusEl = document.getElementById('backup-status');
    if (!statusEl) return;

    statusEl.innerHTML = `
        <div class="p-4 text-center" style="background:var(--primary-100); border-radius:8px; color:var(--primary);">
            ⏳ Carregando dados do banco...
        </div>
    `;

    try {
        const dataAtual = new Date();
        const dia = String(dataAtual.getDate()).padStart(2, '0');
        const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
        const ano = dataAtual.getFullYear();
        const hora = String(dataAtual.getHours()).padStart(2, '0');
        const minuto = String(dataAtual.getMinutes()).padStart(2, '0');

        let totalRegistros = 0;
        let tabelasBaixadas = 0;
        const arquivosBaixados = [];

        for (const tabela of TABELAS_BACKUP) {
            statusEl.innerHTML = `
                <div class="p-4 text-center" style="background:var(--primary-100); border-radius:8px; color:var(--primary);">
                    ⏳ Baixando ${tabela}...
                </div>
            `;

            const { data, error } = await supabaseClient
                .from(tabela)
                .select('*');

            if (error) {
                console.error(`Erro ao baixar ${tabela}:`, error);
                continue;
            }

            if (!data || data.length === 0) {
                continue;
            }

            tabelasBaixadas++;
            totalRegistros += data.length;

            // Converter dados para CSV
            const csv = converterParaCSV(data);
            
            // Adicionar metadados no início do arquivo
            const metadata = `# Backup CSV - ${dataAtual.toLocaleString('pt-BR')}\n`;
            const cabecalho = `# Tabela: ${tabela} | Registros: ${data.length}\n# Separador: ;\n`;
            const csvCompleto = metadata + cabecalho + csv;

            // Criar blob e baixar
            const blob = new Blob([csvCompleto], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const nomeArquivo = `${tabela}_${dia}_${mes}_${ano}.csv`;

            const link = document.createElement('a');
            link.href = url;
            link.download = nomeArquivo;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            arquivosBaixados.push(nomeArquivo);
        }

        if (tabelasBaixadas === 0) {
            statusEl.innerHTML = `
                <div class="p-4 text-center" style="background:var(--danger-bg); border-radius:8px; color:var(--danger);">
                    ❌ Nenhum dado encontrado para exportar.
                </div>
            `;
            return;
        }

        statusEl.innerHTML = `
            <div class="p-4 text-center" style="background:var(--success-bg); border-radius:8px; color:var(--success);">
                ✅ Backup CSV concluído com sucesso!<br>
                <span style="font-size:12px;">${tabelasBaixadas} tabelas, ${totalRegistros} registros baixados.<br>
                Arquivos: ${arquivosBaixados.join(', ')}</span>
            </div>
        `;

    } catch (e) {
        console.error('Erro ao fazer backup CSV:', e);
        statusEl.innerHTML = `
            <div class="p-4 text-center" style="background:var(--danger-bg); border-radius:8px; color:var(--danger);">
                ❌ Erro ao fazer backup CSV: ${e.message}
            </div>
        `;
    }
};

// =====================================================
// EXPORTAÇÃO PARA O WINDOW (para uso no onclick)
// =====================================================
if (typeof window !== 'undefined') {
    window.carregarBackup = carregarBackup;
    window.baixarBackupJSON = window.baixarBackupJSON;
    window.baixarBackupCSV = window.baixarBackupCSV;
}
