const user = JSON.parse(localStorage.getItem('usuarioLogado'));
if (!user || user.permissoes !== 'grupo2') window.location.href = '../index.html';

document.getElementById('nomeUsuario').textContent = user.nome;

const membrosGrupo2 = ['Pedro Almeida', 'Lucas Souza', 'Carla Lima', 'Fernanda Oliveira'];
let presencasGrupo2 = JSON.parse(localStorage.getItem('presencasGrupo2')) || {};

document.getElementById('dataGrupo2').addEventListener('change', carregarPresencasGrupo2);

function carregarPresencasGrupo2() {
    const data = document.getElementById('dataGrupo2').value;
    const lista = document.getElementById('membrosGrupo2');
    lista.innerHTML = '';
    membrosGrupo2.forEach(nome => {
        const presente = presencasGrupo2[data]?.[nome] || false;
        const div = document.createElement('div');
        div.style.cssText = 'margin:10px 0;padding:15px;background:#f0f8ff;border-radius:8px;display:flex;justify-content:space-between;align-items:center;';
        div.innerHTML = `<span>${nome}</span><label><input type="checkbox" data-nome="${nome}" data-data="${data}" ${presente ? 'checked' : ''}> Presente</label>`;
        lista.appendChild(div);
    });
}

function salvarGrupo2() {
    const data = document.getElementById('dataGrupo2').value;
    presencasGrupo2[data] = {};
    document.querySelectorAll('#membrosGrupo2 input:checked').forEach(cb => {
        presencasGrupo2[data][cb.dataset.nome] = true;
    });
    localStorage.setItem('presencasGrupo2', JSON.stringify(presencasGrupo2));
    alert('✅ Grupo 2 salvo!');
    carregarRelatorioGrupo2();
}

function carregarRelatorioGrupo2() {
    const relatorio = document.getElementById('relatorioGrupo2');
    let total = 0, presente = 0;
    for (let data in presencasGrupo2) {
        total++;
        presente += Object.values(presencasGrupo2[data]).filter(Boolean).length > 0 ? 1 : 0;
    }
    relatorio.innerHTML = `<div style="background:#d4edda;padding:20px;border-radius:10px;"><h4>📊 Resumo Grupo 2</h4><p>Total: ${total} | Presentes: ${presente} (${total ? Math.round(presente/total*100) : 0}%)</p></div>`;
}

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

carregarPresencasGrupo2(); 
carregarRelatorioGrupo2();
