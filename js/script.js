// BANCO DE DADOS LOCAL
// Carrega os usuários ou define os padrões
let todosUsuarios = JSON.parse(localStorage.getItem('todosUsuarios')) || {
    'pastor': { senha: 'pr1234', permissoes: 'completa' },
    'secretario': { senha: 'sc1234', permissoes: 'secretaria' },
    'resp-grupo1': { senha: 'g1234', permissoes: 'grupo1' },
    'resp-grupo2': { senha: 'g2345', permissoes: 'grupo2' },
    'membro': { senha: 'm1234', permissoes: 'basica' }
};

// FUNÇÃO GLOBAL: Salva no LocalStorage
function atualizarBanco() {
    localStorage.setItem('todosUsuarios', JSON.stringify(todosUsuarios));
}

// FUNÇÃO GLOBAL: Mudar Senha
function mudarSenha(novaSenha) {
    const logado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (logado && todosUsuarios[logado.nome]) {
        todosUsuarios[logado.nome].senha = novaSenha.trim();
        atualizarBanco();
        return true;
    }
    return false;
}

// LOGICA DE LOGIN (Apenas se estiver na index.html)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const userIn = document.getElementById('usuario').value.trim().toLowerCase();
        const passIn = document.getElementById('senha').value.trim();
        const msg = document.getElementById('mensagem');

        if (todosUsuarios[userIn] && todosUsuarios[userIn].senha === passIn) {
            localStorage.setItem('usuarioLogado', JSON.stringify({
                nome: userIn,
                permissoes: todosUsuarios[userIn].permissoes
            }));
            
            // Redirecionamento
            const perm = todosUsuarios[userIn].permissoes;
            if (['completa', 'secretaria'].includes(perm)) window.location.href = 'pages/dashboard.html';
            else if (perm === 'grupo1') window.location.href = 'pages/grupo1.html';
            else if (perm === 'grupo2') window.location.href = 'pages/grupo2.html';
            else window.location.href = 'pages/mensagens.html';
        } else {
            msg.textContent = '❌ Usuário ou senha incorretos!';
            msg.style.color = 'red';
        }
    });
}