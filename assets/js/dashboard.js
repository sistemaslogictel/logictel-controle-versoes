// =====================================================
// DASHBOARD PRINCIPAL
// =====================================================

async function carregarDashboard() {
    const tbody = document.getElementById('tabela-dashboard-corpo');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Carregando dados...</td></tr>`;

    const filtroGestor = document.getElementById('filt-dash-gestor')?.value || '';
    const filtroProjeto = document.getElementById('filt-dash-projeto')?.value || '';
    const filtroAno = document.getElementById('filt-dash-ano')?.value || '';

    try {
        let query = supabaseClient.from('medicoes')
            .select(`
                id,
                empresa_id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes,
                ano,
                valor,
                empresas(nome),
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome)
            `);
        
        // Aplicar filtros
        if (filtroGestor) query = query.eq('gestores_logictel.nome', filtroGestor);
        if (filtroProjeto) query = query.eq('projetos.nome', filtroProjeto);
        if (filtroAno) query = query.eq('ano', parseInt(filtroAno));
        
        const { data: medicoes, error: errorMed } = await executarConsulta(query);
        
        if (errorMed) {
            console.error('Erro ao carregar medições:', errorMed);
            tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados: ${errorMed.message}</td></tr>`;
            return;
        }

        // Buscar consumos
        let queryConsumo = supabaseClient.from('consumo_dc')
            .select(`
                id,
                empresa_id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes_apropriacao,
                ano,
                valor,
                mes_medido,
                empresas(nome),
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome)
            `);
        
        if (filtroGestor) queryConsumo = queryConsumo.eq('gestores_logictel.nome', filtroGestor);
        if (filtroProjeto) queryConsumo = queryConsumo.eq('projetos.nome', filtroProjeto);
        if (filtroAno) queryConsumo = queryConsumo.eq('ano', parseInt(filtroAno));
        
        const { data: consumos, error: errorCons } = await executarConsulta(queryConsumo);

        if (errorCons) {
            console.error('Erro ao carregar consumos:', errorCons);
        }

        registrarUltimaAtualizacao();

        if (!medicoes || medicoes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Nenhuma medição cadastrada.</td></tr>`;
            document.getElementById('stat-total-medido').innerText = 'R$ 0,00';
            document.getElementById('stat-total-consumido').innerText = 'R$ 0,00';
            document.getElementById('stat-saldo-total').innerText = 'R$ 0,00';
            return;
        }

        let somaMedido = 0, somaConsumido = 0, linhas = [];
        
        medicoes.forEach(med => {
            const valorMedicao = Number(med.valor || 0);
            somaMedido += valorMedicao;
            let totalConsumido = 0;
            const detalhesMeses = {};
            
            if (consumos) {
                consumos.forEach(c => {
                    if (c.empresa_id === med.empresa_id && 
                        c.gestor_logictel_id === med.gestor_logictel_id && 
                        c.projeto_id === med.projeto_id && 
                        c.ano === med.ano) {
                        totalConsumido += Number(c.valor || 0);
                        const mesKey = `${c.mes_medido}`;
                        detalhesMeses[mesKey] = (detalhesMeses[mesKey] || 0) + Number(c.valor || 0);
                    }
                });
            }
            somaConsumido += totalConsumido;
            const saldo = valorMedicao - totalConsumido;
            
            const mesesComSaldo = Object.entries(detalhesMeses)
                .filter(([_, val]) => val !== 0)
                .map(([mes, val]) => `${mes}: ${val.toLocaleString('pt-BR', {minFractionDigits: 2})}`)
                .join('; ');
            
            linhas.push({
                gestor: med.gestores_logictel?.nome || 'N/A',
                projeto: med.projetos?.nome || 'N/A',
                descricao: med.projetos?.nome || '',
                empresa: med.empresas?.nome || 'N/A',
                diretor: med.diretores?.nome || 'N/A',
                ano: med.ano || 'N/A',
                valor: saldo,
                meses: mesesComSaldo || 'Sem saldo'
            });
        });

        tbody.innerHTML = '';
        let totalGeral = 0;
        linhas.forEach(row => {
            totalGeral += row.valor;
            const valorClass = row.valor < 0 ? 'valor-negativo' : 'valor-positivo';
            tbody.innerHTML += `
                <tr class="td-row">
                    <td class="font-medium" style="color:var(--text)">${row.gestor}</td>
                    <td>${row.projeto}</td>
                    <td>${row.descricao}</td>
                    <td>${row.empresa}</td>
                    <td>${row.diretor}</td>
                    <td class="text-right">${row.ano}</td>
                    <td class="text-right mono font-bold ${valorClass}">${row.valor.toLocaleString('pt-BR', {minFractionDigits: 2})}</td>
                    <td class="text-right" style="font-size:11px;color:var(--text-soft);">${row.meses}</td>
                </tr>
            `;
        });
        
        if (linhas.length > 0) {
            tbody.innerHTML += `<tr class="td-row" style="background:var(--primary-100); font-weight:700;"><td colspan="6" class="font-bold" style="color:var(--text); text-align:right;">TOTAL GERAL</td><td class="text-right mono font-bold ${totalGeral < 0 ? 'valor-negativo' : 'valor-positivo'}">${totalGeral.toLocaleString('pt-BR', {minFractionDigits: 2})}</td><td></td></tr>`;
        }

        document.getElementById('stat-total-medido').innerText = 'R$ ' + somaMedido.toLocaleString('pt-BR', {minFractionDigits: 2});
        document.getElementById('stat-total-consumido').innerText = 'R$ ' + somaConsumido.toLocaleString('pt-BR', {minFractionDigits: 2});
        const saldoTotal = somaMedido - somaConsumido;
        const statSaldo = document.getElementById('stat-saldo-total');
        statSaldo.innerText = 'R$ ' + saldoTotal.toLocaleString('pt-BR', {minFractionDigits: 2});
        statSaldo.style.color = saldoTotal < 0 ? 'var(--danger)' : 'var(--success)';
        
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD APROPRIAÇÃO
// =====================================================

async function carregarDashApropriacao() {
    const tbody = document.getElementById('tabela-dash-apropriacao');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>`;

    const filtroGestor = document.getElementById('filt-aprop-gestor')?.value || '';
    const filtroProjeto = document.getElementById('filt-aprop-projeto')?.value || '';
    const filtroAno = document.getElementById('filt-aprop-ano')?.value || '';

    try {
        let query = supabaseClient.from('consumo_dc')
            .select(`
                id,
                empresa_id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes_apropriacao,
                ano,
                valor,
                empresas(nome),
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome)
            `);
        
        if (filtroGestor) query = query.eq('gestores_logictel.nome', filtroGestor);
        if (filtroProjeto) query = query.eq('projetos.nome', filtroProjeto);
        if (filtroAno) query = query.eq('ano', parseInt(filtroAno));
        
        const { data: consumos, error } = await executarConsulta(query);

        registrarUltimaAtualizacao();
        
        if (error) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Erro: ${error.message}</td></tr>`;
            return;
        }
        
        if (!consumos || consumos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Nenhum consumo cadastrado.</td></tr>`;
            return;
        }

        const grupos = {};
        consumos.forEach(c => {
            const key = `${c.gestores_logictel?.nome}|${c.projetos?.nome}|${c.empresas?.nome}`;
            if (!grupos[key]) {
                grupos[key] = { 
                    gestor: c.gestores_logictel?.nome || 'N/A', 
                    projeto: c.projetos?.nome || 'N/A', 
                    descricao: c.projetos?.nome || '', 
                    empresa: c.empresas?.nome || 'N/A', 
                    diretor: c.diretores?.nome || 'N/A',
                    ano: c.ano || 'N/A',
                    total: 0, 
                    meses: {} 
                };
            }
            const mesKey = `${c.mes_apropriacao}`;
            grupos[key].meses[mesKey] = (grupos[key].meses[mesKey] || 0) + Number(c.valor || 0);
            grupos[key].total += Number(c.valor || 0);
        });

        tbody.innerHTML = '';
        let totalGeral = 0;
        Object.values(grupos).forEach(g => {
            totalGeral += g.total;
            const valorClass = g.total < 0 ? 'valor-negativo' : 'valor-positivo';
            const mesesStr = Object.entries(g.meses)
                .filter(([_, val]) => val !== 0)
                .map(([mes, val]) => `${mes}: ${val.toLocaleString('pt-BR', {minFractionDigits: 2})}`)
                .join('; ');
            tbody.innerHTML += `
                <tr class="td-row">
                    <td class="font-medium" style="color:var(--text)">${g.gestor}</td>
                    <td>${g.projeto}</td>
                    <td>${g.descricao}</td>
                    <td>${g.empresa}</td>
                    <td>${g.diretor}</td>
                    <td class="text-right">${g.ano}</td>
                    <td class="text-right mono font-bold ${valorClass}">${g.total.toLocaleString('pt-BR', {minFractionDigits: 2})}</td>
                    <td class="text-right" style="font-size:11px;color:var(--text-soft);">${mesesStr || 'Sem meses'}</td>
                </tr>
            `;
        });
        if (Object.values(grupos).length > 0) {
            tbody.innerHTML += `<tr class="td-row" style="background:var(--primary-100); font-weight:700;"><td colspan="6" class="font-bold" style="color:var(--text); text-align:right;">TOTAL GERAL</td><td class="text-right mono font-bold ${totalGeral < 0 ? 'valor-negativo' : 'valor-positivo'}">${totalGeral.toLocaleString('pt-BR', {minFractionDigits: 2})}</td><td></td></tr>`;
        }
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD DON
// =====================================================

async function carregarDashDON() {
    const tbody = document.getElementById('tabela-dash-don');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>`;

    const filtroGestor = document.getElementById('filt-don-gestor')?.value || '';
    const filtroProjeto = document.getElementById('filt-don-projeto')?.value || '';
    const filtroAno = document.getElementById('filt-don-ano')?.value || '';

    try {
        let query = supabaseClient.from('consumo_dc')
            .select(`
                id,
                empresa_id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes_apropriacao,
                ano,
                valor,
                mes_medido,
                empresas(nome),
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome)
            `);
        
        if (filtroGestor) query = query.eq('gestores_logictel.nome', filtroGestor);
        if (filtroProjeto) query = query.eq('projetos.nome', filtroProjeto);
        if (filtroAno) query = query.eq('ano', parseInt(filtroAno));
        
        const { data: consumos, error } = await executarConsulta(query);

        registrarUltimaAtualizacao();
        
        if (error) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Erro: ${error.message}</td></tr>`;
            return;
        }
        
        if (!consumos || consumos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Nenhum consumo cadastrado.</td></tr>`;
            return;
        }

        const grupos = {};
        consumos.forEach(c => {
            const key = `${c.gestores_logictel?.nome}|${c.projetos?.nome}|${c.empresas?.nome}`;
            if (!grupos[key]) {
                grupos[key] = { 
                    gestor: c.gestores_logictel?.nome || 'N/A', 
                    projeto: c.projetos?.nome || 'N/A', 
                    descricao: c.projetos?.nome || '', 
                    empresa: c.empresas?.nome || 'N/A', 
                    diretor: c.diretores?.nome || 'N/A',
                    ano: c.ano || 'N/A',
                    total: 0, 
                    meses: {} 
                };
            }
            const mesKey = `${c.mes_medido}`;
            grupos[key].meses[mesKey] = (grupos[key].meses[mesKey] || 0) + Number(c.valor || 0);
            grupos[key].total += Number(c.valor || 0);
        });

        tbody.innerHTML = '';
        let totalGeral = 0;
        Object.values(grupos).forEach(g => {
            totalGeral += g.total;
            const valorClass = g.total < 0 ? 'valor-negativo' : 'valor-positivo';
            const mesesStr = Object.entries(g.meses)
                .filter(([_, val]) => val !== 0)
                .map(([mes, val]) => `${mes}: ${val.toLocaleString('pt-BR', {minFractionDigits: 2})}`)
                .join('; ');
            tbody.innerHTML += `
                <tr class="td-row">
                    <td class="font-medium" style="color:var(--text)">${g.gestor}</td>
                    <td>${g.projeto}</td>
                    <td>${g.descricao}</td>
                    <td>${g.empresa}</td>
                    <td>${g.diretor}</td>
                    <td class="text-right">${g.ano}</td>
                    <td class="text-right mono font-bold ${valorClass}">${g.total.toLocaleString('pt-BR', {minFractionDigits: 2})}</td>
                    <td class="text-right" style="font-size:11px;color:var(--text-soft);">${mesesStr || 'Sem meses'}</td>
                </tr>
            `;
        });
        if (Object.values(grupos).length > 0) {
            tbody.innerHTML += `<tr class="td-row" style="background:var(--primary-100); font-weight:700;"><td colspan="6" class="font-bold" style="color:var(--text); text-align:right;">TOTAL GERAL</td><td class="text-right mono font-bold ${totalGeral < 0 ? 'valor-negativo' : 'valor-positivo'}">${totalGeral.toLocaleString('pt-BR', {minFractionDigits: 2})}</td><td></td></tr>`;
        }
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}