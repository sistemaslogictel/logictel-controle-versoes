// =====================================================
// RENDERIZAÇÃO DA TABELA - VERSÃO CORRIGIDA
// =====================================================
function renderizarDashboard(headerId, tbodyId, grupos, mesesExibir, headerClass) {
    const headerRow = document.querySelector(`#${headerId}`);
    if (headerRow) {
        let html = `<tr class="${headerClass}">
            <th style="text-align:left;padding:10px 12px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Gestão</th>
            <th style="text-align:left;padding:10px 12px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Projeto</th>
            <th style="text-align:left;padding:10px 12px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Descrição</th>`;
        
        mesesExibir.forEach(mes => {
            html += `<th style="text-align:center;padding:10px 12px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;min-width:100px;">${mes}</th>`;
        });
        
        html += `<th style="text-align:center;padding:10px 12px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;min-width:100px;">Total</th></tr>`;
        headerRow.innerHTML = html;
    }

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const linhas = Object.values(grupos);
    if (linhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${3 + mesesExibir.length + 1}" style="padding:20px;text-align:center;color:var(--text-soft);font-size:13px;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    let totalGeral = 0;

    // Cria um objeto para acumular totais por mês
    const totaisPorMes = {};
    mesesExibir.forEach(mes => { totaisPorMes[mes] = 0; });

    linhas.forEach(g => {
        totalGeral += g.total;

        // Acumula totais por mês
        mesesExibir.forEach(mes => {
            const saldo = g.meses[mes]?.saldo || 0;
            totaisPorMes[mes] += saldo;
        });

        let html = `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="text-align:left;padding:10px 12px;font-weight:600;font-size:13px;">${g.gestor}</td>
                <td style="text-align:left;padding:10px 12px;font-weight:500;font-size:13px;">${g.projeto}</td>
                <td style="text-align:left;padding:10px 12px;color:var(--text-soft);font-size:13px;">${g.descricao}</td>
        `;

        mesesExibir.forEach(mes => {
            const saldo = g.meses[mes]?.saldo;
            const temValor = saldo !== undefined && saldo !== 0;
            
            let colorStyle = '';
            let displayValor = '-';
            
            if (temValor) {
                if (saldo < 0) {
                    colorStyle = 'color:#FF0000;font-weight:600;';
                } else if (saldo > 0) {
                    colorStyle = 'color:#00AA00;font-weight:600;';
                }
                displayValor = saldo.toLocaleString('pt-BR', { minFractionDigits: 2 });
            }
            
            html += `<td style="text-align:center;padding:10px 12px;font-family:'IBM Plex Mono',monospace;font-size:13px;${colorStyle}">${displayValor}</td>`;
        });

        let totalColor = '';
        if (g.total < 0) {
            totalColor = 'color:#FF0000;';
        } else if (g.total > 0) {
            totalColor = 'color:#00AA00;';
        }
        
        html += `
                <td style="text-align:center;padding:10px 12px;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:14px;${totalColor}">${g.total.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
            </tr>
        `;

        tbody.innerHTML += html;
    });

    // =====================================================
    // LINHA TOTAL GERAL - ESTILO CORRIGIDO
    // =====================================================
    let totalHtml = `
        <tr style="background:var(--primary-100);font-weight:700;border-top:2px solid var(--primary);border-bottom:2px solid var(--primary);">
            <td colspan="3" style="text-align:right;padding:10px 12px;font-size:14px;font-weight:700;">TOTAL GERAL</td>
    `;

    mesesExibir.forEach(mes => {
        const totalMes = totaisPorMes[mes] || 0;
        
        let mesColor = '';
        if (totalMes < 0) {
            mesColor = 'color:#FF0000;';
        } else if (totalMes > 0) {
            mesColor = 'color:#00AA00;';
        }
        
        totalHtml += `<td style="text-align:center;padding:10px 12px;font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:700;${mesColor}">${totalMes !== 0 ? totalMes.toLocaleString('pt-BR', { minFractionDigits: 2 }) : '-'}</td>`;
    });

    let totalColor = '';
    if (totalGeral < 0) {
        totalColor = 'color:#FF0000;';
    } else if (totalGeral > 0) {
        totalColor = 'color:#00AA00;';
    }

    totalHtml += `
            <td style="text-align:center;padding:10px 12px;font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:700;${totalColor}">${totalGeral.toLocaleString('pt-BR', { minFractionDigits: 2 })}</td>
        </tr>
    `;
    tbody.innerHTML += totalHtml;
}
