const user = JSON.parse(localStorage.getItem('usuarioLogado'));
if (!user || user.permissoes !== 'grupo2') {
    window.location.href = '../index.html';
}

document.getElementById('nomeUsuario').textContent = user.nome;

const membrosGrupo2 = ['Pedro Almeida', 'Lucas Souza', 'Carla Lima', 'Fernanda Oliveira'];
let presencasGrupo2 = JSON.parse(localStorage.getItem('presencasGrupo2')) || {};

document.getElementById('dataGrupo2').addEventListener('change', carregarPresencasGrupo2);

function carregarPresencasGrupo2() {
    const data = document.getElementById('dataGrupo2').value;
    const lista = document.getElementById('membrosGrupo2');
    lista.innerHTML = '';
    
    membrosGrupo2.forEach(nome => {
        const presente = presencasGrupo2[data] ? presencasGrupo2[data][nome] || false : false;
        const div = document.createElement('div');
        div.style.cssText = 'margin:10px 0;padding:15px;background:#f0f8ff;border-radius:8px;display:flex;justify-content:space-between;align-items:center;';
        div.innerHTML = `
            <span>${nome}</span>
            <label style="display:flex;align-items:center;">
                <input type="checkbox" data-nome="${nome}" data-data="${data}" ${presente ? 'checked' : ''}> Presente
            </label>
        `;
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
        const dia = Object.values(presencasGrupo2[data]).filter(Boolean).length;
        total++;
        if (dia > 0) presente++;
    }
    
    relatorio.innerHTML = `
        <div style="background:#d4edda;padding:20px;border-radius:10px;">
            <h4>📊 Resumo Grupo 2 - Jardim América</h4>
            <p><strong>Total reuniões:</strong> ${total}<br>
            <strong>Reuniões com presença:</strong> ${presente}<br>
            <strong>Frequência:</strong> ${total ? Math.round(presente/total*100) : 0}%</p>
        </div>
    `;
}

// Carrega tudo ao abrir
carregarPresencasGrupo2();
carregarRelatorioGrupo2();
