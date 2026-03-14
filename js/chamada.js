// ==========================================
// SOLDADO: js/chamada.js - VERSÃO FINALÍSSIMA
// ==========================================

let listaMembrosCache = [];

// 1. CARREGAR E BUSCAR DADOS (HISTÓRICO E RESUMO)
async function renderizarListaChamada() {
    const container = document.getElementById('listaChamada');
    const dataSelecionada = document.getElementById('data_chamada').value;
    const tipoEvento = document.getElementById('tipo_evento').value;
    
    if (!container) return;
    container.innerHTML = "<p style='text-align:center; padding: 20px; color: #888;'>Buscando registros...</p>";

    try {
        // A. BUSCA MEMBROS ATIVOS
        const { data: membros, error: errM } = await _supabase
            .from('membros')
            .select('*')
            .eq('status_registro', 'Ativo')
            .order('nome');

        if (errM) throw errM;
        listaMembrosCache = membros;

        // B. BUSCA PRESENÇAS
        const { data: presencasExistentes, error: errP } = await _supabase
            .from('presencas')
            .select('*')
            .eq('data_culto', dataSelecionada)
            .eq('tipo_evento', tipoEvento);

        // C. BUSCA RESUMO DO CULTO
        const { data: resumoDados } = await _supabase
            .from('resumo_culto')
            .select('*')
            .eq('data_culto', dataSelecionada)
            .eq('tipo_evento', tipoEvento)
            .maybeSingle();

        // D. PREENCHE OS CAMPOS DO RESUMO
        if (resumoDados) {
            document.getElementById('vis_adultos').value = resumoDados.vis_adultos || 0;
            document.getElementById('vis_cias').value = resumoDados.vis_cias || 0;
            document.getElementById('pregador_nome').value = resumoDados.pregador_nome || '';
            document.getElementById('pregador_funcao').value = resumoDados.pregador_funcao || 'Membro';
            document.getElementById('texto_biblico').value = resumoDados.texto_biblico || '';
            document.getElementById('louvor_nome').value = resumoDados.louvor_nome || '';
            document.getElementById('louvor_funcao').value = resumoDados.louvor_funcao || 'Membro';
            document.getElementById('portao_nome').value = resumoDados.portao_nome || '';
            document.getElementById('portao_funcao').value = resumoDados.portao_funcao || 'Membro';
            document.getElementById('observacoes_culto').value = resumoDados.observacoes || '';
        } else {
            ['pregador_nome', 'texto_biblico', 'louvor_nome', 'portao_nome', 'observacoes_culto'].forEach(id => document.getElementById(id).value = '');
            ['pregador_funcao', 'louvor_funcao', 'portao_funcao'].forEach(id => document.getElementById(id).value = 'Membro');
            document.getElementById('vis_adultos').value = 0;
            document.getElementById('vis_cias').value = 0;
        }

        // E. RENDERIZA LISTA NOMINAL
        const datalist = document.getElementById('listaMembrosSugestao');
        datalist.innerHTML = membros.map(m => `<option value="${m.apelido || m.nome}">`).join('');

        container.innerHTML = membros.map(m => {
            // Comparação forçada para String para evitar erro de tipo int8
            const registro = presencasExistentes?.find(p => String(p.membro_id) === String(m.id));
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
                        data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}">
                    <input type="checkbox" class="custom-check check-maanaim" 
                        ${registro?.status === 'M' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this, '${m.id}')"
                        data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}">
                </div>
            </div>`;
        }).join('');

        atualizarPlacar();
    } catch (err) {
        console.error("Erro geral:", err);
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

// 3. AUTO-COMPLETAR FUNÇÃO (MELHORADO)
document.addEventListener('input', (e) => {
    if (['pregador_nome', 'louvor_nome', 'portao_nome'].includes(e.target.id)) {
        const valorDigitado = e.target.value.trim().toLowerCase();
        const membro = listaMembrosCache.find(m => 
            (m.apelido && m.apelido.toLowerCase() === valorDigitado) || 
            (m.nome.toLowerCase() === valorDigitado)
        );

        if (membro) {
            const idSelect = e.target.id.replace('_nome', '_funcao');
            const selectFuncao = document.getElementById(idSelect);
            if (selectFuncao) {
                const normalizar = (txt) => txt ? txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
                const catMembro = normalizar(membro.categoria);

                for (let i = 0; i < selectFuncao.options.length; i++) {
                    const textoOp = normalizar(selectFuncao.options[i].text);
                    if (textoOp === catMembro) {
                        selectFuncao.selectedIndex = i;
                        break;
                    }
                }
            }
        }
    }
});

// 4. PLACAR (DIVISÃO ADULTOS / CIAS)
function atualizarPlacar() {
    let mAdultos = 0, mCias = 0;
    let vAdultosLista = 0, vCiasLista = 0;
    
    const ehCia = (categoria) => {
        if (!categoria) return false;
        const c = categoria.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return c.includes('cia') || c.includes('crianca') || c.includes('intermediario') || c.includes('adolescente');
    };

    document.querySelectorAll('.card-chamada').forEach(card => {
        const check = card.querySelector('input[type="checkbox"]:checked');
        if (check) {
            const cat = check.getAttribute('data-cat');
            const sit = check.getAttribute('data-sit');
            const cia = ehCia(cat);

            if (sit === 'Membro') {
                if (cia) mCias++; else mAdultos++;
            } else {
                if (cia) vCiasLista++; else vAdultosLista++;
            }
        }
    });

    const vAdManual = parseInt(document.getElementById('vis_adultos').value) || 0;
    const vCiaManual = parseInt(document.getElementById('vis_cias').value) || 0;

    document.getElementById('cont_membros_adultos').innerText = mAdultos;
    document.getElementById('cont_membros_cias').innerText = mCias;
    document.getElementById('cont_vis_adultos_display').innerText = vAdultosLista + vAdManual;
    document.getElementById('cont_vis_cias_display').innerText = vCiasLista + vCiaManual;
    document.getElementById('cont_total').innerText = mAdultos + mCias + vAdultosLista + vAdManual + vCiasLista + vCiaManual;
}

// 5. SALVAR TUDO
async function salvarChamada() {
    const data_culto = document.getElementById('data_chamada').value;
    const tipo_evento = document.getElementById('tipo_evento').value;

    const presencas = [];
    document.querySelectorAll('.card-chamada').forEach(card => {
        const check = card.querySelector('input[type="checkbox"]:checked');
        if (check) {
            let status = 'P';
            if (check.classList.contains('check-icm')) status = 'I';
            if (check.classList.contains('check-maanaim')) status = 'M';
            presencas.push({ 
                membro_id: check.getAttribute('data-id'), 
                data_culto, 
                tipo_evento, 
                status 
            });
        }
    });

    const resumo = {
        data_culto, tipo_evento,
        vis_adultos: parseInt(document.getElementById('vis_adultos').value) || 0,
        vis_cias: parseInt(document.getElementById('vis_cias').value) || 0,
        pregador_nome: document.getElementById('pregador_nome').value,
        pregador_funcao: document.getElementById('pregador_funcao').value,
        texto_biblico: document.getElementById('texto_biblico').value,
        louvor_nome: document.getElementById('louvor_nome').value,
        louvor_funcao: document.getElementById('louvor_funcao').value,
        portao_nome: document.getElementById('portao_nome').value,
        portao_funcao: document.getElementById('portao_funcao').value,
        observacoes: document.getElementById('observacoes_culto').value
    };

    try {
        // Limpa presenças antigas e insere novas
        await _supabase.from('presencas').delete().eq('data_culto', data_culto).eq('tipo_evento', tipo_evento);
        if (presencas.length > 0) await _supabase.from('presencas').insert(presencas);
        
        // Upsert no resumo
        await _supabase.from('resumo_culto').upsert(resumo, { onConflict: 'data_culto, tipo_evento' });
        
        alert("✅ Salvo com sucesso!");
    } catch (e) {
        console.error(e);
        alert("❌ Erro ao salvar.");
    }
}

// 6. AUXILIARES
function ajustarVisitante(id, mudanca) {
    const input = document.getElementById(id);
    input.value = Math.max(0, (parseInt(input.value) || 0) + mudanca);
    atualizarPlacar();
}

function enviarResumoWhatsapp() {
    const m_ad = document.getElementById('cont_membros_adultos').innerText;
    const m_cia = document.getElementById('cont_membros_cias').innerText;
    const v_ad = document.getElementById('cont_vis_adultos_display').innerText;
    const v_cia = document.getElementById('cont_vis_cias_display').innerText;
    const total = document.getElementById('cont_total').innerText;

    const data = document.getElementById('data_chamada').value.split('-').reverse().join('/');
    
    let msg = `ICM - Dona Augusta\n📊 *Resumo do Culto - ${data}*\n\n`;
    msg += `*Participantes:*\n`;
    msg += `- Membros (Ad/CIA): ${m_ad}/${m_cia}\n`;
    msg += `- Visitantes (Ad/CIA): ${v_ad}/${v_cia}\n`;
    msg += `🌟 *Total Vidas: ${total}*\n\n`;
    
    if(document.getElementById('pregador_nome').value) msg += `🎤 Pregador: ${document.getElementById('pregador_nome').value}\n`;
    if(document.getElementById('texto_biblico').value) msg += `📖 Texto: ${document.getElementById('texto_biblico').value}\n`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}