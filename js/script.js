// Carrega os usuários do localStorage ou usa o padrão inicial
let todosUsuarios = JSON.parse(localStorage.getItem('todosUsuarios')) || {
    'pastor': { senha: 'pr1234', permissoes: 'completa' },
    'secretario': { senha: 'sc1234', permissoes: 'secretaria' },
    'resp-grupo1': { senha: 'g1234', permissoes: 'grupo1' },
    'resp-grupo2': { senha: 'g2345', permissoes: 'grupo2' },
    'membro': { senha: 'm1234', permissoes: 'basica' }
};

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Captura e limpa os campos (essencial para mobile/teclado de deslizar)
        const usuarioInput = document.getElementById('usuario').value.trim().toLowerCase();
        const senhaInput = document.getElementById('senha').value.trim();
        const mensagem = document.getElementById('mensagem');

        // Verifica se o usuário existe e se a senha está correta
        if (todosUsuarios[usuarioInput] && todosUsuarios[usuarioInput].senha === senhaInput) {
            // Salva quem logou para usar no Dashboard
            localStorage.setItem('usuarioLogado', JSON.stringify({
                nome: usuarioInput,
                permissoes: todosUsuarios[usuarioInput].permissoes
            }));
            
            // Redirecionamento baseado nas permissões
            if (['pastor', 'secretario'].includes(usuarioInput)) {
                window.location.href = 'pages/dashboard.html';
            } else if (usuarioInput === 'resp-grupo1') {
                window.location.href = 'pages/grupo1.html';
            } else if (usuarioInput === 'resp-grupo2') {
                window.location.href = 'pages/grupo2.html';
            } else {
                window.location.href = 'pages/mensagens.html';
            }
        } else {
            mensagem.textContent = '❌ Usuário ou senha inválidos!';
            mensagem.style.color = 'red';
        }
    });
}

/**
 * Função global para mudar a senha
 * @param {string} novaSenha 
 */
function mudarSenha(novaSenha) {
    const logado = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (logado && logado.nome && todosUsuarios[logado.nome]) {
        // Atualiza a senha no objeto principal
        todosUsuarios[logado.nome].senha = novaSenha.trim();
        
        // Salva a lista completa atualizada no LocalStorage
        localStorage.setItem('todosUsuarios', JSON.stringify(todosUsuarios));
        return true;
    }
    return false;
}