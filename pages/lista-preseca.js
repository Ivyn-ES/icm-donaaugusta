const user = JSON.parse(localStorage.getItem('usuarioLogado'));
if (!user || !['completa', 'secretaria'].includes(user.permissoes)) {
    window.location.href = '../index.html';
}

document.getElementById('nomeUsuario').textContent = user.nome;

// GRUPOS (pega de todos os grupos cadastrados)
const grupos = JSON.parse(localStorage.getItem('grupos')) || {
    grupo1: { nome: 'Grupo 1 - Vera Cruz', membros: ['Maria Silva', 'João Santos', 'Ana Costa'] },
    grupo2: { nome: 'Grupo 2 - Jardim América', membros: ['Pedro Almeida', 'Lucas Souza', 'Carla Lima'] }
};

let presencasCulto = JSON.parse(localStorage.getItem('presencasCulto')) || {};
let visitantesCulto = JSON.parse(localStorage.getItem('visitantesCulto')) || {};

document.getElementById('dataCulto').addEventListener('change', carregarPresencasDia);
document.getElementById('novoVisitante').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') adicionarVisitante();
});

// CARREGA MEMBROS
function carregarMembros() {
    const lista = document.getElementById('membrosLista');
    lista.innerHTML = '<h4>Todos os Grupos:</h4>';
    
    let todosMembros = [];
    for (let id in grupos) {
        grupos[id].membros.forEach(nome => todosMembros.push(nome));
    }
    
    // Remove duplicatas
    todosMembros = [...new Set(todosMembros)];
    
    todosMembros.forEach(nome => {
        const data = document.getElementById('dataCulto').value;
        const presente = presencasCulto[data]?.[nome] || false;
        
        const div = document.createElement('div');
        div.style.cssText = 'margin:10px 0;padding:15px;background:#f0f8ff;border-radius:8px;display:flex;justify-content:space-between;align-items:center;';
        div.innerHTML = `
            <span>${nome}</span>
            <label style="display:flex;align-items:center;">
                <input type="checkbox" data-tipo="membro" data-nome="${nome}" data-data="${data}" ${presente ? 'checked' : ''}> Presente
            </label>
        `;
        lista.appendChild(div);
    });
}

// CARREGA VISITANTES
function carregarVisitantes() {
    const data = document.getElementById('dataCulto').value;
    const lista = document.getElementById('visitantesLista');
    lista.innerHTML = '';
    
    const visitantesDia = visitantesCulto[data] || [];
    visitantesDia.forEach((visitante, index) => {
        const presente = presencasCulto[data]?.[visitante] || false;
        const div = document.createElement('div');
        div.style.cssText = 'margin:10px 0;padding:15px;background:#fff3cd;border-radius:8px;display:flex;justify-content:space-between;align-items:center;';
        div.innerHTML = `
            <span>${visitante}</span>
            <label style="display:flex;align-items:center;">
                <input type="checkbox" data-tipo="visitante" data-nome="${visitante}" data-data="${data}" ${presente ? 'checked' : ''}> Presente
                <button onclick="removerVisitante('${data}', ${index})" style="background:red;color:white;border:none;margin-left:10px;padding:5px 10px;border-radius:4px;">🗑️</button>
            </label>
        `;
        lista.appendChild(div);
    });
}

// ADICIONA VISITANTE
function adicionarVisitante() {
    const nome = document.getElementById('novoVisitante').value.trim();
    if (!nome) return alert('❌ Digite o nome do visitante!');
    
    const data = document.getElementById('dataCulto').value;
    if (!visitantesCulto[data]) visitantesCulto[data] = [];
    if (!visitantesCulto[data].includes(nome)) {
        visitantesCulto[data].push(nome);
        localStorage.setItem('visitantesCulto', JSON.stringify(visitantesCulto));
        carregarVisitantes();
        document.getElementById('novoVisitante').value = '';
        alert(`✅ ${nome} adicionado!`);
    }
}

function removerVisitante(data, index) {
    visitantesCulto[data].splice(index, 1);
    if (presencasCulto[data]?.[visitantesCulto[data][index]]) {
        delete presencasCulto[data][visitantesCulto[data][index]];
    }
    localStorage.setItem('visitantesCulto', JSON.stringify(visitantesCulto));
    localStorage.setItem('presencasCulto', JSON.stringify(presencasCulto));
    carregarVisitantes();
}

// SALVA TUDO
function salvarTodasPresencas() {
    const data = document.getElementById('dataCulto').value;
    presencasCulto[data] = {};
    
    // Membros
    document.querySelectorAll('#membrosLista input:checked').forEach(cb => {
        presencasCulto[data][cb.dataset.nome] = true;
    });
    
    // Visitantes
    document.querySelectorAll('#visitantesLista input:checked').forEach(cb => {
        presencasCulto[data][cb.dataset.nome] = true;
    });
    
    localStorage.setItem('presencasCulto', JSON.stringify(presencasCulto));
    carregarResumoDia();
    alert('✅ TODAS as presenças salvas!');
}

// RESUMO DO DIA
function carregarResumoDia() {
    const data = document.getElementById('dataCulto').value;
    const resumo = document.getElementById('resumoDia');
    
    const membrosPresentes = document.querySelectorAll('#membrosLista input:checked').length;
    const visitantesPresentes = document.querySelectorAll('#visitantesLista input:checked').length;
    const totalPresentes = membrosPresentes + visitantesPresentes;
    
    resumo.innerHTML = `
        <div style="background:#d4edda;padding:20px;border-radius:10px;">
            <h4>📊 RESUMO ${data}</h4>
            <p><strong>Membros:</strong> ${membrosPresentes} | <strong>Visitantes:</strong> ${visitantesPresentes}<br>
            <strong>TOTAL PRESENTES:</strong> ${totalPresentes}</p>
        </div>
    `;
}

// CARREGA PRESENÇAS DO DIA
function carregarPresencasDia() {
    carregarMembros();
    carregarVisitantes();
    carregarResumoDia();
}

// SENHA
function mostrarMudarSenha() { document.getElementById('formSenha').style.display = 'block'; }
function confirmarNovaSenha() {
    const novaSenha = document.getElementById('novaSenha').value;
    if (mudarSenha(novaSenha)) {
        document.getElementById('formSenha').style.display = 'none';
        document.getElementById('novaSenha').value = '';
    }
}

// INICIALIZA
carregarPresencasDia();
