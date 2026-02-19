// Carrega os usuários do localStorage ou usa o padrão inicial
const todosUsuarios = JSON.parse(localStorage.getItem('todosUsuarios')) || {
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
        
        // .trim() remove espaços no início e fim
        // .toLowerCase() ignora se o celular escreveu "Pastor" ou "pastor"
        const usuarioRaw = document.getElementById('usuario').value.trim();
        const usuario = usuarioRaw.toLowerCase(); 
        const senha = document.getElementById('senha').value;
        const mensagem = document.getElementById('mensagem');

        // Verifica se o usuário existe e se a senha está correta
        if (todosUsuarios[usuario] && todosUsuarios[usuario].senha === senha) {
            localStorage.setItem('usuarioLogado', JSON.stringify({
                nome: usuario,
                permissoes: todosUsuarios[usuario].permissoes
            }));
            
            // Redirecionamento baseado nas permissões/nome
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
}

// Função para mudar a senha (chamada do dashboard)
function mudarSenha(novaSenha) {
    const user = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    // Verificamos se o usuário está logado e se o nome dele existe no nosso objeto
    if (user && user.nome && todosUsuarios[user.nome]) {
        if (novaSenha.length >= 4) {
            // Atualiza no objeto local
            todosUsuarios[user.nome].senha = novaSenha;
            // Salva o objeto inteiro atualizado no localStorage
            localStorage.setItem('todosUsuarios', JSON.stringify(todosUsuarios));
            return true;
        }
    }
    return false;
}