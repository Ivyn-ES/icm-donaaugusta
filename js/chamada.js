// ==========================================
// SOLDADO: js/chamada.js - VERSÃO REFINADA
// ==========================================

let listaMembrosCache = [];

// 1. CARREGAR E BUSCAR DADOS (HISTÓRICO)
async function renderizarListaChamada() {
    const container = document.getElementById('listaChamada');
    const dataSelecionada = document.getElementById('data_chamada').value;
    const tipoEvento = document.getElementById('tipo_evento').value;
    
    if (!container) return;

    try {
        // Busca membros ativos
        const { data: membros, error: errM } = await _supabase
            .from('membros')
            .select('*')
            .eq('status_registro', 'Ativo')
            .order('nome');

        if (errM) throw errM;
        listaMembrosCache = membros;

        // BUSCA HISTÓRICO NO SUPABASE
        const { data: presencasExistentes } = await _supabase
            .from('presencas')
            .select('*')
            .eq('data_culto', dataSelecionada)
            .eq('tipo_evento', tipoEvento);

        const datalist = document.getElementById('listaMembrosSugestao');
        datalist.innerHTML = membros.map(m => `<option value="${m.apelido || m.nome}">`).join('');

        container.innerHTML = membros.map(m => {
            const registro = presencasExistentes?.find(p => p.membro_id === m.id);
            const isVisitante = m.situacao === 'Visitante';
            const partesNome = m.nome.split(' ');
            const nomeCurto = partesNome.slice(0, 2).join(' ');

            return `
            <div class="card-chamada" style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; align-items: center;">
                <div style="flex: 1;">
                    <strong style="font-size: 1.1rem; color: #2c3e50; display: block;">${m.apelido || partesNome[0]}</strong>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <small style="color: #7f8c8d;">${nomeCurto}</small>
                        ${isVisitante ? '<small style="color: #e74c3c; font-weight: bold;">• Vis.</small>' : ''}
                    </div>
                </div>
                
                <div class="colunas-nomes" style="display: flex; gap: 12px;">
                    <input type="checkbox" class="check-presenca custom-check" 
                        ${registro?.status === 'P' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, '${m.id}')" data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}">
                    
                    <input type="checkbox" class="check-icm custom-check" 
                        ${registro?.status === 'I' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, '${m.id}')">
                    
                    <input type="checkbox" class="check-maanaim custom-check" 
                        ${registro?.status === 'M' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, '${m.id}')">
                </div>
            </div>`;
        }).join('');

        atualizarPlacar();
    } catch (err) {
        console.error(err);
        container.innerHTML = "<p>Erro ao carregar lista.</p>";
    }
}

// 2. EXCLUSIVIDADE (Só um checkbox marcado por vez)
function marcarExclusivo(el, id) {
    const pai = el.parentElement;
    const checks = pai.querySelectorAll('input[type="checkbox"]');
    checks.forEach(c => { if(c !== el) c.checked = false; });
    atualizarPlacar();
}

// 3. AUTO-COMPLETAR FUNÇÃO NO SELECT
document.addEventListener('input', (e) => {
    if (e.target.list && e.target.list.id === 'listaMembrosSugestao') {
        const valor = e.target.value.toLowerCase();
        const membro = listaMembrosCache.find(m => 
            (m.apelido && m.apelido.toLowerCase() === valor) || 
            (m.nome.toLowerCase() === valor)
        );

        if (membro) {
            const idBase = e.target.id.replace('_nome', ''); 
            const selectFuncao = document.getElementById(`${idBase}_funcao`);
            if (selectFuncao) {
                for (let i = 0; i < selectFuncao.options.length; i++) {
                    if (selectFuncao.options[i].value === membro.categoria || selectFuncao.options[i].text === membro.categoria) {
                        selectFuncao.selectedIndex = i;
                        break;
                    }
                }
            }
        }
    }
});

// 4. PLACAR (SEM PERCENTUAL NO TOPO)
function atualizarPlacar() {
    let mAdultos = 0, mCias = 0;
    
    document.querySelectorAll('.check-presenca:checked').forEach(el => {
        const cat = el.getAttribute('data-cat');
        const sit = el.getAttribute('data-sit');
        if (sit === 'Membro') {
            if (['CIA', 'Crianças', 'Intermédios', 'Adolescentes'].includes(cat)) mCias++;
            else mAdultos++;
        }
    });

    document.getElementById('cont_membros_adultos').innerText = mAdultos;
    document.getElementById('cont_membros_cias').innerText = mCias;

    const vAdultos = parseInt(document.getElementById('vis_adultos').value) || 0;
    const vCias = parseInt(document.getElementById('vis_cias').value) || 0;
    
    document.getElementById('cont_vis_adultos_display').innerText = vAdultos;
    document.getElementById('cont_vis_cias_display').innerText = vCias;
    document.getElementById('cont_total').innerText = mAdultos + mCias + vAdultos + vCias;
}

// 5. RESUMO WHATSAPP (COM PERCENTUAL E CÍRCULO)
function enviarResumoWhatsapp() {
    const m_adulto = parseInt(document.getElementById('cont_membros_adultos').innerText);
    const m_cias = parseInt(document.getElementById('cont_membros_cias').innerText);
    const v_adulto = document.getElementById('vis_adultos').value;
    const v_cias = document.getElementById('vis_cias').value;
    
    const d = new Date();
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const dataFmt = `${d.getDate()}/${meses[d.getMonth()]}`;

    const totalMembrosIgreja = listaMembrosCache.filter(m => m.situacao === 'Membro').length;
    const perc = totalMembrosIgreja > 0 ? Math.round(((m_adulto + m_cias) / totalMembrosIgreja) * 100) : 0;
    const icone = perc >= 50 ? "🟢" : "🔴";

    const responsaveis = [
        { label: "🎤 Pregador", nome: document.getElementById('pregador_nome').value },
        { label: "🎶 Louvor", nome: document.getElementById('louvor_nome').value },
        { label: "🚪 Portão", nome: document.getElementById('portao_nome').value }
    ];

    let textoResponsaveis = "";
    let nomesVistos = new Set();
    responsaveis.forEach(r => {
        if(r.nome && !nomesVistos.has(r.nome)) {
            textoResponsaveis += `${r.label}: ${r.nome}\n`;
            nomesVistos.add(r.nome);
        }
    });

    let msg = `ICM - Dona Augusta\n📊 *Resumo do Culto - ${dataFmt}*\n\n`;
    msg += `*Participantes:*\n`;
    msg += `- Membros (Adulto/CIAs): ${m_adulto}/${m_cias} - ${icone} ${perc}%\n`;
    msg += `- Visitantes (Adulto/CIAs): ${v_adulto}/${v_cias}\n`;
    msg += `🌟 *Total Vidas: ${document.getElementById('cont_total').innerText}*\n\n`;
    msg += `*Responsáveis:*\n${textoResponsaveis}`;
    if(document.getElementById('texto_biblico').value) msg += `📖 Texto: ${document.getElementById('texto_biblico').value}\n`;
    if(document.getElementById('observacoes_culto').value) msg += `\n*Obs.:* ${document.getElementById('observacoes_culto').value}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

function ajustarVisitante(id, mudanca) {
    const input = document.getElementById(id);
    let valor = parseInt(input.value) + mudanca;
    if (valor < 0) valor = 0;
    input.value = valor;
    atualizarPlacar();
}