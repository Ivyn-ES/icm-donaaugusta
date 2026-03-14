// ==========================================
// script.js - O MAESTRO (Versão Final - Modular)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifica acesso (Função deve estar no auth.js)
    let user = null;
    if (typeof verificarAcesso === 'function') {
        user = verificarAcesso();
    }

    // 2. Configura Login se estiver na página inicial
    const formLogin = document.getElementById('loginForm');
    if (formLogin && typeof realizarLogin === 'function') {
        formLogin.addEventListener('submit', realizarLogin);
    }

    if (user) {
        // Exibe boas-vindas
        const elBoasVindas = document.getElementById('boasVindas');
        if (elBoasVindas) {
            elBoasVindas.innerText = `Logado como: ${user.nome || user.login}`;
        }

        // Ajusta o que aparece na tela baseado na permissão (O General)
        await ajustarInterfacePorPerfil();

        // Configura Logout
        const btnSair = document.getElementById('btnSair');
        if (btnSair && typeof logout === 'function') {
            btnSair.addEventListener('click', logout);
        }
        
        // Se estiver em uma página de gestão (Admin), carrega os dados
        if (document.getElementById('corpoTabelaUsuarios')) renderizarUsuarios();
        if (document.getElementById('corpoTabelaGrupos')) renderizarGrupos();
    }
});

// --- GESTÃO DE USUÁRIOS (Apenas Admin) ---
async function renderizarUsuarios() {
    const corpo = document.getElementById('corpoTabelaUsuarios');
    if (!corpo || typeof _supabase === 'undefined') return;

    try {
        const { data, error } = await _supabase.from('usuarios').select('*').order('login');
        if (error) throw error;

        corpo.innerHTML = data.map(u => `
            <tr>
                <td>${u.login}</td>
                <td>${u.permissao}</td>
                <td style="text-align:center;">
                    <button onclick="solicitarNovaSenha('${u.id}', '${u.login}')" class="btn-acao" title="Nova Senha">🔑</button>
                    <button onclick="deletarUsuario('${u.id}')" class="btn-acao btn-excluir" title="Excluir">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (err) { 
        console.error("Erro ao carregar usuários:", err); 
    }
}

async function deletarUsuario(id) {
    if (typeof verificarAcesso !== 'function' || typeof _supabase === 'undefined') return;
    
    const user = verificarAcesso();
    if (user?.permissao?.toLowerCase() !== 'admin') {
        return alert("🚫 Acesso restrito apenas para Administradores.");
    }

    if (!confirm("Remover acesso deste usuário permanentemente?")) return;
    
    try {
        const { error } = await _supabase.from('usuarios').delete().eq('id', id);
        if (error) throw error;
        alert("✅ Usuário removido!"); 
        renderizarUsuarios(); 
    } catch (err) {
        alert("❌ Erro ao remover usuário.");
    }
}

// --- GESTÃO DE GRUPOS (Apenas Admin) ---
async function renderizarGrupos() {
    const corpo = document.getElementById('corpoTabelaGrupos');
    if (!corpo || typeof _supabase === 'undefined') return;

    try {
        const { data, error } = await _supabase.from('grupos').select('*').order('nome');
        if (error) throw error;

        corpo.innerHTML = data.map(g => `
            <tr>
                <td>${g.nome}</td>
                <td style="text-align:center;">
                    <button onclick="deletarGrupo('${g.id}')" class="btn-excluir" title="Excluir Grupo">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (err) {
        console.error("Erro ao carregar grupos:", err);
    }
}

// --- INTERFACE DINÂMICA (O General) ---
async function ajustarInterfacePorPerfil() {
    if (typeof verificarAcesso !== 'function' || typeof _supabase === 'undefined') return;
    
    const user = verificarAcesso();
    if (!user) return;
    
    const nivel = (user.permissao || "").toLowerCase().trim();
    
    try {
        const { data: p, error } = await _supabase
            .from('niveis_acesso')
            .select('*')
            .eq('nivel_nome', nivel)
            .maybeSingle();

        if (!p || error) return;

        // Mapeamento de IDs de botões para as permissões do banco
        const mapa = {
            'btnChamada': p.p_chamada,
            'btnLista': p.p_membros,
            'idBtnCadastro': p.p_cadastro,
            'btnUsuarios': p.p_usuarios,
            'btnRelatorios': p.p_relatorios,
            'btnAdmin': nivel === 'admin'
        };

        for (const id in mapa) {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = mapa[id] ? 'flex' : 'none';
            }
        }
    } catch (e) { 
        console.warn("Aviso: Configuração de permissões não encontrada no banco."); 
    }
}