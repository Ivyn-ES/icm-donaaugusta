// Só admin pode acessar
const user = JSON.parse(localStorage.getItem('usuarioLogado'));
if (!user || user.permissoes !== 'completa') {
    window.location.href = '../index.html';
}

// Carrega usuários salvos ou cria padrão
let todosUsuarios = JSON.parse(localStorage.getItem('todosUsuarios')) || {
    'pastor': { senha: '1234', permissoes: 'completa' },
    'secretaria': { senha: '1234', permissoes: 'secretaria' },
    'tesoureiro': { senha: '1234', permissoes: 'financeiro' },
    'membro': { senha: '1234', permissoes: 'basica' }
};

document.getElementById('nomeAdmin').textContent = user.nome;

// Formulário novo usuário
document.getElementById('novoUsuario').addEventListener('submit', function(e) {
    e.preventDefault();
    const nome = document.getElementById('novoNome').value;
    const senha = document.getElementById('novaSenha').value;
    const permissao = document.getElementById('novaPermissao').value;
    
    todosUsuarios[nome] = { senha, permissoes: permissao };
    localStorage.setItem('todosUsuarios', JSON.stringify(todosUsuarios));
    
    alert(`✅ ${nome} adicionado com ${permissao}!`);
    mostrarLista();
    this.reset();
});

// Mostra lista de usuários
function mostrarLista() {
    const lista = document.getElementById('listaUsuarios');
    lista.innerHTML = '';
    
    for (let nome in todosUsuarios) {
        const usuario = todosUsuarios[nome];
        const div = document.createElement('div');
        div.style.cssText = 'margin:10px 0; padding:15px; background:#f8f9fa; border-radius:8px;';
        
        div.innerHTML = `
            <strong>${nome}</strong> 
            <span style="float:right;">
                <select onchange="editarPermissao('${nome}', this.value)">
                    <option value="completa" ${usuario.permissoes==='completa'?'selected':''}>👨‍⚖️ Completa</option>
                    <option value="secretaria" ${usuario.permissoes==='secretaria'?'selected':''}>📝 Secretaria</option>
                    <option value="financeiro" ${usuario.permissoes==='financeiro'?'selected':''}>💰 Financeiro</option>
                    <option value="lideranca" ${usuario.permissoes==='lideranca'?'selected':''}>👥 Liderança</option>
                    <option value="basica" ${usuario.permissoes==='basica'?'selected':''}>🙏 Básica</option>
                </select>
                <button onclick="removerUsuario('${nome}')" style="background:red;color:white;border:none;padding:5px 10px;border-radius:4px;margin-left:10px;">🗑️</button>
            </span>
        `;
        lista.appendChild(div);
    }
}

// Editar permissão
function editarPermissao(nome, novaPermissao) {
    todosUsuarios[nome].permissoes = novaPermissao;
    localStorage.setItem('todosUsuarios', JSON.stringify(todosUsuarios));
    alert(`✅ Permissão de ${nome} alterada!`);
}

// Remover usuário
function removerUsuario(nome) {
    if (confirm(`Remover ${nome}?`)) {
        delete todosUsuarios[nome];
        localStorage.setItem('todosUsuarios', JSON.stringify(todosUsuarios));
        mostrarLista();
    }
}

// Carrega lista ao abrir página
mostrarLista();
