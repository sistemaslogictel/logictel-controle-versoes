// =====================================================
// EXPORTAR EXCEL
// =====================================================

async function exportarExcel(id) {
    try {
        const { data, error } = await supabaseClient
            .from('consumo_dc')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            alert('Erro ao buscar dados: ' + error.message);
            return;
        }
        if (!data) {
            alert('Dados não encontrados!');
            return;
        }

        const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const mesIndex = meses.indexOf(data.mes_apropriacao?.toLowerCase().slice(0, 3) || '') + 1;
        const mesAno = `${String(mesIndex || 1).padStart(2, '0')}-${String(data.ano || 2026).slice(2)}`;

        const dadosExcel = {
            'Projeto': data.projeto || '',
            'Contrato': data.num_nf || '',
            'Cent': '',
            'PO': data.po || '',
            'Item': data.item || '',
            'Folha de Registro': data.folha_registro || '',
            'Valor': Number(data.valor || 0).toLocaleString('pt-BR', {minFractionDigits: 2}).replace('.', ','),
            'mês/apropriação': mesAno
        };

        const ws = XLSX.utils.json_to_sheet([dadosExcel]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Consumo DC');
        
        // Ajustar largura das colunas
        ws['!cols'] = [
            { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
            { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 18 }
        ];

        XLSX.writeFile(wb, `Consumo_DC_${data.dc || 'sem_dc'}_${mesAno}.xlsx`);
    } catch (e) {
        console.error('Erro ao exportar Excel:', e);
        alert('Erro ao exportar arquivo Excel.');
    }
}