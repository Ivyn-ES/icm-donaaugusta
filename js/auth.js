// ==========================================
// 2. SEGURANÇA E AUTENTICAÇÃO
// ==========================================

// Verifica se o usuário tem permissão para estar na página
function verificarAcesso() {
    const usuarioJson = localStorage.getItem('usuarioLogado');
    const usuario = usuarioJson ? JSON.parse(usuarioJson) : null;
    
    if (!usuario && !window.location.href.includes('index.html')) {
        // Se não houver sessão, manda para a raiz (index.html)
        const path = window.location.href.includes('/pages/') ? '../index.html' : 'index.html';
        window.location.href = path;
        return null;
    }
    return usuario;
}

// A função que o seu botão "Sair" do Dashboard chama
function logout() {
    console.log("Encerrando sessão...");
    localStorage.removeItem('usuarioLogado');
    
    // Identifica se estamos dentro da pasta /pages/ ou na raiz
    const naPastaPages = window.location.pathname.includes('/pages/');
    const destino = naPastaPages ? '../index.html' : 'index.html';
    
    window.location.replace(destino);
}

// Função de Login (Usada na index.html)
async function realizarLogin(e) {
    if (e) e.preventDefault();
    
    const elLogin = document.getElementById('login') || document.getElementById('usuario');
    const elSenha = document.getElementById('senha');

    if (!elLogin || !elSenha) return;

    const { data: usuario, error } = await _supabase
        .from('usuarios')
        .select('*')
        .eq('login', elLogin.value.trim())
        .eq('senha', elSenha.value.trim())
        .single();

    if (error || !usuario) {
        alert('Login ou senha incorretos!');
        return;
    }

    localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
    window.location.href = 'pages/dashboard.html';
}