// js/script.js

// Inicializa o banco de dados de forma global
if (!window.todosUsuarios) {
    window.todosUsuarios = JSON.parse(localStorage.getItem('todosUsuarios')) || {
        'pastor': { senha: 'pr1234', permissoes: 'completa' },
        'secretario': { senha: 'sc1234', permissoes: 'secretaria' },
        'resp-grupo1': { senha: 'g1234', permissoes: 'grupo1' },
        'resp-grupo2': { senha: 'g2345', permissoes: 'grupo2' },
        'membro': { senha: 'm1234', permissoes: 'basica' }
    };
}

// Função para salvar no LocalStorage
function atualizarBanco() {
    localStorage.setItem('todosUsuarios', JSON.stringify(window.todosUsuarios));
}

// Função para mudar senha
function mudarSenha(novaSenha) {
    const logado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (logado && window.todosUsuarios[logado.nome]) {
        window.todosUsuarios[logado.nome].senha = novaSenha.trim();
        atualizarBanco();
        return true;
    }
    return false;
}

// Lógica de Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const userIn = document.getElementById('usuario').value.trim().toLowerCase();
        const passIn = document.getElementById('senha').value.trim();
        const msg = document.getElementById('mensagem');

        if (window.todosUsuarios[userIn] && window.todosUsuarios[userIn].senha === passIn) {
            localStorage.setItem('usuarioLogado', JSON.stringify({
                nome: userIn,
                permissoes: window.todosUsuarios[userIn].permissoes
            }));
            
            // Redirecionamentos - No GitHub, use caminhos relativos sem a barra inicial se possível
            const perm = window.todosUsuarios[userIn].permissoes;
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