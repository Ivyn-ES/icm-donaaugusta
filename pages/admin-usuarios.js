document.addEventListener('DOMContentLoaded', () => {
    renderizarLista();
});

function renderizarLista() {
    const listaUl = document.getElementById('listaUsuarios');
    if (!listaUl) return;

    listaUl.innerHTML = '';

    // "todosUsuarios" vem do script.js que foi carregado antes
    Object.keys(todosUsuarios).forEach(username => {
        const user = todosUsuarios[username];
        
        const li = document.createElement('li');
        li.className = 'user-item';
        li.innerHTML = `
            <div class="user-info">
                <strong>${username}</strong> 
                <span>Tipo: ${user.permissoes}</span>
            </div>
            <button onclick="removerUsuario('${username}')" class="btn-delete">❌ Excluir</button>
        `;
        listaUl.appendChild(li);
    });
}

function adicionarNovoUsuario() {
    const nomeInput = document.getElementById('novoNome').value.trim().toLowerCase();
    const senhaInput = document.getElementById('novaSenhaUser').value.trim();
    const permInput = document.getElementById('novaPermissao').value;

    if (nomeInput === "" || senhaInput === "") {
        alert("Preencha o nome e a senha!");
        return;
    }

    if (senhaInput.length < 4) {
        alert("A senha precisa ter no mínimo 4 caracteres!");
        return;
    }

    if (todosUsuarios[nomeInput]) {
        alert("Este usuário já existe!");
        return;
    }

    // Adiciona ao objeto que está na memória
    todosUsuarios[nomeInput] = {
        senha: senhaInput,
        permissoes: permInput
    };

    // Salva no LocalStorage (usando a função do script.js)
    atualizarBanco();
    
    // Limpa os campos e atualiza a tela
    document.getElementById('novoNome').value = '';
    document.getElementById('novaSenhaUser').value = '';
    renderizarLista();
    
    alert(`Usuário ${nomeInput} criado com sucesso!`);
}

function removerUsuario(nome) {
    // Proteção para não excluir o próprio pastor logado por acidente
    const logado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (nome === logado.nome) {
        alert("Você não pode excluir seu próprio usuário!");
        return;
    }

    if (confirm(`Tem certeza que deseja remover o usuário: ${nome}?`)) {
        delete todosUsuarios[nome];
        atualizarBanco();
        renderizarLista();
    }
}