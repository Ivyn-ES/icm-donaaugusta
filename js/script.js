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

function verificarAcesso() {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuario) {
        window.location.href = '../index.html';
        return null;
    }
    return usuario;
}

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = '../index.html';
}

async function realizarLogin(usuarioDigitado, senhaDigitada) {
    try {
        const { data, error } = await _supabase
            .from('usuarios')
            .select('*')
            .ilike('login', usuarioDigitado) 
            .eq('senha', senhaDigitada)
            .single();

        if (error || !data) {
            alert('❌ Login falhou! Verifique usuário e senha.');
            return;
        }

        localStorage.setItem('usuarioLogado', JSON.stringify({
            nome: data.login,
            nivel: data.permissao,
            grupo: data.grupo_vinculado 
        }));
        
        window.location.href = 'pages/dashboard.html';
    } catch (err) {
        alert('⚠️ Erro ao conectar ao sistema.');
    }
}

// ==========================================
// 3. MÓDULO DE MEMBROS
// ==========================================

async function renderizarListaMembros() {
    const corpoTabela = document.getElementById('corpoTabelaMembros');
    if (!corpoTabela) return;

    const user = verificarAcesso();
    try {
        let consulta = _supabase.from('membros').select('*');
        if (user.nivel !== 'Admin' && user.nivel !== 'Master') {
            consulta = consulta.eq('grupo', user.grupo); 
        }

        const { data, error } = await consulta.order('nome', { ascending: true });
        if (error) throw error;

        corpoTabela.innerHTML = "";
        data.forEach(m => {
            corpoTabela.innerHTML += `
                <tr>
                    <td>${m.nome}</td>
                    <td>${m.categoria}</td>
                    <td>${m.grupo || 'Sem Grupo'}</td>
                    <td>${m.situacao}</td>
                    <td>
                        <button onclick="excluirMembro('${m.id}')" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
                    </td>
                </tr>`;
        });
    } catch (err) {
        corpoTabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar lista.</td></tr>";
    }
}

async function cadastrarMembro(dadosMembro) {
    try {
        const { error } = await _supabase.from('membros').insert([{
            nome: dadosMembro.nome,
            situacao: dadosMembro.situacao,
            categoria: dadosMembro.categoria,
            sexo: dadosMembro.sexo,
            grupo: dadosMembro.grupo,
            dia: parseInt(dadosMembro.dia) || 0,
            mes: dadosMembro.mes,
            status_registro: 'Ativo'
        }]);

        if (error) throw error;
        alert("✅ Membro cadastrado!");
        window.location.href = "lista-membros.html";
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
    }
}

async function excluirMembro(id) {
    if (!confirm("Deseja realmente excluir este membro?")) return;
    try {
        await _supabase.from('membros').delete().eq('id', id);
        renderizarListaMembros();
    } catch (err) {
        alert("Erro ao excluir.");
    }
}

// ==========================================
// 4. MÓDULO DE GRUPOS
// ==========================================

async function criarGrupo(nomeDoGrupo) {
    try {
        const { error } = await _supabase.from('grupos').insert([{ nome: nomeDoGrupo }]);
        if (error) throw error;
        alert("✅ Grupo adicionado!");
        return true;
    } catch (err) {
        alert("Erro ao criar grupo: " + err.message);
        return false;
    }
}

async function renderizarGrupos() {
    const corpoTabela = document.getElementById('corpoTabelaGrupos');
    if (!corpoTabela) return;

    try {
        const { data, error } = await _supabase.from('grupos').select('*').order('nome');
        if (error) throw error;

        corpoTabela.innerHTML = "";
        data.forEach(g => {
            corpoTabela.innerHTML += `
                <tr>
                    <td style="padding: 10px; text-align: center;">${g.nome}</td>
                    <td style="text-align: center;">
                        <button onclick="deletarGrupo('${g.id}', '${g.nome}')" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
                    </td>
                </tr>`;
        });
    } catch (err) {
        console.error(err);
    }
}

async function deletarGrupo(id, nome) {
    if (!confirm(`Excluir o Grupo ${nome}?`)) return;
    try {
        await _supabase.from('grupos').delete().eq('id', id);
        renderizarGrupos();
    } catch (err) {
        alert("Erro ao excluir grupo.");
    }
}

async function carregarGruposNoSelect() {
    const select = document.getElementById('grupo_vinculado');
    if (!select) return;

    const { data, error } = await _supabase.from('grupos').select('nome').order('nome');
    if (!error && data) {
        select.innerHTML = '<option value="">Selecione um Grupo</option>';
        data.forEach(g => {
            select.innerHTML += `<option value="${g.nome}">${g.nome}</option>`;
        });
    }
}

// ==========================================
// 5. MÓDULO DE CHAMADA
// ==========================================

async function renderizarListaChamada() {
    const listaContainer = document.getElementById('listaChamada');
    if (!listaContainer) return;

    const user = verificarAcesso();
    try {
        let consulta = _supabase.from('membros').select('id, nome, grupo');
        if (user.nivel !== 'Admin' && user.nivel !== 'Master') {
            consulta = consulta.eq('grupo', user.grupo);
        }

        const { data, error } = await consulta.order('nome');
        if (error) throw error;

        listaContainer.innerHTML = "";
        data.forEach(m => {
            listaContainer.innerHTML += `
                <div class="card-chamada" style="display:flex; align-items:center; justify-content:space-between; padding:15px; margin-bottom:10px; background:#fff; border: