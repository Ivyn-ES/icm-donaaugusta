// ... (mantém todo o código anterior igual até as funções de presença)

// 👇 FUNÇÕES DE SENHA CORRIGIDAS
function mostrarMudarSenha() {
    document.getElementById('formSenha').style.display = 'block';
}

function confirmarNovaSenha() {
    const novaSenha = document.getElementById('novaSenha').value;
    if (novaSenha.length >= 4) {
        if (mudarSenha(novaSenha)) {
            document.getElementById('formSenha').style.display = 'none';
            document.getElementById('novaSenha').value = '';
            alert('✅ Senha alterada com sucesso!');
        }
    } else {
        alert('❌ Senha deve ter pelo menos 4 caracteres!');
    }
}

function esconderSenha() {
    document.getElementById('formSenha').style.display = 'none';
    document.getElementById('novaSenha').value = '';
}

// ... (resto do código igual)
