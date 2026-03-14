// ==========================================
// script.js - O MAESTRO (Versão Final - Sem Master)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    const user = verificarAcesso(); 

    const formLogin = document.getElementById('loginForm');
    if (formLogin) formLogin.addEventListener('submit', realizarLogin);

    if (user) {
        const elBoasVindas = document.getElementById('boasVindas');
        if (elBoasVindas) elBoasVindas.innerText = `Logado como: ${user.nome || user.login}`;

        // Ajusta o que aparece na tela baseado na permissão
        await ajustarInterfacePorPerfil();

        const btnSair = document.getElementById('btnSair');
        if (btnSair) btnSair.addEventListener('click', logout);
        
        // Se estiver em uma página de admin, carrega os dados
        if (document.getElementById('corpoTabelaUsuarios')) renderizarUsuarios();
        if (document.getElementById('corpoTabelaGrupos')) renderizarGrupos();
    }
});

// --- GESTÃO DE USUÁRIOS (Apenas Admin) ---
async function renderizarUsuarios() {
    const corpo = document.getElementById('corpoTabelaUsuarios');
    if (!corpo) return;

    try {
        const { data, error } = await _supabase.from('usuarios').select('*').order('login');
        if (error) throw error;

        corpo.innerHTML = data.map(u => `
            <tr>
                <td>${u.login}</td>
                <td>${u.permissao}</td>
                <td style="text-align:center;">
                    <button onclick="solicitarNovaSenha('${u.id}', '${u.login}')" class="btn-acao">🔑</button>
                    <button onclick="deletarUsuario('${u.id}')" class="btn-acao btn-excluir">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (err) { console.error("Erro ao carregar usuários:", err); }
}

async function deletarUsuario(id) {
    const user = verificarAcesso();
    if (user?.permissao?.toLowerCase() !== 'admin') return alert("🚫 Acesso restrito.");

    if (!confirm("Remover acesso deste usuário?")) return;
    const { error } = await _supabase.from('usuarios').delete().eq('id', id);
    if (!error) { alert("✅ Usuário removido!"); renderizarUsuarios(); }
}

// --- GESTÃO DE GRUPOS (Apenas Admin) ---
async function renderizarGrupos() {
    const corpo = document.getElementById('corpoTabelaGrupos');
    if (!corpo) return;

    const { data, error } = await _supabase.from('grupos').select('*').order('nome');
    if (!error) {
        corpo.innerHTML = data.map(g => `
            <tr>
                <td>${g.nome}</td>
                <td style="text-align:center;">
                    <button onclick="deletarGrupo('${g.id}')" class="btn-excluir">🗑️</button>
                </td>
            </tr>`).join('');
    }
}

// --- INTERFACE DINÂMICA (O General) ---
async function ajustarInterfacePorPerfil() {
    const user = verificarAcesso();
    if (!user) return;
    const nivel = (user.permissao || "").toLowerCase().trim();
    
    try {
        const { data: p } = await _supabase.from('niveis_acesso').select('*').eq('nivel_nome', nivel).single();
        if (!p) return;

        const mapa = {
            'btnChamada': p.p_chamada,
            'btnLista': p.p_membros,
            'idBtnCadastro': p.p_cadastro,
            'btnUsuarios': p.p_usuarios,
            'btnRelatorios': p.p_relatorios,
            'btnAdmin': nivel === 'admin' // Botão mestre de configurações
        };

        for (const id in mapa) {
            const el = document.getElementById(id);
            if (el) el.style.display = mapa[id] ? 'flex' : 'none';
        }
    } catch (e) { console.log("Sem tabela de permissões vinculada."); }
}