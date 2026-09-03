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
            <button onclick="baixarBackupCompleto()" class="btn-primary" style="font-size:14px; padding:12px 32px;">
                📥 Baixar Backup Completo
            </button>
            <p style="margin-top:12px; font-size:11px; color:var(--text-soft);">
                Serão baixadas ${TABELAS_BACKUP.length} tabelas em um único arquivo JSON.
            </p>
        </div>
        <div id="backup-status" style="margin-top:16px;"></div>
    `;
}

// =====================================================
// BAIXAR BACKUP COMPLETO
// =====================================================
window.baixarBackupCompleto = async function() {
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

        // Adicionar metadados do backup
        const backupCompleto = {
            metadata: {
                data_backup: new Date().toISOString(),
                total_tabelas: TABELAS_BACKUP.length,
                total_registros: totalRegistros,
                versao_sistema: 'V.23.20'
            },
            tabelas: backupData
        };

        // Gerar arquivo JSON
        const json = JSON.stringify(backupCompleto, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const dataAtual = new Date();
        const dia = String(dataAtual.getDate()).padStart(2, '0');
        const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
        const ano = dataAtual.getFullYear();
        const hora = String(dataAtual.getHours()).padStart(2, '0');
        const minuto = String(dataAtual.getMinutes()).padStart(2, '0');
        const nomeArquivo = `backup_${dia}_${mes}_${ano}_${hora}${minuto}.json`;

        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        statusEl.innerHTML = `
            <div class="p-4 text-center" style="background:var(--success-bg); border-radius:8px; color:var(--success);">
                ✅ Backup concluído com sucesso!<br>
                <span style="font-size:12px;">${TABELAS_BACKUP.length} tabelas, ${totalRegistros} registros baixados.</span>
            </div>
        `;

    } catch (e) {
        console.error('Erro ao fazer backup:', e);
        statusEl.innerHTML = `
            <div class="p-4 text-center" style="background:var(--danger-bg); border-radius:8px; color:var(--danger);">
                ❌ Erro ao fazer backup: ${e.message}
            </div>
        `;
    }
};

// =====================================================
// EXPORTAÇÃO PARA O WINDOW (para uso no onclick)
// =====================================================
if (typeof window !== 'undefined') {
    window.carregarBackup = carregarBackup;
    window.baixarBackupCompleto = window.baixarBackupCompleto;
}
