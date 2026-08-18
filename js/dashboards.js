import { supabaseClient } from './config.js';
import { registrarUltimaAtualizacao } from './utils.js';

const MESES_ORDEM = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Guarda o último dado renderizado de cada dashboard, para o botão
// "Exportar Excel" não precisar refazer a consulta ao banco.
let _ultimoRenderDON = null;
let _ultimoRenderStatus = null;
let _ultimoRenderCRE = null;
let _ultimoRenderPendencias = null;

// Função para formatar valor com separação de milhares
// Valores zerados ou que arredondam para 0 aparecem como "-"
function formatarValor(valor) {
    if (valor === undefined || valor === null || valor === '' || valor === '0,00') {
        return '-';
    }
    
    let num;
    if (typeof valor === 'string') {
        num = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    } else {
        num = valor;
    }
    
    if (isNaN(num)) return '-';
    
    // Arredonda para 2 casas decimais e verifica se é 0
    const arredondado = Math.round(num * 100) / 100;
    if (arredondado === 0) {
        return '-';
    }
    
    return num.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

function classeValor(v) {
    if (v === undefined || v === null || v === '' || v === '0,00') return 'valor-zero';
    
    let num;
    if (typeof v === 'string') {
        num = parseFloat(v.replace(/\./g, '').replace(',', '.'));
    } else {
        num = v;
    }
    
    if (isNaN(num)) return 'valor-zero';
    
    // Arredonda para 2 casas decimais e verifica se é 0
    const arredondado = Math.round(num * 100) / 100;
    if (arredondado === 0) return 'valor-zero';
    
    if (num > 0) return 'valor-positivo';
    if (num < 0) return 'valor-negativo';
    return 'valor-zero';
}

// =====================================================
// BUSCAR MAPEAMENTO DE STATUS NF
// =====================================================
let _statusNfMap = {};

async function carregarStatusNfMap() {
    if (Object.keys(_statusNfMap).length > 0) return _statusNfMap;
    try {
        const { data, error } = await supabaseClient
            .from('status_nf')
            .select('id, nome');
        if (error) {
            console.error('Erro ao carregar status NF:', error);
            return {};
        }
        if (data) {
            data.forEach(s => {
                _statusNfMap[s.id] = s.nome;
            });
        }
        return _statusNfMap;
    } catch (e) {
        console.error('Erro ao carregar status NF:', e);
        return {};
    }
}

// =====================================================
// FUNÇÕES PARA VERIFICAR STATUS
// =====================================================

// Verifica se o consumo deve ser excluído das dashboards DON e Status
function consumoDeveSerExcluido(consumo) {
    if (!consumo) return false;
    const statusNfId = consumo.status_nf;
    if (!statusNfId) return false;
    const nomeStatusNf = _statusNfMap[statusNfId] || '';
    const nomeLower = nomeStatusNf.toLowerCase();
    return nomeLower.includes('falta aprovar cre') || 
           nomeLower.includes('falta_aprovar_cre') ||
           nomeLower.includes('pendências') ||
           nomeLower.includes('pendencias');
}

// Verifica se o consumo é "CRE" (Falta aprovar CRE)
function consumoEHCRE(consumo) {
    if (!consumo) return false;
    const statusNfId = consumo.status_nf;
    if (!statusNfId) return false;
    const nomeStatusNf = _statusNfMap[statusNfId] || '';
    const nomeLower = nomeStatusNf.toLowerCase();
    return nomeLower.includes('falta aprovar cre') || nomeLower.includes('falta_aprovar_cre');
}

// Verifica se o consumo é "Pendência" (Pendências - ...)
function consumoEHPendencia(consumo) {
    if (!consumo) return false;
    const statusNfId = consumo.status_nf;
    if (!statusNfId) return false;
    const nomeStatusNf = _statusNfMap[statusNfId] || '';
    const nomeLower = nomeStatusNf.toLowerCase();
    return nomeLower.includes('pendências') || nomeLower.includes('pendencias');
}

// =====================================================
// EXPORTAÇÃO PARA EXCEL (XLSX)
// =====================================================
function exportarTabelaParaExcel(nomeArquivo, headers, linhas) {
    if (!linhas || linhas.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    try {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...linhas]);
        ws['!cols'] = headers.map(h => ({ wch: Math.max(12, String(h).length + 4) }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dados');
        const dataHoje = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `${nomeArquivo}_${dataHoje}.xlsx`);
    } catch (e) {
        console.error('Erro ao exportar Excel:', e);
        alert('Erro ao exportar arquivo Excel.');
    }
}

export function exportarExcelDON() {
    if (!_ultimoRenderDON) { alert('Não há dados para exportar.'); return; }
    const { projetos, mesesExibir } = _ultimoRenderDON;
    const headers = ['Projeto', 'Diretor', 'Descrição', ...mesesExibir, 'Total'];
    const linhas = [];
    projetos.forEach(proj => {
        linhas.push([proj.projeto, '—', proj.descricao, ...mesesExibir.map(m => proj.meses[m]?.saldo ?? 0), proj.total]);
        Object.values(proj.diretores)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
            .forEach(dir => {
                linhas.push([`↳ ${proj.projeto}`, dir.nome, '—', ...mesesExibir.map(m => dir.meses[m]?.saldo ?? 0), dir.total]);
            });
    });
    exportarTabelaParaExcel('Dashboard_DON', headers, linhas);
}

export function exportarExcelStatus() {
    if (!_ultimoRenderStatus) { alert('Não há dados para exportar.'); return; }
    const { linhas: grupos, mesesExibir } = _ultimoRenderStatus;
    const headers = ['Gestão', 'Projeto', 'Descrição', ...mesesExibir, 'Total'];
    const linhas = grupos.map(g => [g.gestor, g.projeto, g.descricao, ...mesesExibir.map(m => g.meses[m]?.saldo ?? 0), g.total]);
    exportarTabelaParaExcel('Dashboard_Status', headers, linhas);
}

export function exportarExcelCRE() {
    if (!_ultimoRenderCRE) { alert('Não há dados para exportar.'); return; }
    const { linhas: grupos, mesesExibir } = _ultimoRenderCRE;
    const headers = ['Gestão', 'Projeto', 'DC *', ...mesesExibir, 'Total'];
    const linhas = [];
    grupos.forEach(g => {
        // Linha do grupo
        linhas.push([g.gestor, g.projeto, '-', ...mesesExibir.map(m => g.meses[m]?.saldo ?? 0), g.total]);
        // Linhas das DCs
        (g._consumos || []).forEach(c => {
            const linha = [
                '↳',
                c.projetos?.nome || '-',
                `DC ${c.dc || '-'}`,
                ...mesesExibir.map(m => {
                    const saldo = m === (c.mes_medido || c.mes_apropriacao) ? Number(c.valor || 0) : 0;
                    return saldo;
                }),
                Number(c.valor || 0)
            ];
            linhas.push(linha);
        });
    });
    exportarTabelaParaExcel('Dashboard_Tramitando_CRE', headers, linhas);
}

export function exportarExcelPendencias() {
    if (!_ultimoRenderPendencias) { alert('Não há dados para exportar.'); return; }
    const { linhas: grupos, mesesExibir } = _ultimoRenderPendencias;
    const headers = ['Gestão', 'Projeto', 'DC *', ...mesesExibir, 'Total'];
    const linhas = [];
    grupos.forEach(g => {
        // Linha do grupo
        linhas.push([g.gestor, g.projeto, '-', ...mesesExibir.map(m => g.meses[m]?.saldo ?? 0), g.total]);
        // Linhas das DCs
        (g._consumos || []).forEach(c => {
            const linha = [
                '↳',
                c.projetos?.nome || '-',
                `DC ${c.dc || '-'}`,
                ...mesesExibir.map(m => {
                    const saldo = m === (c.mes_medido || c.mes_apropriacao) ? Number(c.valor || 0) : 0;
                    return saldo;
                }),
                Number(c.valor || 0)
            ];
            linhas.push(linha);
        });
    });
    exportarTabelaParaExcel('Dashboard_Pendencias', headers, linhas);
}

// =====================================================
// EXPORTAÇÃO DE RELATÓRIO COMPLETO (TODOS OS DASHBOARDS)
// =====================================================
export function exportarRelatorioCompleto() {
    try {
        const dadosDON = _ultimoRenderDON;
        const dadosStatus = _ultimoRenderStatus;
        const dadosCRE = _ultimoRenderCRE;
        const dadosPendencias = _ultimoRenderPendencias;

        if (!dadosDON && !dadosStatus && !dadosCRE && !dadosPendencias) {
            alert('Carregue os dashboards antes de exportar o relatório.');
            return;
        }

        const wb = XLSX.utils.book_new();

        // =====================================================
        // ABA 1: DON
        // =====================================================
        if (dadosDON && dadosDON.projetos && dadosDON.projetos.length > 0) {
            const { projetos, mesesExibir } = dadosDON;
            
            let totalGeral = 0;
            projetos.forEach(proj => { totalGeral += proj.total; });
            
            const wsData = [];
            wsData.push(['Total DON:', totalGeral]);
            wsData.push([]);
            
            projetos.forEach(proj => {
                const projLinha = [proj.projeto, '', '', ''];
                mesesExibir.forEach(mes => {
                    const saldo = proj.meses[mes]?.saldo ?? 0;
                    projLinha.push(saldo);
                });
                projLinha.push(proj.total);
                wsData.push(projLinha);
                
                Object.values(proj.diretores)
                    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                    .forEach(dir => {
                        const dirLinha = ['', dir.nome, '', ''];
                        mesesExibir.forEach(mes => {
                            const saldo = dir.meses[mes]?.saldo ?? 0;
                            dirLinha.push(saldo);
                        });
                        dirLinha.push(dir.total);
                        wsData.push(dirLinha);
                    });
                
                wsData.push([]);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const numCols = 4 + mesesExibir.length + 1;
            const colWidths = [18, 22, 18, 8];
            mesesExibir.forEach(() => colWidths.push(14));
            colWidths.push(16);
            ws['!cols'] = colWidths.map(w => ({ wch: w }));
            
            // Mesclar células para o Projeto
            const merges = [];
            let mergeRow = 2;
            projetos.forEach(proj => {
                const numDiretores = Object.values(proj.diretores).length;
                const totalRows = 1 + numDiretores;
                if (totalRows > 1) {
                    merges.push({ s: { r: mergeRow, c: 0 }, e: { r: mergeRow + totalRows - 1, c: 0 } });
                }
                mergeRow += totalRows + 1;
            });
            ws['!merges'] = merges;
            
            XLSX.utils.book_append_sheet(wb, ws, 'DON');
        }

        // =====================================================
        // ABA 2: Status
        // =====================================================
        if (dadosStatus && dadosStatus.linhas && dadosStatus.linhas.length > 0) {
            const { linhas: grupos, mesesExibir } = dadosStatus;
            
            let totalGeral = 0;
            grupos.forEach(g => { totalGeral += g.total; });
            
            const wsData = [];
            wsData.push(['Total Status:', totalGeral]);
            wsData.push([]);
            
            const headers = ['Gestão', 'Projeto', '', ...mesesExibir, 'Acumulado'];
            wsData.push(headers);
            
            grupos.forEach(g => {
                const linha = [g.gestor, g.projeto, ''];
                mesesExibir.forEach(mes => {
                    const saldo = g.meses[mes]?.saldo ?? 0;
                    linha.push(saldo);
                });
                linha.push(g.total);
                wsData.push(linha);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const numCols = 3 + mesesExibir.length + 1;
            const colWidths = [18, 18, 8];
            mesesExibir.forEach(() => colWidths.push(14));
            colWidths.push(16);
            ws['!cols'] = colWidths.map(w => ({ wch: w }));
            
            XLSX.utils.book_append_sheet(wb, ws, 'Status');
        }

        // =====================================================
        // ABA 3: CRE
        // =====================================================
        if (dadosCRE && dadosCRE.linhas && dadosCRE.linhas.length > 0) {
            const { linhas: grupos, mesesExibir } = dadosCRE;
            
            let totalGeral = 0;
            grupos.forEach(g => { totalGeral += g.total; });
            
            const wsData = [];
            wsData.push(['Total Tramitando CRE:', totalGeral]);
            wsData.push([]);
            
            const headers = ['Gestão', 'Projeto', 'DC *', ...mesesExibir, 'Acumulado'];
            wsData.push(headers);
            
            grupos.forEach(g => {
                const linha = [g.gestor, g.projeto, ''];
                mesesExibir.forEach(mes => {
                    const saldo = g.meses[mes]?.saldo ?? 0;
                    linha.push(saldo);
                });
                linha.push(g.total);
                wsData.push(linha);
                
                (g._consumos || []).forEach(c => {
                    const dcLinha = ['', c.projetos?.nome || '-', `DC ${c.dc || '-'}`];
                    mesesExibir.forEach(mes => {
                        const saldo = mes === (c.mes_medido || c.mes_apropriacao) ? Number(c.valor || 0) : 0;
                        dcLinha.push(saldo);
                    });
                    dcLinha.push(Number(c.valor || 0));
                    wsData.push(dcLinha);
                });
            });
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const numCols = 3 + mesesExibir.length + 1;
            const colWidths = [18, 18, 12];
            mesesExibir.forEach(() => colWidths.push(14));
            colWidths.push(16);
            ws['!cols'] = colWidths.map(w => ({ wch: w }));
            
            XLSX.utils.book_append_sheet(wb, ws, 'CRE');
        }

        // =====================================================
        // ABA 4: Pendências
        // =====================================================
        if (dadosPendencias && dadosPendencias.linhas && dadosPendencias.linhas.length > 0) {
            const { linhas: grupos, mesesExibir } = dadosPendencias;
            
            let totalGeral = 0;
            grupos.forEach(g => { totalGeral += g.total; });
            
            const wsData = [];
            wsData.push(['Total de pendências:', totalGeral]);
            wsData.push([]);
            
            grupos.forEach(g => {
                wsData.push([`${g.gestor}:`, g.total]);
                wsData.push([]);
                
                const headers = ['Projeto', 'Empresa', 'Gestor_Logictel', 'Gestor_Cliente', 'Acumulado', ...mesesExibir];
                wsData.push(headers);
                
                // Agrupar por projeto
                const consumosPorProjeto = {};
                (g._consumos || []).forEach(c => {
                    const projetoNome = c.projetos?.nome || 'N/A';
                    if (!consumosPorProjeto[projetoNome]) {
                        consumosPorProjeto[projetoNome] = {
                            empresa: c.empresas?.nome || '',
                            gestor_logictel: g.gestor,
                            consumos: []
                        };
                    }
                    consumosPorProjeto[projetoNome].consumos.push(c);
                });
                
                Object.keys(consumosPorProjeto).forEach((projetoNome) => {
                    const grupo = consumosPorProjeto[projetoNome];
                    
                    grupo.consumos.forEach((c, cIdx) => {
                        const linha = [];
                        
                        if (cIdx === 0) {
                            linha.push(projetoNome);
                        } else {
                            linha.push('');
                        }
                        
                        if (cIdx === 0) {
                            linha.push(grupo.empresa);
                        } else {
                            linha.push('');
                        }
                        
                        if (cIdx === 0) {
                            linha.push(grupo.gestor_logictel);
                        } else {
                            linha.push('');
                        }
                        
                        linha.push(c.diretores?.nome || '');
                        
                        const valor = Number(c.valor || 0);
                        linha.push(valor);
                        
                        mesesExibir.forEach(mes => {
                            const saldo = mes === (c.mes_medido || c.mes_apropriacao) ? valor : 0;
                            linha.push(saldo);
                        });
                        
                        wsData.push(linha);
                    });
                });
                
                wsData.push([]);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const numCols = 4 + mesesExibir.length + 1;
            const colWidths = [18, 22, 18, 25, 14];
            mesesExibir.forEach(() => colWidths.push(14));
            ws['!cols'] = colWidths.map(w => ({ wch: w }));
            
            // Mesclar células
            const merges = [];
            let mergeRow = 2;
            
            grupos.forEach(g => {
                mergeRow += 2;
                mergeRow += 1;
                
                const numLinhas = (g._consumos || []).length;
                if (numLinhas > 0) {
                    merges.push({ s: { r: mergeRow, c: 0 }, e: { r: mergeRow + numLinhas - 1, c: 0 } });
                    merges.push({ s: { r: mergeRow, c: 1 }, e: { r: mergeRow + numLinhas - 1, c: 1 } });
                    merges.push({ s: { r: mergeRow, c: 2 }, e: { r: mergeRow + numLinhas - 1, c: 2 } });
                }
                
                mergeRow += numLinhas + 1;
            });
            
            ws['!merges'] = merges;
            
            XLSX.utils.book_append_sheet(wb, ws, 'Pendencias');
        }

        const dataHoje = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Relatorio_Dashboards_${dataHoje}.xlsx`);

    } catch (e) {
        console.error('Erro ao exportar relatório:', e);
        alert('Erro ao exportar relatório: ' + e.message);
    }
}

// =====================================================
// CÁLCULO DE SALDO PARA STATUS (com exclusão de CRE e Pendências)
// =====================================================
function calcularGruposSaldoStatus(medicoes, consumos, campoValor) {
    const grupos = {};

    function garantirGrupo(key, origem) {
        if (!grupos[key]) {
            grupos[key] = {
                gestor: origem.gestores_logictel?.nome || 'N/A',
                projeto: origem.projetos?.nome || 'N/A',
                descricao: origem.projetos?.nome || '',
                meses: {},
                _debitos: {},
                _caixa: 0,
                total: 0,
                _consumos: []
            };
        }
        return grupos[key];
    }

    medicoes.forEach(med => {
        const key = `${med.gestor_logictel_id}|${med.projeto_id}|${med.ano}`;
        const g = garantirGrupo(key, med);
        const valor = Math.abs(Number(med[campoValor] || 0));
        g._debitos[med.mes] = (g._debitos[med.mes] || 0) + valor;
    });

    consumos.forEach(c => {
        if (consumoDeveSerExcluido(c)) return;
        const key = `${c.gestor_logictel_id}|${c.projeto_id}|${c.ano}`;
        const g = garantirGrupo(key, c);
        g._caixa += Math.abs(Number(c.valor || 0));
        g._consumos.push(c);
    });

    Object.values(grupos).forEach(g => {
        const mesesOrdenados = Object.keys(g._debitos)
            .sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));

        let caixa = g._caixa;
        let total = 0;

        mesesOrdenados.forEach(mes => {
            const debito = g._debitos[mes];
            const aplicado = Math.min(caixa, debito);
            caixa -= aplicado;
            const saldo = aplicado - debito;
            g.meses[mes] = { saldo };
            total += saldo;
        });

        if (caixa > 0 && mesesOrdenados.length > 0) {
            const ultimoMes = mesesOrdenados[mesesOrdenados.length - 1];
            g.meses[ultimoMes].saldo += caixa;
            total += caixa;
        }

        g.total = total;
        delete g._debitos;
        delete g._caixa;
    });

    const mesesComSaldo = new Set();
    Object.values(grupos).forEach(g => {
        Object.keys(g.meses).forEach(mes => {
            if (g.meses[mes].saldo !== 0) mesesComSaldo.add(mes);
        });
    });

    if (mesesComSaldo.size === 0) {
        const todosMeses = new Set();
        Object.values(grupos).forEach(g => Object.keys(g.meses).forEach(mes => todosMeses.add(mes)));
        const primeiroMes = Array.from(todosMeses).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b))[0];
        if (primeiroMes) mesesComSaldo.add(primeiroMes);
    }

    const mesesExibir = Array.from(mesesComSaldo).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));
    return { grupos, mesesExibir };
}

// =====================================================
// CÁLCULO DE SALDO PARA DON (com exclusão de CRE e Pendências)
// =====================================================
function calcularGruposSaldoDON(medicoes, consumos) {
    const grupos = {};
    const todosMeses = new Set();

    function garantirGrupoProjeto(key, origem) {
        if (!grupos[key]) {
            grupos[key] = {
                projeto: origem.projetos?.nome || 'N/A',
                descricao: origem.projetos?.nome || '',
                meses: {},
                total: 0,
                diretores: {}
            };
        }
        return grupos[key];
    }

    function garantirDiretor(parent, diretorId, diretorNome) {
        const key = diretorId || 'sem-diretor';
        if (!parent.diretores[key]) {
            parent.diretores[key] = {
                nome: diretorNome || 'Sem diretor atribuído',
                meses: {},
                total: 0
            };
        }
        return parent.diretores[key];
    }

    medicoes.forEach(med => {
        const key = `${med.projeto_id}`;
        const parent = garantirGrupoProjeto(key, med);
        const dir = garantirDiretor(parent, med.diretor_id, med.diretores?.nome);
        todosMeses.add(med.mes);

        const valor = -Math.abs(Number(med.valor_don || 0));
        if (!parent.meses[med.mes]) parent.meses[med.mes] = { medicao: 0, consumo: 0 };
        parent.meses[med.mes].medicao += valor;
        if (!dir.meses[med.mes]) dir.meses[med.mes] = { medicao: 0, consumo: 0 };
        dir.meses[med.mes].medicao += valor;
    });

    consumos.forEach(c => {
        if (consumoDeveSerExcluido(c)) return;
        const mes = c.mes_medido;
        if (!mes) return;
        const key = `${c.projeto_id}`;
        const parent = garantirGrupoProjeto(key, c);
        const dir = garantirDiretor(parent, c.diretor_id, c.diretores?.nome);
        todosMeses.add(mes);

        const valor = Math.abs(Number(c.valor || 0));
        if (!parent.meses[mes]) parent.meses[mes] = { medicao: 0, consumo: 0 };
        parent.meses[mes].consumo += valor;
        if (!dir.meses[mes]) dir.meses[mes] = { medicao: 0, consumo: 0 };
        dir.meses[mes].consumo += valor;
    });

    function calcularSaldos(mesesObj) {
        let total = 0;
        Object.keys(mesesObj).forEach(mes => {
            const saldo = (mesesObj[mes].medicao || 0) + (mesesObj[mes].consumo || 0);
            mesesObj[mes].saldo = saldo;
            total += saldo;
        });
        return total;
    }

    Object.values(grupos).forEach(g => {
        g.total = calcularSaldos(g.meses);
        Object.values(g.diretores).forEach(d => {
            d.total = calcularSaldos(d.meses);
        });
    });

    const mesesComSaldo = new Set();
    Object.values(grupos).forEach(g => {
        Object.keys(g.meses).forEach(mes => {
            if (g.meses[mes].saldo !== 0) mesesComSaldo.add(mes);
        });
    });

    if (mesesComSaldo.size === 0 && todosMeses.size > 0) {
        const primeiroMes = Array.from(todosMeses).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b))[0];
        if (primeiroMes) mesesComSaldo.add(primeiroMes);
    }

    const mesesExibir = Array.from(mesesComSaldo).sort((a, b) => MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b));
    return { grupos, mesesExibir };
}

// =====================================================
// CÁLCULO PARA CRE - SÓ MOSTRA OS CONSUMOS COM STATUS "Falta aprovar CRE"
// =====================================================
function calcularGruposCRE(consumos) {
    const grupos = {};

    const consumosCRE = consumos.filter(c => consumoEHCRE(c));

    if (consumosCRE.length === 0) {
        return { grupos: {}, mesesExibir: [] };
    }

    consumosCRE.forEach(c => {
        const key = `${c.gestor_logictel_id}|${c.projeto_id}|${c.ano}`;
        if (!grupos[key]) {
            grupos[key] = {
                gestor: c.gestores_logictel?.nome || 'N/A',
                projeto: c.projetos?.nome || 'N/A',
                descricao: '',
                meses: {},
                total: 0,
                _consumos: []
            };
        }
        const mes = c.mes_medido || c.mes_apropriacao || 'Sem mês';
        const valor = Math.abs(Number(c.valor || 0));
        if (!grupos[key].meses[mes]) {
            grupos[key].meses[mes] = { saldo: 0 };
        }
        grupos[key].meses[mes].saldo += valor;
        grupos[key].total += valor;
        grupos[key]._consumos.push(c);
    });

    const mesesComSaldo = new Set();
    Object.values(grupos).forEach(g => {
        Object.keys(g.meses).forEach(mes => {
            if (g.meses[mes].saldo !== 0) mesesComSaldo.add(mes);
        });
    });

    const mesesExibir = Array.from(mesesComSaldo).sort((a, b) => {
        if (a === 'Sem mês') return 1;
        if (b === 'Sem mês') return -1;
        return MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b);
    });

    return { grupos, mesesExibir };
}

// =====================================================
// CÁLCULO PARA PENDÊNCIAS - SÓ MOSTRA OS CONSUMOS COM STATUS "Pendências - ..."
// =====================================================
function calcularGruposPendencias(consumos) {
    const grupos = {};

    const consumosPendencias = consumos.filter(c => consumoEHPendencia(c));

    if (consumosPendencias.length === 0) {
        return { grupos: {}, mesesExibir: [] };
    }

    consumosPendencias.forEach(c => {
        const key = `${c.gestor_logictel_id}|${c.projeto_id}|${c.ano}`;
        if (!grupos[key]) {
            grupos[key] = {
                gestor: c.gestores_logictel?.nome || 'N/A',
                projeto: c.projetos?.nome || 'N/A',
                descricao: '',
                meses: {},
                total: 0,
                _consumos: []
            };
        }
        const mes = c.mes_medido || c.mes_apropriacao || 'Sem mês';
        const valor = Math.abs(Number(c.valor || 0));
        if (!grupos[key].meses[mes]) {
            grupos[key].meses[mes] = { saldo: 0 };
        }
        grupos[key].meses[mes].saldo += valor;
        grupos[key].total += valor;
        grupos[key]._consumos.push(c);
    });

    const mesesComSaldo = new Set();
    Object.values(grupos).forEach(g => {
        Object.keys(g.meses).forEach(mes => {
            if (g.meses[mes].saldo !== 0) mesesComSaldo.add(mes);
        });
    });

    const mesesExibir = Array.from(mesesComSaldo).sort((a, b) => {
        if (a === 'Sem mês') return 1;
        if (b === 'Sem mês') return -1;
        return MESES_ORDEM.indexOf(a) - MESES_ORDEM.indexOf(b);
    });

    return { grupos, mesesExibir };
}

// =====================================================
// ÍCONES DOS CARDS "TOTAL GERAL"
// =====================================================
const ICONE_TOTAL_GERAL = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="14 7 21 7 21 14"></polyline></svg>`;
const ICONE_CRE = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`;
const ICONE_PENDENCIAS = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/><path d="M12 8v4"/></svg>`;

// =====================================================
// CARD "TOTAL GERAL"
// =====================================================
function renderizarTotalGeralCard(containerId, tema, mesesExibir, linhas, totalGeral) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.className = `total-geral-card theme-${tema}`;

    if (!linhas || linhas.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = '';

    let statsHtml = '';
    mesesExibir.forEach(mes => {
        let totalMes = 0;
        linhas.forEach(g => { totalMes += g.meses[mes]?.saldo || 0; });
        const displayValor = formatarValor(totalMes);
        statsHtml += `
            <div class="total-geral-stat">
                <div class="total-geral-stat-label">${mes}</div>
                <div class="total-geral-stat-value ${classeValor(totalMes)}">${displayValor}</div>
            </div>`;
    });

    statsHtml += `
        <div class="total-geral-stat">
            <div class="total-geral-stat-label">Total</div>
            <div class="total-geral-stat-value ${classeValor(totalGeral)}">${formatarValor(totalGeral)}</div>
        </div>`;

    container.innerHTML = `
        <div class="total-geral-icon-wrap">
            <div class="total-geral-icon">${ICONE_TOTAL_GERAL}</div>
            <div class="total-geral-label">TOTAL GERAL</div>
        </div>
        <div class="total-geral-stats">${statsHtml}</div>
    `;
}

function renderizarTotalGeralCardCRE(containerId, tema, mesesExibir, linhas, totalGeral) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.className = `total-geral-card theme-${tema}`;

    if (!linhas || linhas.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = '';

    let statsHtml = '';
    mesesExibir.forEach(mes => {
        let totalMes = 0;
        linhas.forEach(g => { totalMes += g.meses[mes]?.saldo || 0; });
        const displayValor = formatarValor(totalMes);
        statsHtml += `
            <div class="total-geral-stat">
                <div class="total-geral-stat-label">${mes}</div>
                <div class="total-geral-stat-value ${classeValor(totalMes)}">${displayValor}</div>
            </div>`;
    });

    statsHtml += `
        <div class="total-geral-stat">
            <div class="total-geral-stat-label">Total</div>
            <div class="total-geral-stat-value ${classeValor(totalGeral)}">${formatarValor(totalGeral)}</div>
        </div>`;

    container.innerHTML = `
        <div class="total-geral-icon-wrap">
            <div class="total-geral-icon">${ICONE_CRE}</div>
            <div class="total-geral-label">TOTAL CRE</div>
        </div>
        <div class="total-geral-stats">${statsHtml}</div>
    `;
}

function renderizarTotalGeralCardPendencias(containerId, tema, mesesExibir, linhas, totalGeral) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.className = `total-geral-card theme-${tema}`;

    if (!linhas || linhas.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = '';

    let statsHtml = '';
    mesesExibir.forEach(mes => {
        let totalMes = 0;
        linhas.forEach(g => { totalMes += g.meses[mes]?.saldo || 0; });
        const displayValor = formatarValor(totalMes);
        statsHtml += `
            <div class="total-geral-stat">
                <div class="total-geral-stat-label">${mes}</div>
                <div class="total-geral-stat-value ${classeValor(totalMes)}">${displayValor}</div>
            </div>`;
    });

    statsHtml += `
        <div class="total-geral-stat">
            <div class="total-geral-stat-label">Total</div>
            <div class="total-geral-stat-value ${classeValor(totalGeral)}">${formatarValor(totalGeral)}</div>
        </div>`;

    container.innerHTML = `
        <div class="total-geral-icon-wrap">
            <div class="total-geral-icon">${ICONE_PENDENCIAS}</div>
            <div class="total-geral-label">TOTAL PENDÊNCIAS</div>
        </div>
        <div class="total-geral-stats">${statsHtml}</div>
    `;
}

// =====================================================
// RENDERIZAÇÃO DA TABELA STATUS
// =====================================================
function renderizarDashboardStatus(headerId, tbodyId, grupos, mesesExibir, headerClass, totalCardId, tema) {
    const headerRow = document.querySelector(`#${headerId}`);
    if (headerRow) {
        let html = `<tr class="${headerClass}">
            <th style="text-align:left;padding:10px 12px;">Gestão</th>
            <th style="text-align:left;padding:10px 12px;">Projeto</th>
            <th style="text-align:left;padding:10px 12px;">Descrição</th>`;
        mesesExibir.forEach(mes => {
            html += `<th style="text-align:center;padding:10px 12px;min-width:90px;">${mes}</th>`;
        });
        html += '<th style="text-align:center;padding:10px 12px;">Total</th></tr>';
        headerRow.innerHTML = html;
    }

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const linhas = Object.values(grupos);
    if (linhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${3 + mesesExibir.length + 1}" style="padding:20px;text-align:center;color:var(--text-soft);">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    let totalGeral = 0;

    linhas.forEach(g => {
        totalGeral += g.total;

        let html = `
            <tr>
                <td style="text-align:left;padding:10px 12px;font-weight:600;">${g.gestor}</td>
                <td style="text-align:left;padding:10px 12px;font-weight:500;">${g.projeto}</td>
                <td style="text-align:left;padding:10px 12px;color:var(--text-soft);">${g.descricao}</td>
        `;

        mesesExibir.forEach(mes => {
            const saldo = g.meses[mes]?.saldo;
            const displayValor = formatarValor(saldo);
            const classe = classeValor(saldo);
            html += `<td style="text-align:center;padding:10px 12px;font-weight:600;${classe === 'valor-negativo' ? 'color:#FF0000;' : classe === 'valor-positivo' ? 'color:#00AA00;' : ''}">${displayValor}</td>`;
        });

        const totalColor = g.total < 0 ? 'color:#FF0000;' : (g.total > 0 ? 'color:#00AA00;' : '');
        html += `
                <td style="text-align:center;padding:10px 12px;font-weight:700;${totalColor}">${formatarValor(g.total)}</td>
            </tr>
        `;

        tbody.innerHTML += html;
    });

    const renderFn = tema === 'cre' ? renderizarTotalGeralCardCRE : renderizarTotalGeralCard;
    renderFn(totalCardId, tema, mesesExibir, linhas, totalGeral);
}

// =====================================================
// RENDERIZAÇÃO DA TABELA DON
// =====================================================
function renderizarDashboardDON(headerId, tbodyId, grupos, mesesExibir, totalCardId) {
    const headerRow = document.querySelector(`#${headerId}`);
    if (headerRow) {
        let html = `<tr class="don-header">
            <th style="text-align:left;padding:10px 12px;">Projeto</th>
            <th style="text-align:left;padding:10px 12px;">Diretor</th>
            <th style="text-align:left;padding:10px 12px;">Descrição</th>`;
        mesesExibir.forEach(mes => {
            html += `<th style="text-align:center;padding:10px 12px;min-width:90px;">${mes}</th>`;
        });
        html += '<th style="text-align:center;padding:10px 12px;">Total</th></tr>';
        headerRow.innerHTML = html;
    }

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const projetos = Object.values(grupos);
    if (projetos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${3 + mesesExibir.length + 1}" style="padding:20px;text-align:center;color:var(--text-soft);">Nenhum registro encontrado.</td></tr>`;
        renderizarTotalGeralCard(totalCardId, 'don', mesesExibir, [], 0);
        return;
    }

    tbody.innerHTML = '';
    let totalGeral = 0;

    projetos.forEach((proj, index) => {
        totalGeral += proj.total;
        const totalColor = proj.total < 0 ? 'color:#FF0000;' : (proj.total > 0 ? 'color:#00AA00;' : '');
        const projetoId = `projeto-${index}`;

        let html = `
            <tr class="projeto-row" data-projeto="${projetoId}" style="border-top:2px solid var(--primary);background:var(--primary-100);cursor:pointer;">
                <td style="text-align:left;padding:10px 12px;font-weight:700;font-size:14px;">
                    <span class="expand-icon" id="icon-${projetoId}">▶</span> ${proj.projeto}
                </td>
                <td style="text-align:left;padding:10px 12px;font-weight:500;color:var(--text-soft);">—</td>
                <td style="text-align:left;padding:10px 12px;color:var(--text-soft);">${proj.descricao}</td>
        `;
        mesesExibir.forEach(mes => {
            const saldo = proj.meses[mes]?.saldo;
            const displayValor = formatarValor(saldo);
            const classe = classeValor(saldo);
            html += `<td style="text-align:center;padding:10px 12px;font-weight:700;${classe === 'valor-negativo' ? 'color:#FF0000;' : classe === 'valor-positivo' ? 'color:#00AA00;' : ''}">${displayValor}</td>`;
        });
        html += `
                <td style="text-align:center;padding:10px 12px;font-weight:700;${totalColor}">${formatarValor(proj.total)}</td>
            </tr>
        `;
        tbody.innerHTML += html;

        const diretores = Object.values(proj.diretores).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        diretores.forEach(dir => {
            const dTotalColor = dir.total < 0 ? 'color:#FF0000;' : (dir.total > 0 ? 'color:#00AA00;' : '');
            let dirHtml = `
                <tr class="diretor-row" data-parent-projeto="${projetoId}" style="display:none;border-bottom:1px solid var(--border);">
                    <td style="text-align:left;padding:8px 12px;padding-left:24px;font-weight:500;color:var(--text-soft);">↳</td>
                    <td style="text-align:left;padding:8px 12px;font-weight:500;">${dir.nome}</td>
                    <td style="text-align:left;padding:8px 12px;color:var(--text-soft);font-size:12px;">—</td>
            `;
            mesesExibir.forEach(mes => {
                const saldo = dir.meses[mes]?.saldo;
                const displayValor = formatarValor(saldo);
                const classe = classeValor(saldo);
                dirHtml += `<td style="text-align:center;padding:8px 12px;${classe === 'valor-negativo' ? 'color:#FF0000;' : classe === 'valor-positivo' ? 'color:#00AA00;' : ''}">${displayValor}</td>`;
            });
            dirHtml += `
                    <td style="text-align:center;padding:8px 12px;font-weight:600;${dTotalColor}">${formatarValor(dir.total)}</td>
                </tr>
            `;
            tbody.innerHTML += dirHtml;
        });
    });

    document.querySelectorAll('.projeto-row').forEach(row => {
        row.onclick = function () {
            const projetoId = this.dataset.projeto;
            const linhasDiretores = document.querySelectorAll(`tr[data-parent-projeto="${projetoId}"]`);
            const icon = document.getElementById(`icon-${projetoId}`);
            if (linhasDiretores.length === 0) return;

            const estaOculto = linhasDiretores[0].style.display === 'none';
            linhasDiretores.forEach(tr => {
                tr.style.display = estaOculto ? '' : 'none';
            });
            if (icon) icon.textContent = estaOculto ? '▼' : '▶';
        };
    });

    _ultimoRenderDON = { projetos, mesesExibir };
    renderizarTotalGeralCard(totalCardId, 'don', mesesExibir, projetos, totalGeral);
}

// =====================================================
// RENDERIZAÇÃO DA TABELA CRE (COM EXPANSÃO PARA DCs)
// =====================================================
function renderizarDashboardCRE(headerId, tbodyId, grupos, mesesExibir, totalCardId) {
    const headerRow = document.querySelector(`#${headerId}`);
    if (headerRow) {
        let html = `<tr class="cre-header">
            <th style="text-align:left;padding:10px 12px;">Gestão</th>
            <th style="text-align:left;padding:10px 12px;">Projeto</th>
            <th style="text-align:left;padding:10px 12px;">DC *</th>`;
        mesesExibir.forEach(mes => {
            html += `<th style="text-align:center;padding:10px 12px;min-width:90px;">${mes}</th>`;
        });
        html += '<th style="text-align:center;padding:10px 12px;">Total</th></tr>';
        headerRow.innerHTML = html;
    }

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const linhas = Object.values(grupos);
    if (linhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${3 + mesesExibir.length + 1}" style="padding:20px;text-align:center;color:var(--text-soft);">Nenhum registro encontrado.</td></tr>`;
        renderizarTotalGeralCardCRE(totalCardId, 'cre', mesesExibir, [], 0);
        return;
    }

    tbody.innerHTML = '';
    let totalGeral = 0;

    linhas.forEach((g, index) => {
        totalGeral += g.total;
        const grupoId = `cre-grupo-${index}`;

        let html = `
            <tr class="cre-grupo-row" data-grupo="${grupoId}" style="border-top:2px solid var(--gold);background:var(--gold-bg);cursor:pointer;">
                <td style="text-align:left;padding:10px 12px;font-weight:700;font-size:14px;">
                    <span class="expand-icon" id="icon-${grupoId}">▶</span> ${g.gestor}
                </td>
                <td style="text-align:left;padding:10px 12px;font-weight:500;">${g.projeto}</td>
                <td style="text-align:left;padding:10px 12px;color:var(--text-soft);font-size:12px;">-</td>
        `;

        mesesExibir.forEach(mes => {
            const saldo = g.meses[mes]?.saldo;
            const displayValor = formatarValor(saldo);
            const classe = classeValor(saldo);
            html += `<td style="text-align:center;padding:10px 12px;font-weight:600;${classe === 'valor-positivo' ? 'color:#00AA00;' : ''}">${displayValor}</td>`;
        });

        html += `
                <td style="text-align:center;padding:10px 12px;font-weight:700;color:#00AA00;">${formatarValor(g.total)}</td>
            </tr>
        `;
        tbody.innerHTML += html;

        // Linhas de DCs (expandíveis)
        const consumos = g._consumos || [];
        if (consumos.length > 0) {
            consumos.forEach(c => {
                const valorFormatado = Number(c.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
                let dcHtml = `
                    <tr class="dc-row-cre" data-parent-grupo="${grupoId}" style="display:none;border-bottom:1px solid var(--border);background:#FFFDF5;">
                        <td style="text-align:left;padding:8px 12px;padding-left:24px;font-weight:500;color:var(--text-soft);font-size:12px;">↳</td>
                        <td style="text-align:left;padding:8px 12px;font-weight:500;color:var(--text-soft);font-size:12px;">${c.projetos?.nome || '-'}</td>
                        <td style="text-align:left;padding:8px 12px;font-weight:600;color:var(--primary);cursor:pointer;" onclick="abrirVisualizacaoDC(${c.id})">DC ${c.dc || '-'}</td>
                `;
                mesesExibir.forEach(mes => {
                    const saldo = mes === (c.mes_medido || c.mes_apropriacao) ? Number(c.valor || 0) : 0;
                    const displayValor = formatarValor(saldo);
                    dcHtml += `<td style="text-align:center;padding:8px 12px;font-size:12px;color:#00AA00;">${displayValor}</td>`;
                });
                dcHtml += `
                        <td style="text-align:center;padding:8px 12px;font-weight:600;color:#00AA00;">${valorFormatado}</td>
                    </tr>
                `;
                tbody.innerHTML += dcHtml;
            });
        }
    });

    // Evento de clique para expandir/colapsar
    document.querySelectorAll('.cre-grupo-row').forEach(row => {
        row.onclick = function () {
            const grupoId = this.dataset.grupo;
            const linhasDcs = document.querySelectorAll(`tr[data-parent-grupo="${grupoId}"]`);
            const icon = document.getElementById(`icon-${grupoId}`);
            if (linhasDcs.length === 0) return;

            const estaOculto = linhasDcs[0].style.display === 'none';
            linhasDcs.forEach(tr => {
                tr.style.display = estaOculto ? '' : 'none';
            });
            if (icon) icon.textContent = estaOculto ? '▼' : '▶';
        };
    });

    _ultimoRenderCRE = { linhas: Object.values(grupos), mesesExibir };
    renderizarTotalGeralCardCRE(totalCardId, 'cre', mesesExibir, linhas, totalGeral);
}

// =====================================================
// RENDERIZAÇÃO DA TABELA PENDÊNCIAS (COM EXPANSÃO PARA DCs)
// =====================================================
function renderizarDashboardPendencias(headerId, tbodyId, grupos, mesesExibir, totalCardId) {
    const headerRow = document.querySelector(`#${headerId}`);
    if (headerRow) {
        let html = `<tr class="pendencias-header">
            <th style="text-align:left;padding:10px 12px;">Gestão</th>
            <th style="text-align:left;padding:10px 12px;">Projeto</th>
            <th style="text-align:left;padding:10px 12px;">DC *</th>`;
        mesesExibir.forEach(mes => {
            html += `<th style="text-align:center;padding:10px 12px;min-width:90px;">${mes}</th>`;
        });
        html += '<th style="text-align:center;padding:10px 12px;">Total</th></tr>';
        headerRow.innerHTML = html;
    }

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const linhas = Object.values(grupos);
    if (linhas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${3 + mesesExibir.length + 1}" style="padding:20px;text-align:center;color:var(--text-soft);">Nenhum registro encontrado.</td></tr>`;
        renderizarTotalGeralCardPendencias(totalCardId, 'pendencias', mesesExibir, [], 0);
        return;
    }

    tbody.innerHTML = '';
    let totalGeral = 0;

    linhas.forEach((g, index) => {
        totalGeral += g.total;
        const grupoId = `pend-grupo-${index}`;

        let html = `
            <tr class="pend-grupo-row" data-grupo="${grupoId}" style="border-top:2px solid #8B0000;background:#FDE8E8;cursor:pointer;">
                <td style="text-align:left;padding:10px 12px;font-weight:700;font-size:14px;">
                    <span class="expand-icon" id="icon-${grupoId}">▶</span> ${g.gestor}
                </td>
                <td style="text-align:left;padding:10px 12px;font-weight:500;">${g.projeto}</td>
                <td style="text-align:left;padding:10px 12px;color:var(--text-soft);font-size:12px;">-</td>
        `;

        mesesExibir.forEach(mes => {
            const saldo = g.meses[mes]?.saldo;
            const displayValor = formatarValor(saldo);
            const classe = classeValor(saldo);
            html += `<td style="text-align:center;padding:10px 12px;font-weight:600;${classe === 'valor-positivo' ? 'color:#CC0000;' : ''}">${displayValor}</td>`;
        });

        html += `
                <td style="text-align:center;padding:10px 12px;font-weight:700;color:#CC0000;">${formatarValor(g.total)}</td>
            </tr>
        `;
        tbody.innerHTML += html;

        // Linhas de DCs (expandíveis)
        const consumos = g._consumos || [];
        if (consumos.length > 0) {
            consumos.forEach(c => {
                const valorFormatado = Number(c.valor || 0).toLocaleString('pt-BR', { minFractionDigits: 2 });
                let dcHtml = `
                    <tr class="dc-row-pend" data-parent-grupo="${grupoId}" style="display:none;border-bottom:1px solid var(--border);background:#FFF5F5;">
                        <td style="text-align:left;padding:8px 12px;padding-left:24px;font-weight:500;color:var(--text-soft);font-size:12px;">↳</td>
                        <td style="text-align:left;padding:8px 12px;font-weight:500;color:var(--text-soft);font-size:12px;">${c.projetos?.nome || '-'}</td>
                        <td style="text-align:left;padding:8px 12px;font-weight:600;color:var(--danger);cursor:pointer;" onclick="abrirVisualizacaoDC(${c.id})">DC ${c.dc || '-'}</td>
                `;
                mesesExibir.forEach(mes => {
                    const saldo = mes === (c.mes_medido || c.mes_apropriacao) ? Number(c.valor || 0) : 0;
                    const displayValor = formatarValor(saldo);
                    dcHtml += `<td style="text-align:center;padding:8px 12px;font-size:12px;color:#CC0000;">${displayValor}</td>`;
                });
                dcHtml += `
                        <td style="text-align:center;padding:8px 12px;font-weight:600;color:#CC0000;">${valorFormatado}</td>
                    </tr>
                `;
                tbody.innerHTML += dcHtml;
            });
        }
    });

    // Evento de clique para expandir/colapsar
    document.querySelectorAll('.pend-grupo-row').forEach(row => {
        row.onclick = function () {
            const grupoId = this.dataset.grupo;
            const linhasDcs = document.querySelectorAll(`tr[data-parent-grupo="${grupoId}"]`);
            const icon = document.getElementById(`icon-${grupoId}`);
            if (linhasDcs.length === 0) return;

            const estaOculto = linhasDcs[0].style.display === 'none';
            linhasDcs.forEach(tr => {
                tr.style.display = estaOculto ? '' : 'none';
            });
            if (icon) icon.textContent = estaOculto ? '▼' : '▶';
        };
    });

    _ultimoRenderPendencias = { linhas: Object.values(grupos), mesesExibir };
    renderizarTotalGeralCardPendencias(totalCardId, 'pendencias', mesesExibir, linhas, totalGeral);
}

// =====================================================
// FILTROS
// =====================================================
function lerFiltrosDashboard(prefixo) {
    if (prefixo === 'don') {
        return {
            projeto: document.getElementById('filt-don-projeto')?.value || '',
            diretor: document.getElementById('filt-don-diretor')?.value || '',
            ano: document.getElementById('filt-don-ano')?.value || '',
            mes: document.getElementById('filt-don-mes')?.value || ''
        };
    } else if (prefixo === 'cre') {
        return {
            gestor: document.getElementById('filt-cre-gestor')?.value || '',
            projeto: document.getElementById('filt-cre-projeto')?.value || '',
            ano: document.getElementById('filt-cre-ano')?.value || '',
            mes: document.getElementById('filt-cre-mes')?.value || ''
        };
    } else if (prefixo === 'pendencias') {
        return {
            gestor: document.getElementById('filt-pend-gestor')?.value || '',
            projeto: document.getElementById('filt-pend-projeto')?.value || '',
            ano: document.getElementById('filt-pend-ano')?.value || '',
            mes: document.getElementById('filt-pend-mes')?.value || ''
        };
    } else {
        return {
            gestor: document.getElementById('filt-aprop-gestor')?.value || '',
            projeto: document.getElementById('filt-aprop-projeto')?.value || '',
            ano: document.getElementById('filt-aprop-ano')?.value || '',
            mes: document.getElementById('filt-aprop-mes')?.value || ''
        };
    }
}

function aplicarFiltrosDashboard(lista, filtros, prefixo) {
    if (prefixo === 'don') {
        return lista.filter(item => {
            if (filtros.projeto && item.projetos?.nome !== filtros.projeto) return false;
            if (filtros.diretor && item.diretores?.nome !== filtros.diretor) return false;
            if (filtros.ano && String(item.ano) !== String(filtros.ano)) return false;
            if (filtros.mes) {
                const mesDoRegistro = item.mes ?? item.mes_medido;
                if (mesDoRegistro && mesDoRegistro !== filtros.mes) return false;
            }
            return true;
        });
    } else {
        return lista.filter(item => {
            if (filtros.gestor && item.gestores_logictel?.nome !== filtros.gestor) return false;
            if (filtros.projeto && item.projetos?.nome !== filtros.projeto) return false;
            if (filtros.ano && String(item.ano) !== String(filtros.ano)) return false;
            if (filtros.mes && item.mes && item.mes !== filtros.mes) return false;
            return true;
        });
    }
}

// =====================================================
// DASHBOARD STATUS (CINZA)
// =====================================================
export async function carregarDashApropriacao() {
    const tbody = document.getElementById('tabela-dash-apropriacao');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Carregando...</td></tr>`;

    try {
        await carregarStatusNfMap();
        const filtros = lerFiltrosDashboard('aprop');
        
        const { data: medicoes, error: errorMed } = await supabaseClient
            .from('medicoes')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id, mes, ano, valor_status,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorMed) throw errorMed;

        const { data: consumos, error: errorCons } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id,
                mes_apropriacao, mes_medido, ano, valor, status_nf, dc,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorCons) throw errorCons;

        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes || [], filtros, 'aprop');
        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros, 'aprop');
        
        const { grupos, mesesExibir } = calcularGruposSaldoStatus(
            medicoesFiltradas, 
            consumosFiltrados, 
            'valor_status'
        );
        
        _ultimoRenderStatus = { linhas: Object.values(grupos), mesesExibir };
        renderizarDashboardStatus('aprop-header', 'tabela-dash-apropriacao', grupos, mesesExibir, 'status-header', 'aprop-total-geral', 'status');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard Status:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD DON (AZUL)
// =====================================================
export async function carregarDashDON() {
    const tbody = document.getElementById('tabela-dash-don');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Carregando...</td></tr>`;

    try {
        await carregarStatusNfMap();
        const filtros = lerFiltrosDashboard('don');
        
        const { data: medicoes, error: errorMed } = await supabaseClient
            .from('medicoes')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id, mes, ano, valor_don,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorMed) throw errorMed;

        const { data: consumos, error: errorCons } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id,
                mes_apropriacao, mes_medido, ano, valor, status_nf, dc,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorCons) throw errorCons;

        const medicoesFiltradas = aplicarFiltrosDashboard(medicoes || [], filtros, 'don');
        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros, 'don');
        
        const { grupos, mesesExibir } = calcularGruposSaldoDON(
            medicoesFiltradas, 
            consumosFiltrados
        );
        
        renderizarDashboardDON('don-header', 'tabela-dash-don', grupos, mesesExibir, 'don-total-geral');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard DON:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD CRE
// =====================================================
export async function carregarDashCRE() {
    const tbody = document.getElementById('tabela-dash-cre');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Carregando...</td></tr>`;

    try {
        await carregarStatusNfMap();
        const filtros = lerFiltrosDashboard('cre');
        
        const { data: consumos, error: errorCons } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id,
                mes_apropriacao, mes_medido, ano, valor, status_nf, dc,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorCons) throw errorCons;

        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros, 'cre');
        
        const { grupos, mesesExibir } = calcularGruposCRE(consumosFiltrados);
        
        renderizarDashboardCRE('cre-header', 'tabela-dash-cre', grupos, mesesExibir, 'cre-total-geral');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard CRE:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados.</td></tr>`;
    }
}

// =====================================================
// DASHBOARD PENDÊNCIAS (VERMELHO)
// =====================================================
export async function carregarDashPendencias() {
    const tbody = document.getElementById('tabela-dash-pendencias');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Carregando...</td></tr>`;

    try {
        await carregarStatusNfMap();
        const filtros = lerFiltrosDashboard('pendencias');
        
        const { data: consumos, error: errorCons } = await supabaseClient
            .from('consumo_dc')
            .select(`
                id, projeto_id, gestor_logictel_id, diretor_id,
                mes_apropriacao, mes_medido, ano, valor, status_nf, dc,
                projetos(nome), gestores_logictel(nome), diretores(nome)
            `);
        if (errorCons) throw errorCons;

        const consumosFiltrados = aplicarFiltrosDashboard(consumos || [], filtros, 'pendencias');
        
        const { grupos, mesesExibir } = calcularGruposPendencias(consumosFiltrados);
        
        renderizarDashboardPendencias('pend-header', 'tabela-dash-pendencias', grupos, mesesExibir, 'pend-total-geral');
        registrarUltimaAtualizacao();
    } catch (e) {
        console.error('Erro ao carregar dashboard Pendências:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--text-soft);">Erro ao carregar dados.</td></tr>`;
    }
}
