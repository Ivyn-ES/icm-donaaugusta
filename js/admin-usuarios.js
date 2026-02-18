// Só admin pode acessar
const user = JSON.parse(localStorage.getItem('usuarioLogado'));
if (!user || user.permissoes !== 'completa') {
    window.location.href = '../index.html';
}

// Carrega usuários salvos ou cria padrão
let todosUsuarios = JSON.parse(localStorage.getItem('todosUsuarios')) || {
    'pastor': { senha: 'pr1234', permissoes: 'completa' },
    'secretaria': { senha: 'sc1234', permissoes: 'secretaria' },
    'membro': { senha: 'mb1234', permissoes: 'basica' }
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
// 👇 NOVAS FUNÇÕES PARA GRUPOS
function mostrarFormGrupo() {
    document.getElementById('formGrupos').style.display = 'block';
}

function criarNovoGrupo() {
    const nome = document.getElementById('nomeGrupo').value;
    const bairro = document.getElementById('bairroGrupo').value;
    const membrosTexto = document.getElementById('membrosNovos').value;
    
    if (!nome) return alert('❌ Digite o nome do grupo!');
    
    const numeroGrupo = Object.keys(grupos).length + 1;
    const membros = membrosTexto.split(',').map(m => m.trim()).filter(m => m);
    
    grupos[`grupo${numeroGrupo}`] = {
        nome: nome,
        bairro: bairro || 'Não informado',
        membros: membros,
        presencas: {}
    };
    
    localStorage.setItem('grupos', JSON.stringify(grupos));
    localStorage.setItem(`presencasGrupo${numeroGrupo}`, JSON.stringify({}));
    
    alert(`✅ "${nome}" criado! Grupo ${numeroGrupo}`);
    carregarGrupos();
    document.getElementById('formGrupos').style.display = 'none';
    document.getElementById('formGrupos').reset();
}

function carregarGrupos() {
    const lista = document.getElementById('listaGrupos');
    lista.innerHTML = '';
    
    for (let id in grupos) {
        const grupo = grupos[id];
        const div = document.createElement('div');
        div.style.cssText = 'margin:10px 0;padding:15px;background:#e3f2fd;border-radius:8px;';
        div.innerHTML = `
            <strong>${grupo.nome}</strong> (${grupo.bairro})
            <span style="float:right;">
                <small>${grupo.membros.length} membros</small>
                <button onclick="editarGrupo('${id}')" style="background:orange;color:white;border:none;padding:5px 10px;border-radius:4px;margin-left:10px;">Editar</button>
                <button onclick="removerGrupo('${id}')" style="background:red;color:white;border:none;padding:5px 10px;border-radius:4px;margin-left:5px;">🗑️</button>
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
    // Aqui você pode adicionar lógica para recriar com novo ID
}

function removerGrupo(id) {
    if (confirm(`Remover "${grupos[id].nome}"?`)) {
        delete grupos[id];
        localStorage.setItem('grupos', JSON.stringify(grupos));
        localStorage.removeItem(`presencas${id}`);
        carregarGrupos();
    }
}

// Carrega grupos salvos ou cria padrão
let grupos = JSON.parse(localStorage.getItem('grupos')) || {
    grupo1: {
        nome: 'Grupo 1 - Vera Cruz',
        bairro: 'Vera Cruz',
        membros: ['Maria Silva', 'João Santos', 'Ana Costa']
    },
    grupo2: {
        nome: 'Grupo 2 - Jardim América', 
        bairro: 'Jardim América',
        membros: ['Pedro Almeida', 'Lucas Souza', 'Carla Lima']
    }
};

// Chama ao carregar página
mostrarLista(); // usuários
carregarGrupos();  // grupos
