// ==========================================
// 1. CONEXÃO E CHAVES
// ==========================================
const SUPABASE_URL = 'https://pxjczmjhzopfxwlmpjfv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4amN6bWpoem9wZnh3bG1wamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjUzMjYsImV4cCI6MjA4NzEwMTMyNn0.OfekQPuYUwsZu5X9_lPDGBbVTZYBvAQ5KdiFx3TFOCY';

let _supabase;
if (typeof supabase !== 'undefined') {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ==========================================
// 2. FUNÇÕES DE BANCO DE DADOS (CRUD)
// ==========================================

// BUSCAR: Lista membros (usada na lista e na chamada)
async function buscarMembrosBanco() {
    try {
        const { data, error } = await _supabase
            .from('membros')
            .select('*')
            .order('nome_completo', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar:', error.message);
        return [];
    }
}

// CADASTRAR: Novo membro
async function cadastrarMembro(dadosMembro) {
    try {
        const { data, error } = await _supabase
            .from('membros')
            .insert([{
                nome_completo: dadosMembro.nome,
                situacao: dadosMembro.situacao,
                categoria: dadosMembro.categoria,
                sexo: dadosMembro.sexo,
                grupo: dadosMembro.grupo,
                aniversario_dia: parseInt(dadosMembro.dia),
                aniversario_mes: dadosMembro.mes,
                status_registro: 'Ativo'
            }]);
        if (error) throw error;
        alert('✅ Sucesso ao cadastrar!');
        return true;
    } catch (error) {
        alert('❌ Erro: ' + error.message);
        return false;
    }
}

// EXCLUIR: Remove permanentemente
async function excluirMembro(id) {
    if (confirm("Deseja realmente EXCLUIR este registro? Use isso apenas para erros de cadastro.")) {
        if (confirm("Atenção: Isso apagará todo o histórico deste membro. Tem certeza absoluta?")) {
            try {
                const { error } = await _supabase.from('membros').delete().eq('id', id);
                if (error) throw error;
                alert("Registro apagado.");
                location.reload();
            } catch (error) {
                alert("Erro ao excluir: " + error.message);
            }
        }
    }
}

// ALTERNAR STATUS: Ativar/Inativar (A "Auditoria" que conversamos)
async function alternarStatusMembro(id, statusAtual) {
    const novoStatus = statusAtual === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
        const { error } = await _supabase
            .from('membros')
            .update({ status_registro: novoStatus })
            .eq('id', id);

        if (error) throw error;
        location.reload();
    } catch (error) {
        alert("Erro ao mudar status: " + error.message);
    }
}

// ==========================================
// 3. RENDERIZAÇÃO DE INTERFACE
// ==========================================

// ESTA É A FUNÇÃO QUE FALTAVA: Preenche a tabela de membros
async function renderizarListaMembros() {
    const tabela = document.getElementById('corpoTabelaMembros');
    if (!tabela) return;

    const membros = await buscarMembrosBanco();
    tabela.innerHTML = '';

    membros.forEach(membro => {
        const statusCor = membro.status_registro === 'Ativo' ? '#2ed573' : '#ff4757';
        
        tabela.innerHTML += `
            <tr>
                <td><strong>${membro.nome_completo}</strong></td>
                <td>${membro.categoria || 'Membro'}</td>
                <td><span style="color: ${statusCor}; font-weight: bold;">${membro.status_registro}</span></td>
                <td>
                    <button onclick="alternarStatusMembro('${membro.id}', '${membro.status_registro}')" title="Mudar Status">🔄</button>
                    <button onclick="excluirMembro('${membro.id}')" title="Excluir" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">🗑️</button>
                </td>
            </tr>
        `;
    });
}

// ==========================================
// 4. SISTEMA DE PRESENÇA (CHAMADA)
// ==========================================

async function salvarPresencas() {
    const data = document.getElementById('dataCulto').value;
    const checkboxes = document.querySelectorAll('.check-presenca');
    const registros = [];

    if (!data) return alert("Selecione a data do culto!");

    checkboxes.forEach(cb => {
        registros.push({
            membro_id: cb.getAttribute('data-id'),
            data_culto: data,
            presenca: cb.checked
        });
    });

    try {
        const { error } = await _supabase.from('presencas').insert(registros);
        if (error) throw error;
        alert("✅ Chamada salva com sucesso!");
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert("Erro ao salvar presença: " + error.message);
    }
}

// ==========================================
// 5. LOGIN E SEGURANÇA
// ==========================================

function verificarAcesso() {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuario) {
        window.location.href = '../index.html';
    }
    return usuario;
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const userIn = document.getElementById('usuario').value.trim().toLowerCase();
        const passIn = document.getElementById('senha').value.trim();

        const usuariosPadrao = {
            'pastor': { senha: '123', nivel: 'admin' },
            'secretaria': { senha: '123', nivel: 'admin' }
        };

        if (usuariosPadrao[userIn] && usuariosPadrao[userIn].senha === passIn) {
            localStorage.setItem('usuarioLogado', JSON.stringify({ nome: userIn, nivel: usuariosPadrao[userIn].nivel }));
            window.location.href = 'pages/dashboard.html';
        } else {
            alert('❌ Login falhou!');
        }
    });
}

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = '../index.html';
}

// BUSCAR GRUPOS
async function buscarGruposBanco() {
    const { data, error } = await _supabase
        .from('grupos')
        .select('*')
        .order('nome', { ascending: true });
    return error ? [] : data;
}

// CADASTRAR GRUPO
async function cadastrarGrupo(nome) {
    const { error } = await _supabase
        .from('grupos')
        .insert([{ nome: nome }]);
    if (error) {
        alert("Erro: " + error.message);
        return false;
    }
    return true;
}

// RENDERIZAR NA TABELA
async function renderizarGrupos() {
    const tabela = document.getElementById('corpoTabelaGrupos');
    if (!tabela) return;
    const grupos = await buscarGruposBanco();
    tabela.innerHTML = '';
    grupos.forEach(g => {
        tabela.innerHTML += `
            <tr>
                <td>${g.id}</td>
                <td><strong>${g.nome}</strong></td>
                <td>
                    <button onclick="excluirGrupo(${g.id})" style="background:none; border:none; cursor:pointer;">🗑️</button>
                </td>
            </tr>`;
    });
}

// EXCLUIR GRUPO
async function excluirGrupo(id) {
    if (confirm("Deseja apagar este grupo? Membros vinculados a ele ficarão sem grupo.")) {
        const { error } = await _supabase.from('grupos').delete().eq('id', id);
        if (!error) renderizarGrupos();
    }
}