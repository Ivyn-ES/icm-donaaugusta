// Verifica se está logado
const user = JSON.parse(localStorage.getItem('usuarioLogado'));
if (!user) {
    window.location.href = '../index.html';
}

// Configura dashboard
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('nomeUsuario').textContent = user.nome;
    
    // Mostra links baseado na permissão
    if (user.permissoes === 'completa') {
        document.getElementById('link2').style.display = 'block';
    }
    
    // Links clicáveis
    document.getElementById('link1').onclick = () => {
        document.getElementById('conteudo').innerHTML = '<h3>📋 Página 1</h3><p>Conteúdo para todos os usuários.</p>';
    };
    document.getElementById('link2').onclick = () => {
        document.getElementById('conteudo').innerHTML = '<h3>⚙️ Página Admin</h3><p>Só administradores veem isso! 🔐</p>';
    };
});
