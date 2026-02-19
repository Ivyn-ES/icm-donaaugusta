const user = JSON.parse(localStorage.getItem('usuarioLogado'));
if (!user || user.permissoes !== 'completa') window.location.href = '../index.html';

document.getElementById('nomeAdmin').textContent = user.nome;

// USUÁRIOS
let todosUsuarios = JSON.parse(localStorage.getItem('todosUsuarios')) || {
    'pastor': { senha: 'pr1234', permissoes: 'completa' },
    'secretario': { senha: 'sc1234', permissoes: 'secretaria' },
    'resp-grupo1': { senha: 'g1234', permissoes: 'grupo1' },
    'resp-grupo2': { senha: 'g2345', permissoes: 'grupo2' },
    'membro': { senha: 'm1234', permissoes: 'basica' }
};

// GRUPOS
let grupos = JSON.parse(localStorage.getItem('grupos')) || {
    grupo1: { nome: 'Grupo 1 - Vera Cruz', bairro: 'Vera Cruz', membros: ['Maria Silva', 'João Santos', 'Ana Costa'] },
    grupo2: { nome: 'Grupo 2 - Jardim América', bairro: 'Jardim América', membros: ['Pedro Almeida', 'Lucas Souza', 'Carla Lima'] }
};

// NOVO USUÁRIO
document.getElementById('novoUsuario').addEventListener('submit', function(e) {
    e.preventDefault();
    const nome = document.getElementById('novoNome').value;
    const senha = document.getElementById('novaSenha').value;
    const permissao = document.getElementById('novaPermissao').value;
    
    if (todosUsuarios[nome]) {
        alert('❌ Usuário já existe!');
        return;
    }
    
    todosUsuarios[nome] = { senha, permissoes: permissao };
    localStorage.setItem('todosUsuarios', JSON.stringify(todosUsuarios));
    alert(`✅ ${nome} adicionado (${permissao})!`);
    mostrarLista();
    this.reset();
});

// LISTA USUÁRIOS
function mostrarLista() {
    const lista = document.getElementById('listaUsuarios');
    lista.innerHTML = '';
    for (let nome in todosUsuarios) {
        const usuario = todosUsuarios[nome];
        const div = document.createElement('div');
        div.style.cssText = 'margin:10px 0;padding:15px;background:#f8f9fa;border-radius:8px;display:flex;justify-content:space-between;align-items:center;';
        div.innerHTML = `
            <strong>${nome}</strong> <span class="permissao-${usuario.permissoes}">${usuario.permissoes}</span>
            <span>
                <select onchange="editarPermissao('${nome}', this.value)">
                    <option value="completa" ${usuario.permissoes==='completa'?'selected':''}>Completa</option>
                    <option value="secretaria" ${usuario.permissoes==='secretaria'?'selected':''}>Secretaria</option>
                    <option value="grupo1" ${usuario.permissoes==='grupo1'?'selected':''}>Grupo 1</option>
                    <option value="grupo2" ${usuario.permissoes==='grupo2'?'selected':''}>Grupo 2</option>
                    <option value="basica" ${usuario.permissoes==='basica'?'selected':''}>Membro</option>
                </select>
                <button onclick="removerUsuario('${nome}')" style="background:red;color:white;border:none;padding:8px 12px;border-radius:4px;margin-left:10px;">🗑️</button>
            </span>
        `;
        lista.appendChild(div);
    }
}

function editarPermissao(nome, novaPermissao) {
    todosUsuarios[nome].permissoes = novaPermissao;
    localStorage.setItem('todosUsuarios', JSON.stringify(todosUsuarios));
    alert(`✅ Permissão de ${nome} alterada!`);
}

function removerUsuario(nome) {
    if (nome === 'pastor') return alert('❌ Pastor não pode ser removido!');
    if (confirm(`Remover ${nome}?`)) {
        delete todosUsuarios[nome];
        localStorage.setItem('todosUsuarios', JSON.stringify(todosUsuarios));
        mostrarLista();
    }
}

// GRUPOS
function mostrarFormGrupo() {
    document.getElementById('formGrupos').style.display = 'block';
}

function cancelarNovoGrupo() {
    document.getElementById('formGrupos').style.display = 'none';
    document.getElementById('formGrupos').querySelectorAll('input').forEach(input => input.value = '');
}

function criarNovoGrupo() {
    const nome = document.getElementById('nomeGrupo').value;
    const bairro = document.getElementById('bairroGrupo').value;
    const membrosTexto = document.getElementById('membrosNovos').value;
    
    if (!nome) return alert('❌ Nome do grupo obrigatório!');
    
    const numero = Object.keys(grupos).length + 1;
    const membros = membrosTexto.split(',').map(m => m.trim()).filter(Boolean);
    
    grupos[`grupo${numero}`] = {
        nome: nome,
        bairro: bairro || 'Não informado',
        membros: membros.length ? membros : ['Sem membros']
    };
    
    localStorage.setItem('grupos', JSON.stringify(grupos));
    localStorage.setItem(`presencasGrupo${numero}`, '{}');
    
    alert(`✅ "${nome}" criado como Grupo ${numero}!`);
    carregarGrupos();
    cancelarNovoGrupo();
}

function carregarGrupos() {
    const lista = document.getElementById('listaGrupos');
    lista.innerHTML = '';
    for (let id in grupos) {
        const grupo = grupos[id];
        const div = document.createElement('div');
        div.style.cssText = 'margin:10px 0;padding:15px;background:#e3f2fd;border-radius:8px;display:flex;justify-content:space-between;align-items:center;';
        div.innerHTML = `
            <div>
                <strong>${grupo.nome}</strong><br>
                <small>${grupo.bairro} • ${grupo.membros.length} membros</small>
            </div>
            <span>
                <button onclick="editarGrupo('${id}')" style="background:orange;color:white;border:none;padding:8px 12px;border-radius:4px;margin-right:10px;">Editar</button>
                <button onclick="removerGrupo('${id}')" style="background:red;color:white;border:none;padding:8px 12px;border-radius:4px;">🗑️</button>
            </span>
        `;
        lista.appendChild(div);
    }
}

function editarGrupo(id) {
    const grupo = grupos[id];
    document.getElementById('nomeGrupo').value = grupo.nome;
    document.getElementById('bairroGrupo').value = grupo.bairro;
    document.getElementById('membrosNovos').value = grupo.membros.join(', ');
    alert(`Edite os campos e clique "Criar Grupo" para atualizar ${grupo.nome}`);
}

function removerGrupo(id) {
    if (confirm(`Remover "${grupos[id].nome}"?`)) {
        delete grupos[id];
        localStorage.setItem('grupos', JSON.stringify(grupos));
        localStorage.removeItem(`presencas${id}`);
        carregarGrupos();
    }
}

// SENHA ADMIN
function mostrarMudarSenha() { document.getElementById('formSenha').style.display = 'block'; }
function confirmarNovaSenhaAdmin() {
    const novaSenha = document.getElementById('novaSenhaAdmin').value;
    if (mudarSenha(novaSenha)) {
        document.getElementById('formSenha').style.display = 'none';
        document.getElementById('novaSenhaAdmin').value = '';
    }
}

// CARREGA TUDO
mostrarLista();
carregarGrupos();
