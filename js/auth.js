// ==========================================
// SOLDADO: js/auth.js
// ==========================================

function verificarAcesso() {
    const usuarioJson = localStorage.getItem('usuarioLogado');
    const usuario = usuarioJson ? JSON.parse(usuarioJson) : null;
    
    if (!usuario) {
        if (!window.location.href.includes('index.html')) {
            // Verifica se está na pasta pages para saber como voltar
            const naPastaPages = window.location.pathname.includes('/pages/');
            window.location.href = naPastaPages ? '../index.html' : 'index.html';
        }
        return null;
    }
    return usuario;
}

// Criamos os dois nomes para garantir que seu HTML funcione de qualquer jeito
function logout() { realizarLogout(); }

function realizarLogout() {
    console.log("Encerrando sessão...");
    localStorage.removeItem('usuarioLogado');
    const naPastaPages = window.location.pathname.includes('/pages/');
    const destino = naPastaPages ? '../index.html' : 'index.html';
    window.location.replace(destino);
}

async function realizarLogin(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    
    // Procura por qualquer um dos IDs que você costuma usar
    const elLogin = document.getElementById('usuario') || document.getElementById('login');
    const elSenha = document.getElementById('senha');

    if (!elLogin || !elSenha) {
        console.error("Campos de login não encontrados no HTML!");
        return;
    }

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
    
    // Se logou com sucesso, vai para o dashboard
    window.location.href = 'pages/dashboard.html';
}