import { supabaseClient } from './config.js';

export async function carregarLogsAtualizacoes() {
    const container = document.getElementById('logs-container');
    if (!container) return;

    container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Carregando logs...</div>';

    try {
        const { data, error } = await supabaseClient
            .from('logs_atualizacoes')
            .select('*')
            .order('criado_em', { ascending: false })
            .limit(50);

        if (error) {
            container.innerHTML = `<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar logs: ${error.message}</div>`;
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Nenhuma atualização registrada ainda.</div>';
            return;
        }

        container.innerHTML = `
            <div class="space-y-4">
                <div class="bg-primary-100 p-4 rounded-lg">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🔄</span>
                        <div>
                            <div class="font-semibold">Última atualização do banco</div>
                            <div class="text-sm text-muted">${new Date(data[0].criado_em).toLocaleString('pt-BR')}</div>
                        </div>
                    </div>
                </div>

                <div class="border-t border-gray-200 pt-4">
                    <div class="font-semibold mb-2">Histórico de alterações (últimos 50)</div>
                    <div class="space-y-1 max-h-96 overflow-y-auto">
                        ${data.map(log => {
                            const operacaoClass = log.operacao === 'INSERT' ? 'text-success' :
                                log.operacao === 'UPDATE' ? 'text-primary' : 'text-danger';
                            const operacaoIcon = log.operacao === 'INSERT' ? '✅' :
                                log.operacao === 'UPDATE' ? '✏️' : '🗑️';
                            return `
                                <div class="flex items-center justify-between text-sm py-1 px-2 hover:bg-gray-50 rounded">
                                    <div class="flex items-center gap-2">
                                        <span>${operacaoIcon}</span>
                                        <span class="${operacaoClass} font-medium">${log.operacao}</span>
                                        <span class="text-muted">${log.tabela}</span>
                                        ${log.registro_id ? `<span class="text-xs text-muted">ID: ${log.registro_id}</span>` : ''}
                                    </div>
                                    <span class="text-xs text-muted">${new Date(log.criado_em).toLocaleString('pt-BR')}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        console.error('Erro:', e);
        container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar logs.</div>';
    }
}
