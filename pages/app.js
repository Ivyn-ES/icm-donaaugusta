// Verifica se está logado
const user = JSON.parse(localStorage.getItem('usuarioLogado'));
if (!user) {
    window.location.href = '../index.html';
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('nomeUsuario').textContent = user.nome;
    
    // MOSTRA LINKS por permissão (CÓDIGO ANTIGO)
    document.getElementById('link1').style.display = 'block'; // todos veem
    
    if (user.permissoes === 'completa') {
        // 👇 ADICIONE ESTAS 4 LINHAS NO FINAL (NOVO!)
        document.getElementById('link2').style.display = 'block';           // Admin
        document.getElementById('linkSecretaria').style.display = 'block';  // Secretaria
        document.getElementById('linkFinanceiro').style.display = 'block';  // Financeiro
        document.getElementById('linkAdmin').style.display = 'block';       // Gerenciar Usuários
    }
    else if (user.permissoes === 'secretaria') {
        document.getElementById('linkSecretaria').style.display = 'block';
    }
    else if (user.permissoes === 'financeiro') {
        document.getElementById('linkFinanceiro').style.display = 'block';
    }
    
    // Links clicáveis (código antigo continua igual)
    document.getElementById('link1').onclick = () => {
        document.getElementById('conteudo').innerHTML = '<h3>📋 Página 1</h3><p>Conteúdo para todos os usuários.</p>';
    };
    document.getElementById('link2').onclick = () => {
        document.getElementById('conteudo').innerHTML = '<h3>⚙️ Página Admin</h3><p>Só administradores veem isso! 🔐</p>';
    };
});
