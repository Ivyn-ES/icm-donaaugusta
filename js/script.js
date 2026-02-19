// USUÁRIOS COM SENHAS ATUALIZADAS
const todosUsuarios = JSON.parse(localStorage.getItem('todosUsuarios')) || {
    'pastor': { senha: 'pr1234', permissoes: 'completa' },
    'secretario': { senha: 'sc1234', permissoes: 'secretaria' },
    'resp-grupo1': { senha: 'g1234', permissoes: 'grupo1' },
    'resp-grupo2': { senha: 'g2345', permissoes: 'grupo2' },
    'membro': { senha: 'm1234', permissoes: 'basica' }
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
        
        // REDIRECIONAMENTO AUTOMÁTICO
        if (['pastor', 'secretario'].includes(usuario)) {
            window.location.href = 'pages/dashboard.html';
        } else if (usuario === 'resp-grupo1') {
            window.location.href = 'pages/grupo1.html';
        } else if (usuario === 'resp-grupo2') {
            window.location.href = 'pages/grupo2.html';
        } else {
            window.location.href = 'pages/mensagens.html';
        }
    } else {
        mensagem.textContent = '❌ Usuário ou senha errados!';
        mensagem.style.color = 'red';
    }
});

// Função global para MUDAR SENHA
function mudarSenha(novaSenha) {
    const user = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (user) {
        todosUsuarios[user.nome].senha = novaSenha;
        localStorage.setItem('todosUsuarios', JSON.stringify(todosUsuarios));
        alert('✅ Senha alterada com sucesso!');
    }
}
