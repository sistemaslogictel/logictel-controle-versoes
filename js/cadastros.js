import { supabaseClient } from './config.js';
import {
    carregarSelectEmpresas, carregarSelectDiretores, carregarSelectContratos,
    carregarSelectProjetos, carregarSelectGestores, carregarSelectStatus,
    carregarFiltros, carregarFiltroStatus, carregarStatusDCCustom
} from './selects.js';

// =====================================================
// CRUD EMPRESAS
// =====================================================
export async function carregarEmpresas() {
    const tbody = document.getElementById('tabela-empresas');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('empresas')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Nenhuma empresa cadastrada.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(e => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${e.id}</td>
                    <td>${e.nome}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarEmpresa(${e.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirEmpresa(${e.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormEmpresa() {
    document.getElementById('form-empresa').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('empresa-edit-id').value;
        const dados = { nome: document.getElementById('empresa-nome').value.trim() };

        if (!dados.nome) {
            alert('Nome da empresa é obrigatório!');
            return;
        }

        try {
            let result;
            if (editId) {
                result = await supabaseClient.from('empresas').update(dados).eq('id', parseInt(editId));
            } else {
                result = await supabaseClient.from('empresas').insert([dados]);
            }

            if (result.error) {
                alert('Erro: ' + result.error.message);
                return;
            }

            alert(editId ? 'Empresa atualizada!' : 'Empresa salva!');
            e.target.reset();
            document.getElementById('empresa-edit-id').value = '';
            document.getElementById('empresa-cancel-btn').style.display = 'none';

            carregarEmpresas();
            carregarSelectEmpresas('contrato-empresa');
            carregarSelectEmpresas('projeto-empresa');
            carregarSelectEmpresas('diretor-empresa');
            carregarSelectEmpresas('dc-empresa');
            carregarSelectEmpresas('med-empresa');
        } catch (err) {
            console.error('Erro ao salvar empresa:', err);
            alert('Erro ao salvar empresa.');
        }
    });
}

export async function editarEmpresa(id) {
    try {
        const { data, error } = await supabaseClient.from('empresas').select('*').eq('id', id).single();
        if (error) { alert('Erro ao carregar: ' + error.message); return; }
        if (!data) return;

        document.getElementById('empresa-edit-id').value = id;
        document.getElementById('empresa-nome').value = data.nome;
        document.getElementById('empresa-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-empresa').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar empresa:', e);
        alert('Erro ao carregar dados da empresa.');
    }
}

export async function excluirEmpresa(id) {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;
    try {
        const { error } = await supabaseClient.from('empresas').delete().eq('id', id);
        if (error) { alert('Erro: ' + error.message); return; }
        alert('Empresa excluída!');
        carregarEmpresas();
    } catch (e) {
        console.error('Erro ao excluir empresa:', e);
        alert('Erro ao excluir empresa.');
    }
}

// =====================================================
// CRUD DIRETORES
// =====================================================
export async function carregarDiretores() {
    const tbody = document.getElementById('tabela-diretores');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('diretores')
            .select('*, empresas(nome)')
            .order('id', { ascending: true });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Nenhum diretor cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(d => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${d.id}</td>
                    <td>${d.nome}</td>
                    <td>${d.empresas?.nome || 'N/A'}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarDiretor(${d.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirDiretor(${d.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormDiretor() {
    document.getElementById('form-diretor').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('diretor-edit-id').value;
        const empresaId = document.getElementById('diretor-empresa').value;
        const dados = {
            nome: document.getElementById('diretor-nome').value.trim(),
            empresa_id: empresaId || null
        };

        if (!dados.nome) { alert('Nome do diretor é obrigatório!'); return; }
        if (!dados.empresa_id) { alert('Selecione uma empresa!'); return; }

        try {
            let result;
            if (editId) {
                result = await supabaseClient.from('diretores').update(dados).eq('id', parseInt(editId));
            } else {
                result = await supabaseClient.from('diretores').insert([dados]);
            }

            if (result.error) { alert('Erro: ' + result.error.message); return; }

            alert(editId ? 'Diretor atualizado!' : 'Diretor salvo!');
            e.target.reset();
            document.getElementById('diretor-edit-id').value = '';
            document.getElementById('diretor-cancel-btn').style.display = 'none';

            carregarDiretores();
            carregarSelectDiretores('contrato-diretor');
            carregarSelectDiretores('projeto-diretor');
            carregarSelectDiretores('dc-diretor');
            carregarSelectDiretores('med-diretor');
        } catch (err) {
            console.error('Erro ao salvar diretor:', err);
            alert('Erro ao salvar diretor.');
        }
    });
}

export async function editarDiretor(id) {
    try {
        const { data, error } = await supabaseClient.from('diretores').select('*').eq('id', id).single();
        if (error) { alert('Erro ao carregar: ' + error.message); return; }
        if (!data) return;

        document.getElementById('diretor-edit-id').value = id;
        document.getElementById('diretor-nome').value = data.nome;
        document.getElementById('diretor-empresa').value = data.empresa_id || '';
        document.getElementById('diretor-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-diretor').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar diretor:', e);
        alert('Erro ao carregar dados do diretor.');
    }
}

export async function excluirDiretor(id) {
    if (!confirm('Tem certeza que deseja excluir este diretor?')) return;
    try {
        const { error } = await supabaseClient.from('diretores').delete().eq('id', id);
        if (error) { alert('Erro: ' + error.message); return; }

        alert('Diretor excluído!');
        carregarDiretores();
        carregarSelectDiretores('contrato-diretor');
        carregarSelectDiretores('projeto-diretor');
        carregarSelectDiretores('dc-diretor');
        carregarSelectDiretores('med-diretor');
    } catch (e) {
        console.error('Erro ao excluir diretor:', e);
        alert('Erro ao excluir diretor.');
    }
}

// =====================================================
// CRUD CONTRATOS
// =====================================================
export async function carregarContratos() {
    const tbody = document.getElementById('tabela-contratos');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('contratos')
            .select('*, empresas(nome), diretores(nome)')
            .order('id', { ascending: true });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Nenhum contrato cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(c => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${c.id}</td>
                    <td>${c.numero}</td>
                    <td>${c.empresas?.nome || 'N/A'}</td>
                    <td>${c.diretores?.nome || 'N/A'}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarContrato(${c.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirContrato(${c.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormContrato() {
    document.getElementById('form-contrato').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('contrato-edit-id').value;
        const dados = {
            numero: document.getElementById('contrato-numero').value.trim(),
            empresa_id: document.getElementById('contrato-empresa').value,
            diretor_id: document.getElementById('contrato-diretor').value || null
        };

        if (!dados.numero) { alert('Número do contrato é obrigatório!'); return; }
        if (!dados.empresa_id) { alert('Selecione uma empresa!'); return; }
        if (!dados.diretor_id) { alert('Selecione um diretor!'); return; }

        try {
            let result;
            if (editId) {
                result = await supabaseClient.from('contratos').update(dados).eq('id', parseInt(editId));
            } else {
                result = await supabaseClient.from('contratos').insert([dados]);
            }

            if (result.error) { alert('Erro: ' + result.error.message); return; }

            alert(editId ? 'Contrato atualizado!' : 'Contrato salvo!');
            e.target.reset();
            document.getElementById('contrato-edit-id').value = '';
            document.getElementById('contrato-cancel-btn').style.display = 'none';

            carregarContratos();
            carregarSelectContratos('projeto-contrato');
        } catch (err) {
            console.error('Erro ao salvar contrato:', err);
            alert('Erro ao salvar contrato.');
        }
    });
}

export async function editarContrato(id) {
    try {
        const { data, error } = await supabaseClient.from('contratos').select('*').eq('id', id).single();
        if (error) { alert('Erro ao carregar: ' + error.message); return; }
        if (!data) return;

        document.getElementById('contrato-edit-id').value = id;
        document.getElementById('contrato-numero').value = data.numero;
        document.getElementById('contrato-empresa').value = data.empresa_id;
        document.getElementById('contrato-diretor').value = data.diretor_id || '';
        document.getElementById('contrato-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-contrato').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar contrato:', e);
        alert('Erro ao carregar dados do contrato.');
    }
}

export async function excluirContrato(id) {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return;
    try {
        const { error } = await supabaseClient.from('contratos').delete().eq('id', id);
        if (error) { alert('Erro: ' + error.message); return; }
        alert('Contrato excluído!');
        carregarContratos();
    } catch (e) {
        console.error('Erro ao excluir contrato:', e);
        alert('Erro ao excluir contrato.');
    }
}

// =====================================================
// CRUD PROJETOS
// =====================================================
export async function carregarProjetos() {
    const tbody = document.getElementById('tabela-projetos');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('projetos')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Nenhum projeto cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(p => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${p.id}</td>
                    <td>${p.nome}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarProjeto(${p.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirProjeto(${p.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormProjeto() {
    document.getElementById('form-projeto').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('projeto-edit-id').value;
        const nome = document.getElementById('projeto-nome').value.trim();

        if (!nome) { alert('Nome do Projeto é obrigatório!'); return; }

        const dados = { nome: nome };

        try {
            let result;
            if (editId) {
                result = await supabaseClient.from('projetos').update(dados).eq('id', parseInt(editId));
            } else {
                result = await supabaseClient.from('projetos').insert([dados]);
            }

            if (result.error) { alert('Erro: ' + result.error.message); return; }

            alert(editId ? 'Projeto atualizado!' : 'Projeto salvo!');
            e.target.reset();
            document.getElementById('projeto-edit-id').value = '';
            document.getElementById('projeto-cancel-btn').style.display = 'none';

            carregarProjetos();
            carregarSelectProjetos('gestor-projeto');
            carregarSelectProjetos('dc-projeto');
            carregarSelectProjetos('med-projeto');
            carregarFiltros();
        } catch (err) {
            console.error('Erro ao salvar projeto:', err);
            alert('Erro ao salvar projeto.');
        }
    });
}

export async function editarProjeto(id) {
    try {
        const { data, error } = await supabaseClient.from('projetos').select('*').eq('id', id).single();
        if (error) { alert('Erro ao carregar: ' + error.message); return; }
        if (!data) return;

        document.getElementById('projeto-edit-id').value = id;
        document.getElementById('projeto-nome').value = data.nome;
        document.getElementById('projeto-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-projeto').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar projeto:', e);
        alert('Erro ao carregar dados do projeto.');
    }
}

export async function excluirProjeto(id) {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    try {
        const { error } = await supabaseClient.from('projetos').delete().eq('id', id);
        if (error) { alert('Erro: ' + error.message); return; }

        alert('Projeto excluído!');
        carregarProjetos();
        carregarSelectProjetos('gestor-projeto');
        carregarSelectProjetos('dc-projeto');
        carregarSelectProjetos('med-projeto');
        carregarFiltros();
    } catch (e) {
        console.error('Erro ao excluir projeto:', e);
        alert('Erro ao excluir projeto.');
    }
}

// =====================================================
// CRUD GESTORES LOGICTEL
// =====================================================
export async function carregarGestoresLogictel() {
    const tbody = document.getElementById('tabela-gestores');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data: gestores, error: errorGestores } = await supabaseClient
            .from('gestores_logictel')
            .select('*')
            .order('id', { ascending: true });

        if (errorGestores) {
            console.error('Erro ao carregar gestores:', errorGestores);
            tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar: ${errorGestores.message}</td></tr>`;
            return;
        }

        if (!gestores || gestores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Nenhum gestor cadastrado.</td></tr>';
            return;
        }

        const { data: projetos, error: errorProjetos } = await supabaseClient
            .from('projetos')
            .select('id, nome');

        if (errorProjetos) {
            console.error('Erro ao carregar projetos:', errorProjetos);
        }

        const projetosMap = {};
        if (projetos) {
            projetos.forEach(p => { projetosMap[p.id] = p.nome; });
        }

        tbody.innerHTML = '';
        gestores.forEach(g => {
            const nomeProjeto = g.projeto_id ? (projetosMap[g.projeto_id] || '-') : '-';
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${g.id}</td>
                    <td>${g.nome}</td>
                    <td>${nomeProjeto}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarGestorLogictel(${g.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirGestorLogictel(${g.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormGestor() {
    document.getElementById('form-gestor').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('gestor-edit-id').value;
        const nome = document.getElementById('gestor-nome').value.trim();
        const projetoId = document.getElementById('gestor-projeto').value;

        if (!nome) { alert('Nome do Gestor é obrigatório!'); return; }
        if (!projetoId) { alert('Selecione um Projeto!'); return; }

        const dados = { nome: nome, projeto_id: parseInt(projetoId) };

        try {
            let result;
            if (editId) {
                result = await supabaseClient.from('gestores_logictel').update(dados).eq('id', parseInt(editId));
            } else {
                result = await supabaseClient.from('gestores_logictel').insert([dados]);
            }

            if (result.error) { alert('Erro: ' + result.error.message); return; }

            alert(editId ? 'Gestor atualizado com sucesso!' : 'Gestor salvo com sucesso!');
            e.target.reset();
            document.getElementById('gestor-edit-id').value = '';
            document.getElementById('gestor-cancel-btn').style.display = 'none';

            await carregarGestoresLogictel();
            await carregarSelectGestores('med-gestor', 'gestores_logictel');
            await carregarSelectGestores('dc-gestor', 'gestores_logictel');
            await carregarFiltros();
        } catch (e) {
            console.error('Erro:', e);
            alert('Erro ao salvar gestor.');
        }
    });
}

export async function editarGestorLogictel(id) {
    try {
        const { data, error } = await supabaseClient.from('gestores_logictel').select('*').eq('id', id).single();
        if (error) { alert('Erro ao carregar dados do gestor: ' + error.message); return; }
        if (!data) { alert('Gestor não encontrado!'); return; }

        document.getElementById('gestor-edit-id').value = id;
        document.getElementById('gestor-nome').value = data.nome;
        document.getElementById('gestor-projeto').value = data.projeto_id || '';
        document.getElementById('gestor-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-gestor').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro:', e);
        alert('Erro ao carregar dados do gestor.');
    }
}

export async function excluirGestorLogictel(id) {
    if (!confirm('Tem certeza que deseja excluir este gestor?')) return;
    try {
        const { error } = await supabaseClient.from('gestores_logictel').delete().eq('id', id);
        if (error) { alert('Erro: ' + error.message); return; }

        alert('Gestor excluído com sucesso!');
        await carregarGestoresLogictel();
        await carregarSelectGestores('med-gestor', 'gestores_logictel');
        await carregarSelectGestores('dc-gestor', 'gestores_logictel');
        await carregarFiltros();
    } catch (e) {
        console.error('Erro:', e);
        alert('Erro ao excluir gestor.');
    }
}

// =====================================================
// CRUD STATUS DC
// =====================================================
export async function carregarStatusDC() {
    const tbody = document.getElementById('tabela-statusdc');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('status_dc')
            .select('*')
            .order('codigo', { ascending: true });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Nenhum status DC cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(s => {
            const corPreview = s.cor || '#3498DB';
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${s.id}</td>
                    <td><strong>${s.codigo}</strong></td>
                    <td>${s.nome}</td>
                    <td style="font-size:11px;max-width:200px;">${s.motivo || '-'}</td>
                    <td><span style="background:${s.responsavel === 'V.tal' ? '#FF6B35' : '#3498DB'};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">${s.responsavel}</span></td>
                    <td><span style="display:inline-block;width:24px;height:24px;border-radius:4px;background:${corPreview};border:1px solid #ddd;"></span></td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarStatusDC(${s.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirStatusDC(${s.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormStatusDC() {
    document.getElementById('form-status-dc').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('statusdc-edit-id').value;
        const dados = {
            codigo: document.getElementById('statusdc-codigo').value.trim().toUpperCase(),
            nome: document.getElementById('statusdc-nome').value.trim(),
            motivo: document.getElementById('statusdc-motivo').value.trim(),
            responsavel: document.getElementById('statusdc-responsavel').value,
            cor: document.getElementById('statusdc-cor').value || '#3498DB'
        };

        if (!dados.codigo || !dados.nome) { alert('Código e Nome do status são obrigatórios!'); return; }

        try {
            let result;
            if (editId) {
                result = await supabaseClient.from('status_dc').update(dados).eq('id', parseInt(editId));
            } else {
                result = await supabaseClient.from('status_dc').insert([dados]);
            }

            if (result.error) { alert('Erro: ' + result.error.message); return; }

            alert(editId ? 'Status DC atualizado!' : 'Status DC salvo!');
            e.target.reset();
            document.getElementById('statusdc-edit-id').value = '';
            document.getElementById('statusdc-cancel-btn').style.display = 'none';

            carregarStatusDC();
            carregarSelectStatus('dc-status-dc', 'status_dc');
            carregarSelectStatus('filt-dcs-status', 'status_dc');
            carregarStatusDCCustom();
            carregarFiltroStatus();
        } catch (err) {
            console.error('Erro ao salvar status DC:', err);
            alert('Erro ao salvar status DC.');
        }
    });
}

export async function editarStatusDC(id) {
    try {
        const { data, error } = await supabaseClient.from('status_dc').select('*').eq('id', id).single();
        if (error) { alert('Erro ao carregar: ' + error.message); return; }
        if (!data) return;

        document.getElementById('statusdc-edit-id').value = id;
        document.getElementById('statusdc-codigo').value = data.codigo || '';
        document.getElementById('statusdc-nome').value = data.nome || '';
        document.getElementById('statusdc-motivo').value = data.motivo || '';
        document.getElementById('statusdc-responsavel').value = data.responsavel || 'Logictel';
        document.getElementById('statusdc-cor').value = data.cor || '#3498DB';
        document.getElementById('statusdc-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-status-dc').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar status DC:', e);
        alert('Erro ao carregar dados do status DC.');
    }
}

export async function excluirStatusDC(id) {
    if (!confirm('Tem certeza que deseja excluir este status DC?')) return;
    try {
        const { error } = await supabaseClient.from('status_dc').delete().eq('id', id);
        if (error) { alert('Erro: ' + error.message); return; }

        alert('Status DC excluído!');
        carregarStatusDC();
        carregarSelectStatus('dc-status-dc', 'status_dc');
        carregarSelectStatus('filt-dcs-status', 'status_dc');
        carregarStatusDCCustom();
        carregarFiltroStatus();
    } catch (e) {
        console.error('Erro ao excluir status DC:', e);
        alert('Erro ao excluir status DC.');
    }
}

// =====================================================
// CRUD STATUS MEDIÇÃO
// =====================================================
export async function carregarStatusMed() {
    const tbody = document.getElementById('tabela-statusmed');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('status_medicao')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Nenhum status medição cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(s => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${s.id}</td>
                    <td>${s.nome}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarStatusMed(${s.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirStatusMed(${s.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormStatusMed() {
    document.getElementById('form-status-med').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('statusmed-edit-id').value;
        const dados = { nome: document.getElementById('statusmed-nome').value.trim() };

        if (!dados.nome) { alert('Nome do status é obrigatório!'); return; }

        try {
            let result;
            if (editId) {
                result = await supabaseClient.from('status_medicao').update(dados).eq('id', parseInt(editId));
            } else {
                result = await supabaseClient.from('status_medicao').insert([dados]);
            }

            if (result.error) { alert('Erro: ' + result.error.message); return; }

            alert(editId ? 'Status Medição atualizado!' : 'Status Medição salvo!');
            e.target.reset();
            document.getElementById('statusmed-edit-id').value = '';
            document.getElementById('statusmed-cancel-btn').style.display = 'none';

            carregarStatusMed();
            carregarSelectStatus('med-status', 'status_medicao');
        } catch (err) {
            console.error('Erro ao salvar status medição:', err);
            alert('Erro ao salvar status medição.');
        }
    });
}

export async function editarStatusMed(id) {
    try {
        const { data, error } = await supabaseClient.from('status_medicao').select('*').eq('id', id).single();
        if (error) { alert('Erro ao carregar: ' + error.message); return; }
        if (!data) return;

        document.getElementById('statusmed-edit-id').value = id;
        document.getElementById('statusmed-nome').value = data.nome;
        document.getElementById('statusmed-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-status-med').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar status medição:', e);
        alert('Erro ao carregar dados do status medição.');
    }
}

export async function excluirStatusMed(id) {
    if (!confirm('Tem certeza que deseja excluir este status medição?')) return;
    try {
        const { error } = await supabaseClient.from('status_medicao').delete().eq('id', id);
        if (error) { alert('Erro: ' + error.message); return; }

        alert('Status Medição excluído!');
        carregarStatusMed();
        carregarSelectStatus('med-status', 'status_medicao');
    } catch (e) {
        console.error('Erro ao excluir status medição:', e);
        alert('Erro ao excluir status medição.');
    }
}

// =====================================================
// CRUD STATUS NF
// =====================================================
export async function carregarStatusNF() {
    const tbody = document.getElementById('tabela-statusnf');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Carregando...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('status_nf')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar.</td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Nenhum status NF cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        data.forEach(s => {
            tbody.innerHTML += `
                <tr class="td-row">
                    <td>${s.id}</td>
                    <td>${s.nome}</td>
                    <td class="text-right">
                        <div class="table-actions" style="justify-content:flex-end;">
                            <button onclick="editarStatusNF(${s.id})" class="btn-edit">Editar</button>
                            <button onclick="excluirStatusNF(${s.id})" class="btn-danger">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (e) {
        console.error('Erro inesperado:', e);
        tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center" style="color:var(--text-soft)">Erro ao carregar dados.</td></tr>`;
    }
}

export function initFormStatusNF() {
    document.getElementById('form-status-nf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('statusnf-edit-id').value;
        const dados = { nome: document.getElementById('statusnf-nome').value.trim() };

        if (!dados.nome) { alert('Nome do status é obrigatório!'); return; }

        try {
            let result;
            if (editId) {
                result = await supabaseClient.from('status_nf').update(dados).eq('id', parseInt(editId));
            } else {
                result = await supabaseClient.from('status_nf').insert([dados]);
            }

            if (result.error) { alert('Erro: ' + result.error.message); return; }

            alert(editId ? 'Status NF atualizado!' : 'Status NF salvo!');
            e.target.reset();
            document.getElementById('statusnf-edit-id').value = '';
            document.getElementById('statusnf-cancel-btn').style.display = 'none';

            carregarStatusNF();
            carregarSelectStatus('dc-status-nf', 'status_nf');
        } catch (err) {
            console.error('Erro ao salvar status NF:', err);
            alert('Erro ao salvar status NF.');
        }
    });
}

export async function editarStatusNF(id) {
    try {
        const { data, error } = await supabaseClient.from('status_nf').select('*').eq('id', id).single();
        if (error) { alert('Erro ao carregar: ' + error.message); return; }
        if (!data) return;

        document.getElementById('statusnf-edit-id').value = id;
        document.getElementById('statusnf-nome').value = data.nome;
        document.getElementById('statusnf-cancel-btn').style.display = 'inline-block';

        document.getElementById('form-status-nf').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error('Erro ao editar status NF:', e);
        alert('Erro ao carregar dados do status NF.');
    }
}

export async function excluirStatusNF(id) {
    if (!confirm('Tem certeza que deseja excluir este status NF?')) return;
    try {
        const { error } = await supabaseClient.from('status_nf').delete().eq('id', id);
        if (error) { alert('Erro: ' + error.message); return; }

        alert('Status NF excluído!');
        carregarStatusNF();
        carregarSelectStatus('dc-status-nf', 'status_nf');
    } catch (e) {
        console.error('Erro ao excluir status NF:', e);
        alert('Erro ao excluir status NF.');
    }
}
