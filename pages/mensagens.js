const user = JSON.parse(localStorage.getItem('usuarioLogado'));
if (!user) window.location.href = '../index.html';

document.getElementById('nomeUsuario').textContent = user.nome;
document.getElementById('mensagensLista').innerHTML = `
    <div style="background:#f0f8ff;padding:20px;border-radius:10px;margin:10px 0;">
        <h3>✨ Domingo 22/02 - 18:00</h3>
        <p><strong>Culto de Louvor e Adoração</strong><br>Tema: "O Senhor é meu Pastor"<br>Pastor João</p>
    </div>
    <div style="background:#fff3cd;padding:20px;border-radius:10px;margin:10px 0;">
        <h3>📖 Segunda 23/02 - 19:30</h3>
        <p><strong>Estudo Bíblico - Salmos</strong></p>
    </div>
`;

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
