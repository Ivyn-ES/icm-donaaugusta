// ==========================================
// SOLDADO: js/chamada.js - VERSÃO DEFINITIVA
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

        // BUSCA HISTÓRICO NO SUPABASE (Para marcar o que já foi feito)
        const { data: presencasExistentes, error: errP } = await _supabase
            .from('presencas')
            .select('*')
            .eq('data_culto', dataSelecionada)
            .eq('tipo_evento', tipoEvento);

        if (errP) console.warn("Aviso: Tabela 'presencas' não encontrada ou vazia.");

        // Alimenta o datalist de sugestões
        const datalist = document.getElementById('listaMembrosSugestao');
        datalist.innerHTML = membros.map(m => `<option value="${m.apelido || m.nome}">`).join('');

        // Renderiza a lista conforme o desenho solicitado
        container.innerHTML = membros.map(m => {
            const registro = presencasExistentes?.find(p => p.membro_id === m.id);
            const isVisitante = m.situacao === 'Visitante';
            const partesNome = m.nome.split(' ');
            const nomeCurto = partesNome.slice(0, 2).join(' '); // Primeiro e Segundo nome

            return `
            <div class="card-chamada" style="padding: 15px 0; border-bottom: 1px solid #eee; display: flex; align-items: center;">
                <div style="flex: 1;">
                    <strong style="font-size: 1.2rem; color: #2c3e50; display: block;">${m.apelido || partesNome[0]}</strong>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <small style="color: #7f8c8d;">(${nomeCurto})</small>
                        ${isVisitante ? '<small style="color: #e74c3c; font-weight: bold;">• Vis.</small>' : ''}
                    </div>
                </div>
                
                <div class="colunas-nomes" style="display: flex; gap: 15px;">
                    <input type="checkbox" class="custom-check check-presenca" 
                        ${registro?.status === 'P' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, '${m.id}')" 
                        data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}">
                    
                    <input type="checkbox" class="custom-check check-icm" 
                        ${registro?.status === 'I' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, '${m.id}')"
                        data-id="${m.id}">
                    
                    <input type="checkbox" class="custom-check check-maanaim" 
                        ${registro?.status === 'M' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, '${m.id}')"
                        data-id="${m.id}">
                </div>
            </div>`;
        }).join('');

        atualizarPlacar();
    } catch (err) {
        console.error("Erro na renderização:", err);
        container.innerHTML = "<p style='text-align:center; padding:20px;'>Erro ao carregar dados do Supabase.</p>";
    }
}

// 2. EXCLUSIVIDADE (Só um checkbox marcado por vez - Lógica Radio)
function marcarExclusivo(el, id) {
    const pai = el.parentElement;
    const checks = pai.querySelectorAll('input[type="checkbox"]');
    
    // Se eu marcar um, desmarco todos os outros da mesma linha
    const estavaMarcado = el.checked;
    if (estavaMarcado) {
        checks.forEach(c => { if(c !== el) c.checked = false; });
    }
    
    atualizarPlacar();
    // Opcional: chamar salvarChamadaIndividual(id, el.checked) aqui para salvar em tempo real
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
                // Mapeia a categoria do banco para o valor do Select
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

// 4. PLACAR (CONTAGEM DE ADULTOS E CIAS)
function atualizarPlacar() {
    let mAdultos = 0, mCias = 0;
    
    // Contamos apenas quem está marcado como "Presente" (primeira coluna)
    document.querySelectorAll('.check-presenca:checked').forEach(el => {
        const cat = el.getAttribute('data-cat');
        const sit = el.getAttribute('data-sit');
        if (sit === 'Membro') {
            const categoriasCias = ['CIA', 'Crianças', 'Intermédios', 'Adolescentes'];
            if (categoriasCias.includes(cat)) mCias++;
            else mAdultos++;
        }
    });

    // Atualiza os elementos na parte superior
    if(document.getElementById('cont_membros_adultos')) document.getElementById('cont_membros_adultos').innerText = mAdultos;
    if(document.getElementById('cont_membros_cias')) document.getElementById('cont_membros_cias').innerText = mCias;

    const vAdultos = parseInt(document.getElementById('vis_adultos').value) || 0;
    const vCias = parseInt(document.getElementById('vis_cias').value) || 0;
    
    if(document.getElementById('cont_vis_adultos_display')) document.getElementById('cont_vis_adultos_display').innerText = vAdultos;
    if(document.getElementById('cont_vis_cias_display')) document.getElementById('cont_vis_cias_display').innerText = vCias;
    
    const totalGeral = mAdultos + mCias + vAdultos + vCias;
    if(document.getElementById('cont_total')) document.getElementById('cont_total').innerText = totalGeral;
}

// 5. RESUMO WHATSAPP (COM PERCENTUAL E CÍRCULO)
function enviarResumoWhatsapp() {
    const m_adulto = parseInt(document.getElementById('cont_membros_adultos').innerText) || 0;
    const m_cias = parseInt(document.getElementById('cont_membros_cias').innerText) || 0;
    const v_adulto = parseInt(document.getElementById('vis_adultos').value) || 0;
    const v_cias = parseInt(document.getElementById('vis_cias').value) || 0;
    const totalGeral = document.getElementById('cont_total').innerText;

    const d = new Date();
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const dataFmt = `${d.getDate()}/${meses[d.getMonth()]}`;

    // Cálculo do Percentual apenas para o Resumo
    const totalMembrosIgreja = listaMembrosCache.filter(m => m.situacao === 'Membro').length;
    const presentesMembros = m_adulto + m_cias;
    const perc = totalMembrosIgreja > 0 ? Math.round((presentesMembros / totalMembrosIgreja) * 100) : 0;
    const icone = perc >= 50 ? "🟢" : "🔴";

    // Coleta Responsáveis
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
    msg += `🌟 *Total Vidas: ${totalGeral}*\n\n`;
    
    if(textoResponsaveis) msg += `*Responsáveis:*\n${textoResponsaveis}`;
    
    const textoBiblico = document.getElementById('texto_biblico').value;
    if(textoBiblico) msg += `📖 Texto: ${textoBiblico}\n`;
    
    const obs = document.getElementById('observacoes_culto').value;
    if(obs) msg += `\n*Obs.:* ${obs}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

// 6. AJUSTE DE VISITANTES (+ / -)
function ajustarVisitante(id, mudanca) {
    const input = document.getElementById(id);
    let valor = parseInt(input.value) + mudanca;
    if (valor < 0) valor = 0;
    input.value = valor;
    atualizarPlacar();
}

// 7. PLACEHOLDER SALVAR (PERSISTÊNCIA)
async function salvarChamada() {
    alert("Função salvar: Coletando dados marcados e enviando ao Supabase...");
    // Aqui você implementaria o loop pelos checkboxes marcados e faria o upsert na tabela presencas
}