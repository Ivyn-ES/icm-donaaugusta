const user = JSON.parse(localStorage.getItem('usuarioLogado'));
if (!user || user.permissoes !== 'grupo1') window.location.href = '../index.html';

document.getElementById('nomeUsuario').textContent = user.nome;

const membrosGrupo1 = ['Maria Silva', 'João Santos', 'Ana Costa'];
let presencasGrupo1 = JSON.parse(localStorage.getItem('presencasGrupo1')) || {};

document.getElementById('dataGrupo1').addEventListener('change', carregarPresencasGrupo1);

function carregarPresencasGrupo1() {
    const data = document.getElementById('dataGrupo1').value;
    const lista = document.getElementById('membrosGrupo1');
    lista.innerHTML = '';
    membrosGrupo1.forEach(nome => {
        const presente = presencasGrupo1[data]?.[nome] || false;
        const div = document.createElement('div');
        div.style.cssText = 'margin:10px 0;padding:15px;background:#f0f8ff;border-radius:8px;display:flex;justify-content:space-between;align-items:center;';
        div.innerHTML = `<span>${nome}</span><label><input type="checkbox" data-nome="${nome}" data-data="${data}" ${presente ? 'checked' : ''}> Presente</label>`;
        lista.appendChild(div);
    });
}

function salvarGrupo1() {
    const data = document.getElementById('dataGrupo1').value;
    presencasGrupo1[data] = {};
    document.querySelectorAll('#membrosGrupo1 input:checked').forEach(cb => {
        presencasGrupo1[data][cb.dataset.nome] = true;
    });
    localStorage.setItem('presencasGrupo1', JSON.stringify(presencasGrupo1));
    alert('✅ Grupo 1 salvo!');
    carregarRelatorioGrupo1();
}

function carregarRelatorioGrupo1() {
    const relatorio = document.getElementById('relatorioGrupo1');
    let total = 0, presente = 0;
    for (let data in presencasGrupo1) {
        total++;
        presente += Object.values(presencasGrupo1[data]).filter(Boolean).length > 0 ? 1 : 0;
    }
    relatorio.innerHTML = `<div style="background:#d4edda;padding:20px;border-radius:10px;"><h4>📊 Resumo Grupo 1</h4><p>Total: ${total} | Presentes: ${presente} (${total ? Math.round(presente/total*100) : 0}%)</p></div>`;
}

function mostrarMudarSenha() { document.getElementById('formSenha').style.display = 'block'; }
function confirmarNovaSenha() {
    const novaSenha = document.getElementById('novaSenha').value;
    if (mudarSenha(novaSenha)) {
        document.getElementById('formSenha').style.display = 'none';
        document.getElementById('novaSenha').value = '';
    }
}

carregarPresencasGrupo1(); carregarRelatorioGrupo1();
