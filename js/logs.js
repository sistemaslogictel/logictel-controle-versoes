// =====================================================
// LOGS DE ATUALIZAÇÕES
// =====================================================

async function carregarLogsAtualizacoes() {
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
        
        // Buscar versão do sistema
        const versao = document.querySelector('.versao-sistema')?.textContent || 'v0.0.1';
        
        container.innerHTML = `
            <div class="space-y-4">
                <!-- Versão do Sistema -->
                <div class="bg-primary-100 p-4 rounded-lg">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">📦</span>
                        <div>
                            <div class="font-semibold">Versão do Sistema</div>
                            <div class="text-sm text-muted">${versao}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Última atualização do banco -->
                <div class="bg-primary-100 p-4 rounded-lg">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🔄</span>
                        <div>
                            <div class="font-semibold">Última atualização do banco</div>
                            <div class="text-sm text-muted">${new Date(data[0].criado_em).toLocaleString('pt-BR')}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Total de registros -->
                <div class="bg-primary-100 p-4 rounded-lg">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">📊</span>
                        <div>
                            <div class="font-semibold">Total de alterações registradas</div>
                            <div class="text-sm text-muted">${data.length} alterações (últimas 50 exibidas)</div>
                        </div>
                    </div>
                </div>
                
                <!-- Histórico de alterações -->
                <div class="border-t border-gray-200 pt-4">
                    <div class="font-semibold mb-2">Histórico de alterações (últimas 50)</div>
                    <div class="space-y-1 max-h-96 overflow-y-auto">
                        ${data.map(log => {
                            const operacaoClass = log.operacao === 'INSERT' ? 'text-success' : 
                                                 log.operacao === 'UPDATE' ? 'text-primary' : 'text-danger';
                            const operacaoIcon = log.operacao === 'INSERT' ? '✅' : 
                                                log.operacao === 'UPDATE' ? '✏️' : '🗑️';
                            
                            // Formatar nome da tabela
                            const tabelaNome = log.tabela?.replace(/_/g, ' ') || 'desconhecida';
                            
                            return `
                                <div class="flex items-center justify-between text-sm py-1 px-2 hover:bg-gray-50 rounded">
                                    <div class="flex items-center gap-2">
                                        <span>${operacaoIcon}</span>
                                        <span class="${operacaoClass} font-medium">${log.operacao}</span>
                                        <span class="text-muted">${tabelaNome}</span>
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
        console.error('Erro inesperado:', e);
        container.innerHTML = '<div class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar logs.</div>';
    }
}

// =====================================================
// REGISTRAR LOG MANUAL
// =====================================================

async function registrarLog(tabela, operacao, registroId, dados) {
    try {
        const usuario = usuarioLogado?.nome || 'sistema';
        
        await supabaseClient
            .from('logs_atualizacoes')
            .insert([{
                tabela: tabela,
                operacao: operacao,
                registro_id: registroId,
                dados_novos: dados,
                usuario: usuario
            }]);
    } catch (e) {
        console.error('Erro ao registrar log:', e);
    }
}