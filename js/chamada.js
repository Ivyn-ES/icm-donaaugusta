// ==========================================
// SOLDADO: js/chamada.js - VERSÃO FINAL 
// ==========================================

let listaMembrosCache = [];

// 1. CARREGAR E BUSCAR DADOS (HISTÓRICO)
async function renderizarListaChamada() {
    const container = document.getElementById('listaChamada');
    const dataSelecionada = document.getElementById('data_chamada').value;
    const tipoEvento = document.getElementById('tipo_evento').value;
    
    if (!container) return;

    try {
        // Busca membros
        const { data: membros, error: errM } = await _supabase
            .from('membros')
            .select('*')
            .eq('status_registro', 'Ativo')
            .order('nome');

        if (errM) throw errM;
        listaMembrosCache = membros;

        // Busca se já existe registro para esse dia/evento
        const { data: presencasExistentes } = await _supabase
            .from('presencas')
            .select('*')
            .eq('data_culto', dataSelecionada)
            .eq('tipo_evento', tipoEvento);

        // Alimenta sugestões
        const datalist = document.getElementById('listaMembrosSugestao');
        datalist.innerHTML = membros.map(m => `<option value="${m.apelido || m.nome}">`).join('');

        // Renderiza a lista
        container.innerHTML = membros.map(m => {
            const presenca = presencasExistentes?.find(p => p.membro_id === m.id);
            const isVisitante = m.situacao === 'Visitante';
            
            // Trata nomes: Pega primeiro e segundo nome
            const partesNome = m.nome.split(' ');
            const nomeCurto = partesNome.slice(0, 2).join(' ');

            return `
            <div class="card-chamada" style="padding: 12px 0; border-bottom: 1px solid #eee; display: flex; align-items: center;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <strong style="font-size: 1.1rem; color: #2c3e50;">${m.apelido || partesNome[0]}</strong>
                        ${isVisitante ? '<span style="color: #e74c3c; font-weight: bold; font-size: 0.7rem; border: 1px solid #e74c3c; padding: 1px 4px; border-radius: 4px;">Vis.</span>' : ''}
                    </div>
                    <small style="color: #7f8c8d; display: block;">${nomeCurto}</small>
                </div>
                
                <div class="colunas-nomes" style="display: flex; gap: 12px;">
                    <input type="checkbox" class="check-presenca" title="Presente" 
                        ${presenca?.status === 'P' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, 'P', '${m.id}')" data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}">
                    
                    <input type="checkbox" class="check-icm" title="Outra ICM" 
                        ${presenca?.status === 'I' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, 'I', '${m.id}')">
                    
                    <input type="checkbox" class="check-maanaim" title="Maanaim" 
                        ${presenca?.status === 'M' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, 'M', '${m.id}')">
                </div>
            </div>`;
        }).join('');

        // Se houver registro de visitantes no banco para esse dia, carregar nos inputs
        // (Aqui você precisaria de uma tabela de resumo_culto no banco para persistir esses campos)
        
        atualizarPlacar();
    } catch (err) {
        console.error(err);
        container.innerHTML = "<p>Erro ao carregar.</p>";
    }
}

// 2. EXCLUSIVIDADE: SÓ PODE MARCAR UM DOS TRÊS
function marcarExclusivo(el, tipo, id) {
    const pai = el.parentElement;
    const checks = pai.querySelectorAll('input[type="checkbox"]');
    
    checks.forEach(c => { if(c !== el) c.checked = false; });
    
    // Aqui você pode disparar o salvamento automático no banco se desejar
    atualizarPlacar();
}

// 3. AUTO-COMPLETAR FUNÇÃO (SELECT)
document.addEventListener('input', (e) => {
    if (e.target.list && e.target.list.id === 'listaMembrosSugestao') {
        const valor = e.target.value.toLowerCase();
        const membro = listaMembrosCache.find(m => 
            (m.apelido && m.apelido.toLowerCase() === valor) || 
            (m.nome.toLowerCase() === valor)
        );

        if (membro) {
            // Identifica qual campo está sendo digitado (pregador, louvor ou portao)
            const idBase = e.target.id.replace('_nome', ''); 
            const selectFuncao = document.getElementById(`${idBase}_funcao`);
            if (selectFuncao) {
                // Tenta selecionar a opção que bate com a categoria do banco
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

// 4. PLACAR COM CONTAGEM ADULTOS/CIAS
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
    
    const total = mAdultos + mCias + vAdultos + vCias;
    document.getElementById('cont_total').innerText = total;

    // Percentual
    const totalMembrosIgreja = listaMembrosCache.filter(m => m.situacao === 'Membro').length;
    const perc = totalMembrosIgreja > 0 ? Math.round(((mAdultos + mCias) / totalMembrosIgreja) * 100) : 0;
    const cor = perc >= 50 ? '#2ecc71' : '#e74c3c';
    const icone = perc >= 50 ? '🟢' : '🔴';

    const displayPerc = document.getElementById('cont_percentual_display');
    if (displayPerc) {
        displayPerc.innerHTML = `<span style="color: ${cor}">${icone} ${perc}% da Igreja</span>`;
    }
}

// 5. AJUSTE DE VISITANTES
function ajustarVisitante(id, mudanca) {
    const input = document.getElementById(id);
    let valor = parseInt(input.value) + mudanca;
    if (valor < 0) valor = 0;
    input.value = valor;
    atualizarPlacar();
}

// 6. WHATSAPP (CONFORME SOLICITADO)
function enviarResumoWhatsapp() {
    // Mesma lógica anterior, mas garantindo que pega do placar atualizado
    const m_adulto = document.getElementById('cont_membros_adultos').innerText;
    const m_cias = document.getElementById('cont_membros_cias').innerText;
    const v_adulto = document.getElementById('vis_adultos').value;
    const v_cias = document.getElementById('vis_cias').value;
    
    const d = new Date();
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const dataFmt = `${d.getDate()}/${meses[d.getMonth()]}`;

    const totalMembrosIgreja = listaMembrosCache.filter(m => m.situacao === 'Membro').length;
    const perc = totalMembrosIgreja > 0 ? Math.round(((parseInt(m_adulto) + parseInt(m_cias)) / totalMembrosIgreja) * 100) : 0;
    const icone = perc >= 50 ? "🟢" : "🔴";

    // Responsaveis
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
    
    const texto = document.getElementById('texto_biblico').value;
    if(texto) msg += `📖 Texto: ${texto}\n`;
    
    const obs = document.getElementById('observacoes_culto').value;
    if(obs) msg += `\n*Obs.:* ${obs}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}