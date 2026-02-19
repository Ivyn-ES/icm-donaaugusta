const user = JSON.parse(localStorage.getItem('usuarioLogado'));
if (!user || !['completa', 'secretaria'].includes(user.permissoes)) {
    window.location.href = '../index.html';
}

document.getElementById('nomeUsuario').textContent = user.nome;

function mostrarMudarSenha() {
    document.getElementById('formSenha').style.display = 'block';
}

function confirmarNovaSenha() {
    const novaSenha = document.getElementById('novaSenha').value;
    if (mudarSenha(novaSenha)) {
        document.getElementById('formSenha').style.display = 'none';
        document.getElementById('novaSenha').value = '';
    } else {
        alert('❌ Senha deve ter pelo menos 4 caracteres!');
    }
}
