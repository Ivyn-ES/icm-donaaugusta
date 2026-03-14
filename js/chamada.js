// ==========================================
// SOLDADO: js/chamada.js - VERSÃO FINALIZADA
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
        // Busca membros ativos
        const { data: membros, error: errM } = await _supabase
            .from('membros')
            .select('*')
            .eq('status_registro', 'Ativo')
            .order('nome');

        if (errM) throw errM;
        listaMembrosCache = membros;

        // BUSCA HISTÓRICO NO SUPABASE
        const { data: presencasExistentes, error: errP } = await _supabase
            .from('presencas')
            .select('*')
            .eq('data_culto', dataSelecionada)
            .eq('tipo_evento', tipoEvento);

        // Alimenta o datalist de sugestões
        const datalist = document.getElementById('listaMembrosSugestao');
        datalist.innerHTML = membros.map(m => `<option value="${m.apelido || m.nome}">`).join('');

        // Renderiza a lista
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
                        onclick="marcarExclusivo(this, '${m.id}')">
                    
                    <input type="checkbox" class="custom-check check-maanaim" 
                        ${registro?.status === 'M' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, '${m.id}')">
                </div>
            </div>`;
        }).join('');

        atualizarPlacar();
    } catch (err) {
        console.error("Erro na renderização:", err);
        container.innerHTML = "<p style='text-align:center; padding:20px;'>Erro ao conectar com o banco de dados.</p>";
    }
}

// 2. EXCLUSIVIDADE (Lógica Radio: um por linha)
function marcarExclusivo(el, id) {
    const pai = el.parentElement;
    const checks = pai.querySelectorAll('input[type="checkbox"]');
    
    if (el.checked) {
        checks.forEach(c => { if(c !== el) c.checked = false; });
    }
    atualizarPlacar();
}

// 3. AUTO-COMPLETAR FUNÇÃO E CATEGORIA (NORMALIZADO)
document.addEventListener('input', (e) => {
    if (e.target.list && e.target.list.id === 'listaMembrosSugestao') {
        const valorDigitado = e.target.value.toLowerCase();
        const membro = listaMembrosCache.find(m => 
            (m.apelido && m.apelido.toLowerCase() === valorDigitado) || 
            (m.nome.toLowerCase() === valorDigitado)
        );

        if (membro && membro.categoria) {
            const idBase = e.target.id.replace('_nome', ''); 
            const selectFuncao = document.getElementById(`${idBase}_funcao`);
            if (selectFuncao) {
                const normalizar = (txt) => txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                const categoriaMembro = normalizar(membro.categoria);

                let encontrou = false;
                for (let i = 0; i < selectFuncao.options.length; i++) {
                    const textoOpcao = normalizar(selectFuncao.options[i].text);
                    const valorOpcao = normalizar(selectFuncao.options[i].value);

                    if (textoOpcao === categoriaMembro || valorOpcao === categoriaMembro) {
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

// 4. PLACAR (SOMA NOMINAL + MANUAL)
function atualizarPlacar() {
    let mAdultos = 0, mCias = 0;
    let vAdultosLista = 0, vCiasLista = 0;
    
    document.querySelectorAll('.check-presenca:checked').forEach(el => {
        const cat = el.getAttribute('data-cat');
        const sit = el.getAttribute('data-sit');
        const ehCia = ['CIA', 'Crianças', 'Intermédios', 'Adolescentes'].includes(cat);

        if (sit === 'Membro') {
            if (ehCia) mCias++; else mAdultos++;
        } else if (sit === 'Visitante') {
            if (ehCia) vCiasLista++; else vAdultosLista++;
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
    
    const totalGeral = mAdultos + mCias + totalVAdultos + totalVCias;
    document.getElementById('cont_total').innerText = totalGeral;
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
    
    const responsaveis = [
        { label: "🎤 Pregador", nome: document.getElementById('pregador_nome').value },
        { label: "🎶 Louvor", nome: document.getElementById('louvor_nome').value },
        { label: "🚪 Portão", nome: document.getElementById('portao_nome').value }
    ];

    let textoRes = "";
    responsaveis.forEach(r => { if(r.nome) textoRes += `${r.label}: ${r.nome}\n`; });
    if(textoRes) msg += `*Responsáveis:*\n${textoRes}`;
    
    if(document.getElementById('texto_biblico').value) msg += `📖 Texto: ${document.getElementById('texto_biblico').value}\n`;
    if(document.getElementById('observacoes_culto').value) msg += `\n*Obs.:* ${document.getElementById('observacoes_culto').value}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

// 6. AJUSTE DE VISITANTES (+ / -)
function ajustarVisitante(id, mudanca) {
    const input = document.getElementById(id);
    let valor = (parseInt(input.value) || 0) + mudanca;
    if (valor < 0) valor = 0;
    input.value = valor;
    atualizarPlacar();
}

// 7. SALVAR NO SUPABASE (UPSERT)
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

        if(status) {
            presencas.push({ membro_id: idMembro, data_culto, tipo_evento, status });
        }
    });

    if (presencas.length === 0) return alert("Nenhuma presença selecionada para salvar.");

    try {
        const { error } = await _supabase.from('presencas').upsert(presencas, { onConflict: 'membro_id, data_culto, tipo_evento' });
        if(error) throw error;
        alert("✅ Presenças atualizadas com sucesso!");
    } catch (e) {
        console.error(e);
        alert("❌ Erro ao salvar presenças.");
    }
}