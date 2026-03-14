// ==========================================
// script.js - O MAESTRO (Versão Magra)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Sistema ICM: Inicializando Maestro...");

    // 1. Verifica Acesso
    const user = verificarAcesso(); 

    // 2. Login
    const formLogin = document.getElementById('loginForm');
    if (formLogin) formLogin.addEventListener('submit', realizarLogin);

    // 3. Interface Logada
    if (user) {
        const elBoasVindas = document.getElementById('boasVindas');
        if (elBoasVindas) elBoasVindas.innerText = `Logado como: ${user.nome || user.login}`;

        // Chama o General de Permissões (Agora no script.js ou num arquivo separado se preferir)
        await ajustarInterfacePorPerfil();

        const btnSair = document.getElementById('btnSair');
        if (btnSair) btnSair.addEventListener('click', logout);
    }
});

// ADMINISTRAÇÃO DE USUÁRIOS (Fica aqui por ser o núcleo do sistema)
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
            'btnRelatorios': p.p_relatorios
        };

        for (const id in mapa) {
            const el = document.getElementById(id);
            if (el) el.style.display = mapa[id] ? 'flex' : 'none';
        }
    } catch (e) { console.error("Erro permissões:", e); }
}

async function deletarUsuario(id) {
    if (!confirm("Remover este acesso?")) return;
    const { error } = await _supabase.from('usuarios').delete().eq('id', id);
    if (!error) { alert("Removido!"); location.reload(); }
}

// Carregar Grupos em qualquer select que precise
async function carregarGruposNoSelect() {
    const selects = document.querySelectorAll('.select-grupos'); 
    if (selects.length === 0) return;
    const { data } = await _supabase.from('grupos').select('nome').order('nome');
    if (data) {
        const html = data.map(g => `<option value="${g.nome}">${g.nome}</option>`).join('');
        selects.forEach(s => s.innerHTML += html);
    }
}