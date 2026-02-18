const todosUsuarios = JSON.parse(localStorage.getItem('todosUsuarios')) || {
    'pastor': { senha: '1234', permissoes: 'completa' },
    'secretario': { senha: '1234', permissoes: 'secretaria' },
    'resp-grupo1': { senha: '1234', permissoes: 'grupo1' },
    'resp-grupo2': { senha: '1234', permissoes: 'grupo2' }
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
        
        // 🔄 REDIRECIONAMENTO AUTOMÁTICO:
        if (usuario === 'pastor' || usuario === 'secretario') {
            window.location.href = 'pages/dashboard.html'; // TUDO
        } else if (usuario === 'resp-grupo1') {
            window.location.href = 'pages/grupo1.html';    // Só Grupo 1
        } else if (usuario === 'resp-grupo2') {
            window.location.href = 'pages/grupo2.html';    // Só Grupo 2
        }
    } else {
        mensagem.textContent = '❌ Usuário ou senha errados!';
        mensagem.style.color = 'red';
    }
});
