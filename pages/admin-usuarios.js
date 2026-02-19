// pages/admin-usuarios.js

document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderizarLista === 'function') {
        renderizarLista();
    }
});

function renderizarLista() {
    const listaUl = document.getElementById('listaUsuarios');
    if (!listaUl) return;

    listaUl.innerHTML = '';
    
    // Usamos window.todosUsuarios que vem do script.js
    const users = window.todosUsuarios;

    Object.keys(users).forEach(username => {
        const li = document.createElement('li');
        li.style.marginBottom = "10px";
        li.innerHTML = `
            <strong>${username}</strong> (${users[username].permissoes})
            <button onclick="removerUsuario('${username}')" style="margin-left:10px">Remover</button>
        `;
        listaUl.appendChild(li);
    });
}

function adicionarNovoUsuario() {
    const nome = document.getElementById('novoNome').value.trim().toLowerCase();
    const senha = document.getElementById('novaSenhaUser').value.trim();
    const perm = document.getElementById('novaPermissao').value;

    if (!nome || !senha) {
        alert("Preencha tudo!");
        return;
    }

    window.todosUsuarios[nome] = { senha: senha, permissoes: perm };
    atualizarBanco(); // Função global do script.js
    renderizarLista();
    
    document.getElementById('novoNome').value = '';
    document.getElementById('novaSenhaUser').value = '';
}

function removerUsuario(nome) {
    if (confirm(`Excluir ${nome}?`)) {
        delete window.todosUsuarios[nome];
        atualizarBanco();
        renderizarLista();
    }
}