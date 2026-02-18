// Carrega usuários do localStorage
const todosUsuarios = JSON.parse(localStorage.getItem('todosUsuarios')) || {
    'pastor': { senha: '1234', permissoes: 'completa' }
};

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;
    const mensagem = document.getElementById('mensagem');

    if (todosUsuarios[usuario] && todosUsuarios[usuario].senha === senha) {
        localStorage.setItem('usuarioLogado', JSON.stringify({
            nome: usuario,
            permissoes: todosUsuarios[usuario].permissoes
        }));
        window.location.href = 'pages/dashboard.html';
    } else {
        mensagem.textContent = '❌ Usuário ou senha errados!';
        mensagem.style.color = 'red';
    }
});
