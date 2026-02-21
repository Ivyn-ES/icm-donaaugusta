// ==========================================
// 1. CONFIGURAÇÃO E CONEXÃO
// ==========================================
const SUPABASE_URL = 'https://pxjczmjhzopfxwlmpjfv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4amN6bWpoem9wZnh3bG1wamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjUzMjYsImV4cCI6MjA4NzEwMTMyNn0.OfekQPuYUwsZu5X9_lPDGBbVTZYBvAQ5KdiFx3TFOCY';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. SEGURANÇA E ACESSO
// ==========================================

function verificarAcesso() {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    // 1. Verifica se está logado
    if (!usuario) {
        if (!window.location.href.includes('index.html')) {
            window.location.href = '../index.html';
        }
        return null;
    }

    // 2. Trava de Segurança por Nível (Blindagem)
    const urlAtual = window.location.href;

    // Se o usuário for nível "Livre", ele SÓ pode acessar livre.html ou mensagens.html
    if (usuario.nivel === 'Livre') {
        const paginasProibidas = ['dashboard.html', 'cadastro-membro.html', 'admin-usuarios.html', 'admin-grupos.html', 'chamada.html', 'lista-membros.html'];
        
        if (paginasProibidas.some(p => urlAtual.includes(p))) {
            alert('🚫 Seu acesso é restrito à área de consulta.');
            window.location.href = 'livre.html';
            return usuario;
        }
    }

    // Se o usuário for "User" (Líder), ele não pode acessar as telas de Admin/Master
    if (usuario.nivel === 'User') {
        const paginasAdmin = ['admin-usuarios.html', 'admin-grupos.html'];
        if (paginasAdmin.some(p => urlAtual.includes(p))) {
            alert('🚫 Acesso restrito a Administradores.');
            window.location.href = 'dashboard.html';
            return usuario;
        }
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
            .ilike('login', usuarioDigitado.trim()) 
            .eq('senha', senhaDigitada.trim())
            .single();

        if (error || !data) {
            alert('❌ Login falhou! Usuário ou senha incorretos.');
            return;
        }

        // Salva os dados no navegador para persistência
        localStorage.setItem('usuarioLogado', JSON.stringify({
            nome: data.login,
            nivel: data.permissao,
            grupo: data.grupo_vinculado 
        }));

        // Redirecionamento Inteligente por Nível
        console.log(`Logado como ${data.permissao}. Redirecionando...`);
        
        if (data.permissao === 'Livre') {
            window.location.href = 'pages/livre.html';
        } else {
            // Master, Admin e User (Líder) vão para o Dashboard
            window.location.href = 'pages/dashboard.html';
        }

    } catch (err) {
        console.error('Erro de Login:', err);
        alert('⚠️ Erro ao conectar ao sistema. Tente novamente.');
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

async function cadastrarMembro(dados) {
    try {
        const { error } = await _supabase.from('membros').insert([{
            nome: dados.nome,
            situacao: dados.situacao,
            categoria: dados.categoria,
            sexo: dados.sexo,
            grupo: dados.grupo,
            dia: parseInt(dados.dia) || 0,
            mes: dados.mes,
            status_registro: 'Ativo'
        }]);

        if (error) throw error;
        return true;
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
        return false;
    }
}

async function excluirMembro(id) {
    if (!confirm("Deseja realmente excluir este membro?")) return;
    await _supabase.from('membros').delete().eq('id', id);
    renderizarListaMembros();
}

// ==========================================
// 4. MÓDULO DE GRUPOS E USUÁRIOS (ADMIN)
// ==========================================

async function criarGrupo(nomeDoGrupo) {
    const { error } = await _supabase.from('grupos').insert([{ nome: nomeDoGrupo }]);
    if (error) { alert("Erro: " + error.message); return false; }
    alert("✅ Grupo adicionado!");
    return true;
}

async function renderizarGrupos() {
    const corpo = document.getElementById('corpoTabelaGrupos');
    if (!corpo) return;
    const { data } = await _supabase.from('grupos').select('*').order('nome');
    corpo.innerHTML = data.map(g => `
        <tr>
            <td style="padding:10px;">${g.nome}</td>
            <td style="text-align:center;"><button onclick="deletarGrupo('${g.id}')">🗑️</button></td>
        </tr>`).join('');
}

async function carregarGruposNoSelect() {
    const select = document.getElementById('grupo_vinculado');
    if (!select) return;
    const { data } = await _supabase.from('grupos').select('nome').order('nome');
    select.innerHTML = '<option value="">Selecione um Grupo</option>' + 
        data.map(g => `<option value="${g.nome}">${g.nome}</option>`).join('');
}

async function criarUsuario(dados) {
    const { error } = await _supabase.from('usuarios').insert([dados]);
    if (error) { alert("Erro: " + error.message); return false; }
    alert("✅ Usuário criado!");
    return true;
}

async function renderizarUsuarios() {
    const corpo = document.getElementById('corpoTabelaUsuarios');
    if (!corpo) return;
    const { data } = await _supabase.from('usuarios').select('*').order('login');
    corpo.innerHTML = data.map(u => `
        <tr>
            <td>${u.login}</td>
            <td>${u.permissao}</td>
            <td>${u.grupo_vinculado || 'Geral'}</td>
            <td style="text-align:center;"><button onclick="deletarUsuario('${u.id}')">🗑️</button></td>
        </tr>`).join('');
}

// ==========================================
// 5. MÓDULO DE CHAMADA (PRESENÇA)
// ==========================================

async function renderizarListaChamada() {
    const container = document.getElementById('listaChamada');
    if (!container) return;
    const user = verificarAcesso();
    let consulta = _supabase.from('membros').select('id, nome, grupo').eq('status_registro', 'Ativo');
    if (user.nivel !== 'Admin' && user.nivel !== 'Master') consulta = consulta.eq('grupo', user.grupo);
    
    const { data } = await consulta.order('nome');
    container.innerHTML = data.map(m => `
        <div class="card-chamada" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid #ddd; margin-bottom:8px; border-radius:8px; background:#fff;">
            <span>${m.nome} <small>(${m.grupo})</small></span>
            <input type="checkbox" class="check-presenca" data-id="${m.id}" style="width:22px; height:22px;">
        </div>`).join('');
}

async function salvarChamada() {
    const btn = document.getElementById('btnFinalizar');
    const dataCulto = document.getElementById('data_chamada').value;
    if (!dataCulto) return alert("Selecione a data!");

    const checks = document.querySelectorAll('.check-presenca:checked');
    const presencas = Array.from(checks).map(cb => ({
        membro_id: cb.getAttribute('data-id'),
        data_culto: dataCulto,
        presenca: true
    }));

    btn.disabled = true;
    const { error } = await _supabase.from('presencas').insert(presencas);
    if (error) { alert("Erro: " + error.message); btn.disabled = false; }
    else { alert("✅ Chamada Salva!"); window.location.href = 'dashboard.html'; }
}

// ==========================================
// 6. MÓDULO DE MENSAGENS E SENHA
// ==========================================

async function mudarSenha(nova) {
    const user = verificarAcesso();
    const { error } = await _supabase.from('usuarios').update({ senha: nova }).eq('login', user.nome);
    if (error) { alert("Erro: " + error.message); return false; }
    alert("✅ Senha alterada!");
    return true;
}

// ==========================================
// 7. INICIALIZAÇÃO AUTOMÁTICA
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('loginForm');
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            realizarLogin(document.getElementById('usuario').value, document.getElementById('senha').value);
        });
    }
    
});
// Novas funções (Não sabia que nome dar)
// Abre e fecha o formulário de senha na tela
function toggleSenha() {
    const form = document.getElementById('formSenha');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        // Limpa o campo de senha ao fechar ou abrir
        document.getElementById('inputNovaSenha').value = '';
    }
}

// Salva a nova senha no banco
async function salvarNovaSenha() {
    const input = document.getElementById('inputNovaSenha');
    const novaSenha = input.value.trim();
    
    if (novaSenha.length < 4) {
        alert("⚠️ A senha deve ter no mínimo 4 caracteres.");
        return;
    }

    const confirmacao = confirm("Deseja realmente alterar sua senha?");
    if (!confirmacao) return;

    // Chame a função que já temos no script.js
    const sucesso = await mudarSenha(novaSenha);
    
    if (sucesso) {
        toggleSenha(); // Fecha o formulário
        // Não redirecionamos, apenas avisamos que deu certo
    }
}

//detalhes que não vi
function voltarAoPainelCorrespondente() {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuario) {
        window.location.href = '../index.html';
        return;
    }

    // Se for nível Livre, volta para livre.html. Se não, vai para o dashboard.
    if (usuario.nivel === 'Livre') {
        window.location.href = 'livre.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}