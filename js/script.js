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
// 2. SEGURANÇA E ACESSO
// ==========================================

// VERIFICAÇÃO: Impede acesso de usuários não logados
function verificarAcesso() {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuario) {
        // Se estiver dentro de /pages/, volta um nível para o index
        window.location.href = '../index.html';
        return null;
    }
    return usuario;
}

// LOGOUT: Limpa a sessão e encerra o sistema
function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = '../index.html';
}

// LOGIN DINÂMICO: Busca credenciais na tabela 'usuarios' do Supabase
async function realizarLogin(usuarioDigitado, senhaDigitada) {
    try {
        // .ilike faz a busca ignorar se o usuário digitou maiúsculo ou minúsculo
        const { data, error } = await _supabase
            .from('usuarios')
            .select('*')
            .ilike('login', usuarioDigitado) 
            .eq('senha', senhaDigitada)
            .single();

        if (error || !data) {
            console.error("Erro Supabase:", error?.message);
            alert('❌ Login falhou! Verifique usuário e senha.');
            return;
        }

        // SALVAMENTO: Guarda nome, nível (Admin/Master/User) e o Grupo vinculado
        localStorage.setItem('usuarioLogado', JSON.stringify({
            nome: data.login,
            nivel: data.permissao,
            grupo: data.grupo_vinculado 
        }));
        
        // REDIRECIONAMENTO: Envia para o Dashboard após sucesso
        window.location.href = 'pages/dashboard.html';

    } catch (err) {
        console.error("Erro inesperado no sistema:", err);
        alert('⚠️ Ocorreu um erro ao tentar conectar.');
    }
}

// ==========================================
// 3. MÓDULO DE MEMBROS (Com Filtro de Grupo)
// ==========================================

async function buscarMembrosBanco() {
    try {
        const user = verificarAcesso();
        let query = _supabase.from('membros').select('*');

        // SE NÃO FOR ADMIN/MASTER, FILTRA PELO GRUPO DO USUÁRIO
        if (user && user.nivel === 'User' && user.grupo) {
            query = query.eq('grupo', user.grupo);
        }

        const { data, error } = await query.order('nome_completo', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar membros:', error.message);
        return [];
    }
}

async function cadastrarMembro(dadosMembro) {
    try {
        const { error } = await _supabase.from('membros').insert([{
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

async function excluirMembro(id) {
    if (confirm("Deseja realmente EXCLUIR? Isso apagará todo o histórico.")) {
        try {
            const { error } = await _supabase.from('membros').delete().eq('id', id);
            if (error) throw error;
            location.reload();
        } catch (error) {
            alert("Erro: " + error.message);
        }
    }
}

async function alternarStatusMembro(id, statusAtual) {
    const novoStatus = statusAtual === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
        const { error } = await _supabase.from('membros').update({ status_registro: novoStatus }).eq('id', id);
        if (error) throw error;
        location.reload();
    } catch (error) {
        alert("Erro: " + error.message);
    }
}

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
                    <button onclick="alternarStatusMembro('${membro.id}', '${membro.status_registro}')">🔄</button>
                    <button onclick="excluirMembro('${membro.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
                </td>
            </tr>`;
    });
}

// ==========================================
// 4. MÓDULO DE GRUPOS E USUÁRIOS
// ==========================================

async function buscarGruposBanco() {
    const { data, error } = await _supabase.from('grupos').select('*').order('nome', { ascending: true });
    return error ? [] : data;
}

async function cadastrarGrupo(nome) {
    const { error } = await _supabase.from('grupos').insert([{ nome: nome }]);
    return !error;
}

async function renderizarGrupos() {
    const tabela = document.getElementById('corpoTabelaGrupos');
    if (!tabela) return;
    const grupos = await buscarGruposBanco();
    tabela.innerHTML = grupos.map(g => `
        <tr>
            <td>${g.id}</td>
            <td><strong>${g.nome}</strong></td>
            <td><button onclick="excluirGrupo(${g.id})">🗑️</button></td>
        </tr>`).join('');
}

async function excluirGrupo(id) {
    if (confirm("Deseja apagar este grupo?")) {
        await _supabase.from('grupos').delete().eq('id', id);
        renderizarGrupos();
    }
}

// ==========================================
// 5. MÓDULO DE PRESENÇA
// ==========================================

async function salvarPresencas() {
    const data = document.getElementById('dataCulto').value;
    const checkboxes = document.querySelectorAll('.check-presenca');
    if (!data) return alert("Selecione a data!");

    const registros = Array.from(checkboxes).map(cb => ({
        membro_id: cb.getAttribute('data-id'),
        data_culto: data,
        presenca: cb.checked
    }));

    try {
        const { error } = await _supabase.from('presencas').insert(registros);
        if (error) throw error;
        alert("✅ Chamada salva!");
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert("Erro: " + error.message);
    }
}