// ==========================================
// SOLDADO: js/chamada.js (Versão Integrada ao HTML)
// ==========================================

let listaMembrosCache = [];

// 1. CARREGAR LISTA DE MEMBROS (Chamada Nominal)
async function renderizarListaChamada() {
    const container = document.getElementById('listaChamada');
    if (!container) return;

    try {
        const { data, error } = await _supabase
            .from('membros')
            .select('id, nome, apelido, categoria, situacao')
            .eq('status_registro', 'Ativo')
            .order('nome');

        if (error) throw error;
        listaMembrosCache = data;

        // Alimenta o datalist de sugestões (Pregador/Louvor/Portão)
        const datalist = document.getElementById('listaMembrosSugestao');
        if (datalist) {
            datalist.innerHTML = data.map(m => `<option value="${m.apelido || m.nome}">`).join('');
        }

        // Renderiza a lista com os 3 botões de status (Presente, ICM, Maanaim)
        container.innerHTML = data.map(m => `
            <div class="card-chamada">
                <div style="flex: 1;">
                    <strong style="display:block; font-size: 0.95rem;">${m.nome}</strong>
                    <small style="color: #666;">${m.categoria} ${m.apelido ? `• ${m.apelido}` : ''}</small>
                </div>
                <div class="colunas-nomes" style="display: flex; gap: 12px;">
                    <input type="checkbox" class="check-presenca" data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}" onchange="atualizarPlacar()" style="width: 35px; height: 25px; accent-color: #2ecc71;">
                    <input type="checkbox" class="check-icm" style="width: 35px; height: 25px; accent-color: #3498db;">
                    <input type="checkbox" class="check-maanaim" style="width: 35px; height: 25px; accent-color: #e67e22;">
                </div>
            </div>
        `).join('');

        atualizarPlacar();
    } catch (err) {
        container.innerHTML = "<p style='padding:20px; color:red;'>Erro ao carregar lista.</p>";
    }
}

// 2. LÓGICA DO PLACAR (Contagem em Tempo Real)
function atualizarPlacar() {
    let mAdultos = 0, mCias = 0;
    
    // Conta membros marcados no primeiro checkbox (Presente)
    document.querySelectorAll('.check-presenca:checked').forEach(el => {
        const cat = el.getAttribute('data-cat');
        const sit = el.getAttribute('data-sit');
        if (sit === 'Membro') {
            if (cat === 'CIA' || cat === 'Crianças' || cat === 'Intermédios' || cat === 'Adolescentes') mCias++;
            else mAdultos++;
        }
    });

    // Atualiza Displays do Placar
    document.getElementById('cont_membros_adultos').innerText = mAdultos;
    document.getElementById('cont_membros_cias').innerText = mCias;

    const vAdultos = parseInt(document.getElementById('vis_adultos').value) || 0;
    const vCias = parseInt(document.getElementById('vis_cias').value) || 0;
    
    document.getElementById('cont_vis_adultos_display').innerText = vAdultos;
    document.getElementById('cont_vis_cias_display').innerText = vCias;
    
    const total = mAdultos + mCias + vAdultos + vCias;
    document.getElementById('cont_total').innerText = total;

    // Cálculo da %
    const totalBaseMembros = listaMembrosCache.filter(m => m.situacao === 'Membro').length;
    const perc = totalBaseMembros > 0 ? Math.round(((mAdultos + mCias) / totalBaseMembros) * 100) : 0;
    const cor = perc >= 50 ? '#2ecc71' : '#e74c3c';
    
    const displayPerc = document.getElementById('cont_percentual_display');
    if (displayPerc) {
        displayPerc.innerHTML = `<span style="color: ${cor}">${perc}% da Igreja</span>`;
    }
}

// 3. AJUSTE DE VISITANTES (+ e -)
function ajustarVisitante(id, mudanca) {
    const input = document.getElementById(id);
    let valor = parseInt(input.value) + mudanca;
    if (valor < 0) valor = 0;
    input.value = valor;
    atualizarPlacar();
}

// 4. ENVIO PARA WHATSAPP
function enviarResumoWhatsapp() {
    const m_adulto = document.getElementById('cont_membros_adultos').innerText;
    const m_cias = document.getElementById('cont_membros_cias').innerText;
    const v_adulto = document.getElementById('vis_adultos').value;
    const v_cias = document.getElementById('vis_cias').value;
    const totalGeral = document.getElementById('cont_total').innerText;

    // Data formatada
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const d = new Date();
    const dataFmt = `${d.getDate()}/${meses[d.getMonth()]}`;

    // Porcentagem e Ícone
    const totalBaseMembros = listaMembrosCache.filter(m => m.situacao === 'Membro').length;
    const perc = totalBaseMembros > 0 ? Math.round(((parseInt(m_adulto) + parseInt(m_cias)) / totalBaseMembros) * 100) : 0;
    const icone = perc >= 50 ? "🟢" : "🔴";

    // Responsáveis (Lógica de omitir vazios e repetidos)
    const respMap = [
        { label: "🎤 Dirigente", nome: document.getElementById('dirigente_nome')?.value.trim() }, // Caso tenha adicionado
        { label: "🎤 Pregador", nome: document.getElementById('pregador_nome')?.value.trim() },
        { label: "🎶 Louvor", nome: document.getElementById('louvor_nome')?.value.trim() },
        { label: "🚪 Portão", nome: document.getElementById('portao_nome')?.value.trim() }
    ];

    let nomesVistos = new Set();
    let textoResponsaveis = "";
    respMap.forEach(r => {
        if (r.nome && !nomesVistos.has(r.nome)) {
            textoResponsaveis += `${r.label}: ${r.nome}\n`;
            nomesVistos.add(r.nome);
        }
    });

    const textoBiblico = document.getElementById('texto_biblico').value;
    const obs = document.getElementById('observacoes_culto').value;

    let msg = `ICM - Dona Augusta\n`;
    msg += `📊 *Resumo do Culto - ${dataFmt}*\n\n`;
    msg += `*Participantes:*\n`;
    msg += `- Membros (Adulto/CIAs): ${m_adulto}/${m_cias} - ${icone} ${perc}%\n`;
    msg += `- Visitantes (Adulto/CIAs): ${v_adulto}/${v_cias}\n`;
    msg += `🌟 *Total Vidas: ${totalGeral}*\n\n`;
    
    if (textoResponsaveis) {
        msg += `*Responsáveis:*\n${textoResponsaveis}`;
    }
    if (textoBiblico) msg += `📖 Texto: ${textoBiblico}\n`;
    if (obs) msg += `\n*Obs.:* ${obs}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

// 5. SALVAR NO BANCO (Placeholder para sua função salvarChamada)
async function salvarChamada() {
    alert("Dados atualizados localmente! (Função de persistência no banco pode ser implementada aqui)");
}