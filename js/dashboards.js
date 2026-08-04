import { supabaseClient } from './config.js';
import { registrarUltimaAtualizacao } from './utils.js';

// =====================================================
// DASHBOARD PRINCIPAL (SALDOS)
// =====================================================
export async function carregarDashboard() {
    const tbody = document.getElementById('tabela-dashboard-corpo');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Carregando dados...</td></tr>`;

    try {
        const { data: medicoes, error: errorMed } = await supabaseClient
            .from('medicoes')
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

        if (errorMed) {
            console.error('Erro ao carregar medições:', errorMed);
            tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados</td></tr>`;
            return;
        }

        const { data: consumos, error: errorCons } = await supabaseClient
            .from('consumo_dc')
            .select('*');

        if (errorCons) {
            console.error('Erro ao carregar consumos:', errorCons);
        }

        if (!medicoes || medicoes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Nenhuma medição cadastrada.</td></tr>`;
            return;
        }

        const grupos = {};
        const todosMeses = new Set();
        const mesesOrdem = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        medicoes.forEach(med => {
            const key = `${med.gestor_logictel_id}|${med.projeto_id}|${med.empresa_id}|${med.ano}`;
            const mesKey = med.mes;
            todosMeses.add(mesKey);

            if (!grupos[key]) {
                grupos[key] = {
                    gestor: med.gestores_logictel?.nome || 'N/A',
                    projeto: med.projetos?.nome || 'N/A',
                    descricao: med.projetos?.nome || '',
                    empresa: med.empresas?.nome || 'N/A',
                    ano: med.ano || 'N/A',
                    meses: {},
                    totalSaldo: 0
                };
            }

            const valorMedicao = Number(med.valor || 0);
            grupos[key].meses[mesKey] = { medicao: valorMedicao, consumo: 0 };
            grupos[key].totalSaldo += valorMedicao;
        });

        if (consumos) {
            consumos.forEach(c => {
                const key = `${c.gestor_logictel_id}|${c.projeto_id}|${c.empresa_id}|${c.ano}`;
                const mesKey = c.mes_apropriacao;

                if (grupos[key] && grupos[key].meses[mesKey]) {
                    grupos[key].meses[mesKey].consumo += Number(c.valor || 0);
                }
            });
        }

        Object.values(grupos).forEach(g => {
            let saldoAcumulado = 0;
            const mesesGrupo = Object.keys(g.meses).sort((a, b) => mesesOrdem.indexOf(a) - mesesOrdem.indexOf(b));

            mesesGrupo.forEach(mes => {
                const med = g.meses[mes].medicao || 0;
                const cons = g.meses[mes].consumo || 0;
                const saldo = med + cons;
                saldoAcumulado += saldo;
                g.meses[mes].saldo = saldo;
                g.meses[mes].saldoAcumulado = saldoAcumulado;
            });

            g.totalSaldo = saldoAcumulado;
        });

        const mesesExibir = Array.from(todosMeses).sort((a, b) => mesesOrdem.indexOf(a) - mesesOrdem.indexOf(b));

        const headerRow = document.querySelector('#dash-header');
        if (headerRow) {
            let html = '<tr><th>Gestão</th><th>Projeto</th><th>Descrição</th><th>Empresa</th>';
            mesesExibir.forEach(mes => {
                html += `<th class="mes-header">${mes}</th>`;
            });
            html += '<th>Total Geral</th></tr>';
            headerRow.innerHTML = html;
        }

        tbody.innerHTML = '';
        let totalGeral = 0;

        Object.values(grupos).forEach(g => {
            totalGeral += g.totalSaldo;

            let html = `
                <tr class="td-row">
                    <td class="gestor-coluna">${g.gestor}</td>
                    <td class="projeto-coluna">${g.projeto}</td>
                    <td class="descricao-coluna">${g.descricao}</td>
                    <td class="empresa-coluna">${g.empresa}</td>
            `;

            mesesExibir.forEach(mes => {
                const saldo = g.meses[mes]?.saldo || 0;
                const valorClass = saldo < 0 ? 'valor-negativo' : (saldo > 0 ? 'valor-positivo' : 'valor-zero');
                const displayValor = saldo !== 0 ? saldo.toLocaleString('pt-BR', { minFractionDigits: 2 }) : '-';
                html += `<td class="mes-coluna ${valorClass}">${displayValor}</td>`;
            });

            const totalClass = g.totalSaldo < 0 ? 'valor-negativo' : (g.totalSaldo > 0 ? 'valor-positivo' : 'valor-zero');
            html += `
                    <td class="${totalClass}">${g.totalSaldo.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                </tr>
            `;

            tbody.innerHTML += html;
        });

        const totalClass = totalGeral < 0 ? 'valor-negativo' : (totalGeral > 0 ? 'valor-positivo' : 'valor-zero');
        let totalHtml = `
            <tr class="total-row">
                <td colspan="4" style="font-weight:700;text-align:right;">TOTAL GERAL</td>
        `;

        mesesExibir.forEach(mes => {
            let totalMes = 0;
            Object.values(grupos).forEach(g => {
                totalMes += g.meses[mes]?.saldo || 0;
            });
            const mesClass = totalMes < 0 ? 'valor-negativo' : (totalMes > 0 ? 'valor-positivo' : 'valor-zero');
            totalHtml += `<td class="mes-coluna ${mesClass}">${totalMes !== 0 ? totalMes.toLocaleString('pt-BR', { minFractionDigits: 2 }) : '-'}</td>`;
        });

        totalHtml += `
                <td class="${totalClass}" style="font-weight:700;">${totalGeral.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
            </tr>
        `;
        tbody.innerHTML += totalHtml;

        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD APROPRIAÇÃO
// =====================================================
export async function carregarDashApropriacao() {
    const tbody = document.getElementById('tabela-dash-apropriacao');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>`;

    try {
        const { data: consumos, error } = await supabaseClient
            .from('consumo_dc')
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

        if (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Erro: ${error.message}</td></tr>`;
            return;
        }

        if (!consumos || consumos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Nenhum consumo cadastrado.</td></tr>`;
            return;
        }

        const grupos = {};
        const todosMeses = new Set();
        const mesesOrdem = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        consumos.forEach(c => {
            const key = `${c.gestor_logictel_id}|${c.projeto_id}|${c.empresa_id}|${c.ano}`;
            const mesKey = c.mes_apropriacao;
            todosMeses.add(mesKey);

            if (!grupos[key]) {
                grupos[key] = {
                    gestor: c.gestores_logictel?.nome || 'N/A',
                    projeto: c.projetos?.nome || 'N/A',
                    descricao: c.projetos?.nome || '',
                    empresa: c.empresas?.nome || 'N/A',
                    ano: c.ano || 'N/A',
                    meses: {},
                    total: 0
                };
            }

            const valor = Number(c.valor || 0);
            grupos[key].meses[mesKey] = (grupos[key].meses[mesKey] || 0) + valor;
            grupos[key].total += valor;
        });

        const mesesExibir = Array.from(todosMeses).sort((a, b) => mesesOrdem.indexOf(a) - mesesOrdem.indexOf(b));

        const headerRow = document.querySelector('#aprop-header');
        if (headerRow) {
            let html = '<tr><th>Gestão</th><th>Projeto</th><th>Descrição</th><th>Empresa</th>';
            mesesExibir.forEach(mes => {
                html += `<th class="mes-header">${mes}</th>`;
            });
            html += '<th>Total Geral</th></tr>';
            headerRow.innerHTML = html;
        }

        tbody.innerHTML = '';
        let totalGeral = 0;

        Object.values(grupos).forEach(g => {
            totalGeral += g.total;

            let html = `
                <tr class="td-row">
                    <td class="gestor-coluna">${g.gestor}</td>
                    <td class="projeto-coluna">${g.projeto}</td>
                    <td class="descricao-coluna">${g.descricao}</td>
                    <td class="empresa-coluna">${g.empresa}</td>
            `;

            mesesExibir.forEach(mes => {
                const valor = g.meses[mes] || 0;
                const valorClass = valor < 0 ? 'valor-negativo' : (valor > 0 ? 'valor-positivo' : 'valor-zero');
                const displayValor = valor !== 0 ? valor.toLocaleString('pt-BR', { minFractionDigits: 2 }) : '-';
                html += `<td class="mes-coluna ${valorClass}">${displayValor}</td>`;
            });

            const totalClass = g.total < 0 ? 'valor-negativo' : (g.total > 0 ? 'valor-positivo' : 'valor-zero');
            html += `
                    <td class="${totalClass}">${g.total.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                </tr>
            `;

            tbody.innerHTML += html;
        });

        const totalClass = totalGeral < 0 ? 'valor-negativo' : (totalGeral > 0 ? 'valor-positivo' : 'valor-zero');
        let totalHtml = `
            <tr class="total-row">
                <td colspan="4" style="font-weight:700;text-align:right;">TOTAL GERAL</td>
        `;

        mesesExibir.forEach(mes => {
            let totalMes = 0;
            Object.values(grupos).forEach(g => {
                totalMes += g.meses[mes] || 0;
            });
            const mesClass = totalMes < 0 ? 'valor-negativo' : (totalMes > 0 ? 'valor-positivo' : 'valor-zero');
            totalHtml += `<td class="mes-coluna ${mesClass}">${totalMes !== 0 ? totalMes.toLocaleString('pt-BR', { minFractionDigits: 2 }) : '-'}</td>`;
        });

        totalHtml += `
                <td class="${totalClass}" style="font-weight:700;">${totalGeral.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
            </tr>
        `;
        tbody.innerHTML += totalHtml;

        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD DON
// =====================================================
export async function carregarDashDON() {
    const tbody = document.getElementById('tabela-dash-don');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>`;

    try {
        const { data: consumos, error } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id,
                empresa_id,
                projeto_id,
                gestor_logictel_id,
                diretor_id,
                mes_medido,
                ano,
                valor,
                empresas(nome),
                projetos(nome),
                gestores_logictel(nome),
                diretores(nome)
            `);

        if (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Erro: ${error.message}</td></tr>`;
            return;
        }

        if (!consumos || consumos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Nenhum consumo cadastrado.</td></tr>`;
            return;
        }

        const grupos = {};
        const todosMeses = new Set();
        const mesesOrdem = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        consumos.forEach(c => {
            const key = `${c.gestor_logictel_id}|${c.projeto_id}|${c.empresa_id}|${c.ano}`;
            const mesKey = c.mes_medido;
            todosMeses.add(mesKey);

            if (!grupos[key]) {
                grupos[key] = {
                    gestor: c.gestores_logictel?.nome || 'N/A',
                    projeto: c.projetos?.nome || 'N/A',
                    descricao: c.projetos?.nome || '',
                    empresa: c.empresas?.nome || 'N/A',
                    ano: c.ano || 'N/A',
                    meses: {},
                    total: 0
                };
            }

            const valor = Number(c.valor || 0);
            grupos[key].meses[mesKey] = (grupos[key].meses[mesKey] || 0) + valor;
            grupos[key].total += valor;
        });

        const mesesExibir = Array.from(todosMeses).sort((a, b) => mesesOrdem.indexOf(a) - mesesOrdem.indexOf(b));

        const headerRow = document.querySelector('#don-header');
        if (headerRow) {
            let html = '<tr><th>Gestão</th><th>Projeto</th><th>Descrição</th><th>Empresa</th>';
            mesesExibir.forEach(mes => {
                html += `<th class="mes-header">${mes}</th>`;
            });
            html += '<th>Total Geral</th></tr>';
            headerRow.innerHTML = html;
        }

        tbody.innerHTML = '';
        let totalGeral = 0;

        Object.values(grupos).forEach(g => {
            totalGeral += g.total;

            let html = `
                <tr class="td-row">
                    <td class="gestor-coluna">${g.gestor}</td>
                    <td class="projeto-coluna">${g.projeto}</td>
                    <td class="descricao-coluna">${g.descricao}</td>
                    <td class="empresa-coluna">${g.empresa}</td>
            `;

            mesesExibir.forEach(mes => {
                const valor = g.meses[mes] || 0;
                const valorClass = valor < 0 ? 'valor-negativo' : (valor > 0 ? 'valor-positivo' : 'valor-zero');
                const displayValor = valor !== 0 ? valor.toLocaleString('pt-BR', { minFractionDigits: 2 }) : '-';
                html += `<td class="mes-coluna ${valorClass}">${displayValor}</td>`;
            });

            const totalClass = g.total < 0 ? 'valor-negativo' : (g.total > 0 ? 'valor-positivo' : 'valor-zero');
            html += `
                    <td class="${totalClass}">${g.total.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
                </tr>
            `;

            tbody.innerHTML += html;
        });

        const totalClass = totalGeral < 0 ? 'valor-negativo' : (totalGeral > 0 ? 'valor-positivo' : 'valor-zero');
        let totalHtml = `
            <tr class="total-row">
                <td colspan="4" style="font-weight:700;text-align:right;">TOTAL GERAL</td>
        `;

        mesesExibir.forEach(mes => {
            let totalMes = 0;
            Object.values(grupos).forEach(g => {
                totalMes += g.meses[mes] || 0;
            });
            const mesClass = totalMes < 0 ? 'valor-negativo' : (totalMes > 0 ? 'valor-positivo' : 'valor-zero');
            totalHtml += `<td class="mes-coluna ${mesClass}">${totalMes !== 0 ? totalMes.toLocaleString('pt-BR', { minFractionDigits: 2 }) : '-'}</td>`;
        });

        totalHtml += `
                <td class="${totalClass}" style="font-weight:700;">${totalGeral.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
            </tr>
        `;
        tbody.innerHTML += totalHtml;

        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}
