// =====================================================
// HISTÓRICO APROPRIAÇÃO
// =====================================================

async function carregarApropriacaoHist() {
    const tbody = document.getElementById('tabela-apropriacao-hist');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>`;
    
    try {
        const { data: consumos, error } = await supabaseClient
            .from('consumo_dc')
            .select('*')
            .order('criado_em', { ascending: false });
        
        registrarUltimaAtualizacao();
        
        if (error) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Erro: ${error.message}</td></tr>`;
            return;
        }
        
        if (!consumos || consumos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Nenhum registro.</td></tr>`;
            return;
        }
        
        // Aplicar filtros
        const fProj = document.getElementById('filt-hist-aprop-proj')?.value?.toLowerCase() || '';
        const fGest = document.getElementById('filt-hist-aprop-gest')?.value?.toLowerCase() || '';
        const fGer = document.getElementById('filt-hist-aprop-ger')?.value?.toLowerCase() || '';
        const fData = document.getElementById('filt-hist-aprop-data')?.value || '';
        
        let filtrados = consumos.filter(c => {
            if (fProj && !c.projeto?.toLowerCase().includes(fProj)) return false;
            if (fGest && !c.gestor_logictel?.toLowerCase().includes(fGest)) return false;
            if (fGer && (!c.gestor || !c.gestor.toLowerCase().includes(fGer))) return false;
            if (fData && (!c.criado_em || !c.criado_em.startsWith(fData))) return false;
            return true;
        });
        
        if (filtrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Nenhum registro encontrado.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = '';
        filtrados.forEach(c => {
            let dataFormatada = c.criado_em ? new Date(c.criado_em).toLocaleString('pt-BR') : '-';
            tbody.innerHTML += `
                <tr class="td-row">
                    <td class="text-xs mono" style="color:var(--text-muted)">${dataFormatada}</td>
                    <td class="font-medium" style="color:var(--text)">${c.dc || '-'}</td>
                    <td>${c.projeto || '-'}</td>
                    <td>${c.gestor_logictel || '-'}</td>
                    <td>${c.gestor || '-'}</td>
                    <td>${c.mes_apropriacao || '-'}</td>
                    <td>${c.ano || '-'}</td>
                    <td>${c.status_nf || '-'}</td>
                    <td class="text-right mono font-semibold">R$ ${Number(c.valor || 0).toLocaleString('pt-BR', {minFractionDigits: 2})}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarConsumo(${c.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirConsumo(${c.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// HISTÓRICO MEDIÇÃO (GESTOR)
// =====================================================

async function carregarMedicaoHist() {
    const tbody = document.getElementById('tabela-medicao-hist');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>`;
    
    try {
        const { data: consumos, error } = await supabaseClient
            .from('consumo_dc')
            .select('*')
            .order('criado_em', { ascending: false });
        
        registrarUltimaAtualizacao();
        
        if (error) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Erro: ${error.message}</td></tr>`;
            return;
        }
        
        if (!consumos || consumos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Nenhum registro.</td></tr>`;
            return;
        }
        
        // Aplicar filtros
        const fProj = document.getElementById('filt-hist-med-proj')?.value?.toLowerCase() || '';
        const fGest = document.getElementById('filt-hist-med-gest')?.value?.toLowerCase() || '';
        const fGer = document.getElementById('filt-hist-med-ger')?.value?.toLowerCase() || '';
        const fData = document.getElementById('filt-hist-med-data')?.value || '';
        
        let filtrados = consumos.filter(c => {
            if (fProj && !c.projeto?.toLowerCase().includes(fProj)) return false;
            if (fGest && !c.gestor_logictel?.toLowerCase().includes(fGest)) return false;
            if (fGer && (!c.gestor || !c.gestor.toLowerCase().includes(fGer))) return false;
            if (fData && (!c.criado_em || !c.criado_em.startsWith(fData))) return false;
            return true;
        });
        
        if (filtrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Nenhum registro encontrado.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = '';
        filtrados.forEach(c => {
            let dataFormatada = c.criado_em ? new Date(c.criado_em).toLocaleString('pt-BR') : '-';
            tbody.innerHTML += `
                <tr class="td-row">
                    <td class="text-xs mono" style="color:var(--text-muted)">${dataFormatada}</td>
                    <td class="font-medium" style="color:var(--text)">${c.dc || '-'}</td>
                    <td>${c.projeto || '-'}</td>
                    <td>${c.gestor_logictel || '-'}</td>
                    <td>${c.gestor || '-'}</td>
                    <td class="font-medium" style="color:var(--gold)">${c.mes_medido || '-'}</td>
                    <td>${c.ano || '-'}</td>
                    <td>${c.status_dc || '-'}</td>
                    <td class="text-right mono font-semibold">R$ ${Number(c.valor || 0).toLocaleString('pt-BR', {minFractionDigits: 2})}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarConsumo(${c.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirConsumo(${c.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="10" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}