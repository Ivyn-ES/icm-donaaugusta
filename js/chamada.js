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
    container.innerHTML = "<p style='text-align:center; padding: 20px; color: #888;'>Buscando registros...</p>";

    try {
        const { data: membros, error: errM } = await _supabase
            .from('membros')
            .select('*')
            .eq('status_registro', 'Ativo')
            .order('nome');

        if (errM) throw errM;
        listaMembrosCache = membros;

        const { data: presencasExistentes, error: errP } = await _supabase
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
            <div class="card-chamada">
                <div style="flex: 1;">
                    <strong style="font-size: 1.2rem; color: #2c3e50; display: block;">${m.apelido || partesNome[0]}</strong>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <small style="color: #7f8c8d;">(${nomeCurto})</small>
                        ${isVisitante ? '<small style="color: #e74c3c; font-weight: bold;">• Vis.</small>' : ''}
                    </div>
                </div>
                
                <div class="colunas-nomes">
                    <input type="checkbox" class="custom-check check-presenca" 
                        ${registro?.status === 'P' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, '${m.id}')" 
                        data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}">
                    
                    <input type="checkbox" class="custom-check check-icm" 
                        ${registro?.status === 'I' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, '${m.id}')"
                        data-cat="${m.categoria}" data-sit="${m.situacao}">
                    
                    <input type="checkbox" class="custom-check check-maanaim" 
                        ${registro?.status === 'M' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, '${m.id}')"
                        data-cat="${m.categoria}" data-sit="${m.situacao}">
                </div>
            </div>`;
        }).join('');

        atualizarPlacar();
    } catch (err) {
        console.error("Erro:", err);
        container.innerHTML = "<p style='text-align:center; padding:20px;'>Erro ao carregar dados.</p>";
    }
}

// 2. EXCLUSIVIDADE
function marcarExclusivo(el, id) {
    const pai = el.parentElement;
    const checks = pai.querySelectorAll('input[type="checkbox"]');
    if (el.checked) {
        checks.forEach(c => { if(c !== el) c.checked = false; });
    }
    atualizarPlacar();
}

// 3. AUTO-COMPLETAR FUNÇÃO (CORRIGIDO)
document.addEventListener('input', (e) => {
    if (e.target.list && e.target.list.id === 'listaMembrosSugestao') {
        const valorDigitado = e.target.value.trim().toLowerCase();
        const membro = listaMembrosCache.find(m => 
            (m.apelido && m.apelido.toLowerCase() === valorDigitado) || 
            (m.nome.toLowerCase() === valorDigitado)
        );

        if (membro) {
            const idBase = e.target.id.replace('_nome', ''); 
            const selectFuncao = document.getElementById(`${idBase}_funcao`);
            if (selectFuncao) {
                const normalizar = (txt) => txt ? txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
                const catMembro = normalizar(membro.categoria);

                let encontrou = false;
                for (let i = 0; i < selectFuncao.options.length; i++) {
                    const textoOp = normalizar(selectFuncao.options[i].text);
                    const valorOp = normalizar(selectFuncao.options[i].value);

                    if (textoOp === catMembro || valorOp === catMembro) {
                        selectFuncao.selectedIndex = i;
                        encontrou = true;
                        break;
                    }
                }
                if (!encontrou) selectFuncao.value = "Membro";
            }
        }
    }
});

// 4. PLACAR (CONTA SE QUALQUER UM ESTIVER MARCADO)
function atualizarPlacar() {
    let mAdultos = 0, mCias = 0;
    let vAdultosLista = 0, vCiasLista = 0;
    
    // Seleciona todos os cards e verifica se tem algum check marcado nele
    document.querySelectorAll('.card-chamada').forEach(card => {
        const checkMarcado = card.querySelector('input[type="checkbox"]:checked');
        
        if (checkMarcado) {
            const cat = checkMarcado.getAttribute('data-cat');
            const sit = checkMarcado.getAttribute('data-sit');
            const ehCia = ['CIA', 'Crianças', 'Intermédios', 'Adolescentes'].includes(cat);

            if (sit === 'Membro') {
                if (ehCia) mCias++; else mAdultos++;
            } else if (sit === 'Visitante') {
                if (ehCia) vCiasLista++; else vAdultosLista++;
            }
        }
    });

    const vAdultosManual = parseInt(document.getElementById('vis_adultos').value) || 0;
    const vCiasManual = parseInt(document.getElementById('vis_cias').value) || 0;

    const totalVAdultos = vAdultosLista + vAdultosManual;
    const totalVCias = vCiasLista + vCiasManual;

    document.getElementById('cont_membros_adultos').innerText = mAdultos;
    document.getElementById('cont_membros_cias').innerText = mCias;
    document.getElementById('cont_vis_adultos_display').innerText = totalVAdultos;
    document.getElementById('cont_vis_cias_display').innerText = totalVCias;
    
    document.getElementById('cont_total').innerText = mAdultos + mCias + totalVAdultos + totalVCias;
}

// 5. RESUMO WHATSAPP
function enviarResumoWhatsapp() {
    const m_adulto = document.getElementById('cont_membros_adultos').innerText;
    const m_cias = document.getElementById('cont_membros_cias').innerText;
    const v_adulto = document.getElementById('cont_vis_adultos_display').innerText;
    const v_cias = document.getElementById('cont_vis_cias_display').innerText;
    const totalGeral = document.getElementById('cont_total').innerText;

    const d = new Date();
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const dataFmt = `${d.getDate()}/${meses[d.getMonth()]}`;

    const totalMembrosIgreja = listaMembrosCache.filter(m => m.situacao === 'Membro').length;
    const perc = totalMembrosIgreja > 0 ? Math.round(((parseInt(m_adulto) + parseInt(m_cias)) / totalMembrosIgreja) * 100) : 0;
    const icone = perc >= 50 ? "🟢" : "🔴";

    let msg = `ICM - Dona Augusta\n📊 *Resumo do Culto - ${dataFmt}*\n\n`;
    msg += `*Participantes:*\n`;
    msg += `- Membros (Adulto/CIAs): ${m_adulto}/${m_cias} - ${icone} ${perc}%\n`;
    msg += `- Visitantes (Adulto/CIAs): ${v_adulto}/${v_cias}\n`;
    msg += `🌟 *Total Vidas: ${totalGeral}*\n\n`;
    
    const resp = [
        { l: "🎤 Pregador", n: document.getElementById('pregador_nome').value },
        { l: "🎶 Louvor", n: document.getElementById('louvor_nome').value },
        { l: "🚪 Portão", n: document.getElementById('portao_nome').value }
    ];

    let tResp = "";
    resp.forEach(r => { if(r.n) tResp += `${r.l}: ${r.n}\n`; });
    if(tResp) msg += `*Responsáveis:*\n${tResp}`;
    
    if(document.getElementById('texto_biblico').value) msg += `📖 Texto: ${document.getElementById('texto_biblico').value}\n`;
    if(document.getElementById('observacoes_culto').value) msg += `\n*Obs.:* ${document.getElementById('observacoes_culto').value}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

// 6. AJUSTE DE VISITANTES
function ajustarVisitante(id, mudanca) {
    const input = document.getElementById(id);
    let valor = (parseInt(input.value) || 0) + mudanca;
    if (valor < 0) valor = 0;
    input.value = valor;
    atualizarPlacar();
}

// 7. SALVAR
async function salvarChamada() {
    const data_culto = document.getElementById('data_chamada').value;
    const tipo_evento = document.getElementById('tipo_evento').value;
    const presencas = [];

    document.querySelectorAll('.card-chamada').forEach(card => {
        const idMembro = card.querySelector('.check-presenca').getAttribute('data-id');
        let status = null;
        if(card.querySelector('.check-presenca').checked) status = 'P';
        else if(card.querySelector('.check-icm').checked) status = 'I';
        else if(card.querySelector('.check-maanaim').checked) status = 'M';

        if(status) presencas.push({ membro_id: idMembro, data_culto, tipo_evento, status });
    });

    if (presencas.length === 0) return alert("Nada para salvar.");

    try {
        const { error } = await _supabase.from('presencas').upsert(presencas, { onConflict: 'membro_id, data_culto, tipo_evento' });
        if(error) throw error;
        alert("✅ Salvo com sucesso!");
    } catch (e) {
        alert("❌ Erro ao salvar.");
    }
}