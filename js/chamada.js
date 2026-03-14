// ==========================================
// SOLDADO: js/chamada.js - VERSÃO FINAL (CORRIGIDA)
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

        // B. BUSCA PRESENÇAS EXISTENTES
        const { data: presencasExistentes } = await _supabase
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

        // D. PREENCHE CAMPOS DO RESUMO
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

        // E. ALIMENTA SUGESTÕES
        const datalist = document.getElementById('listaMembrosSugestao');
        datalist.innerHTML = membros.map(m => `<option value="${m.apelido || m.nome}">`).join('');

        // F. RENDERIZA LISTA (COMPARANDO IDS COM SEGURANÇA)
        container.innerHTML = membros.map(m => {
            // Compara IDs convertendo ambos para String para evitar erro de tipo (int8 vs text)
            const registro = presencasExistentes?.find(p => String(p.membro_id) === String(m.id));
            
            const isVisitante = m.situacao === 'Visitante';
            const partesNome = m.nome.split(' ');
            const nomeCurto = partesNome.slice(0, 2).join(' ');

            return `
            <div class="card-chamada">
                <div style="flex: 1;">
                    <strong style="font-size: 1.1rem; color: #2c3e50; display: block;">${m.apelido || partesNome[0]}</strong>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <small style="color: #7f8c8d;">(${nomeCurto})</small>
                        ${isVisitante ? '<small style="color: #e74c3c; font-weight: bold;">• Vis.</small>' : ''}
                    </div>
                </div>
                <div class="colunas-nomes">
                    <input type="checkbox" class="custom-check check-presenca" 
                        ${registro?.status === 'P' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this)" 
                        data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}">
                    
                    <input type="checkbox" class="custom-check check-icm" 
                        ${registro?.status === 'I' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this)"
                        data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}">
                    
                    <input type="checkbox" class="custom-check check-maanaim" 
                        ${registro?.status === 'M' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this)"
                        data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}">
                </div>
            </div>`;
        }).join('');

        atualizarPlacar();
    } catch (err) {
        console.error("Erro renderização:", err);
    }
}

// 2. EXCLUSIVIDADE DE MARCAÇÃO
function marcarExclusivo(el) {
    const pai = el.parentElement;
    const checks = pai.querySelectorAll('input[type="checkbox"]');
    if (el.checked) {
        checks.forEach(c => { if(c !== el) c.checked = false; });
    }
    atualizarPlacar();
}

// 3. AUTO-COMPLETAR FUNÇÃO (VERSÃO INFALÍVEL)
function processarTrocaFuncao(idInput) {
    const input = document.getElementById(idInput);
    if (!input) return;

    const acao = () => {
        const valor = input.value.trim().toLowerCase();
        const membro = listaMembrosCache.find(m => 
            (m.apelido && m.apelido.toLowerCase() === valor) || 
            (m.nome.toLowerCase() === valor)
        );

        if (membro) {
            const select = document.getElementById(idInput.replace('_nome', '_funcao'));
            if (select) {
                const normal = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                const catMembro = normal(membro.categoria || "");

                for (let i = 0; i < select.options.length; i++) {
                    if (normal(select.options[i].text) === catMembro) {
                        select.selectedIndex = i;
                        break;
                    }
                }
            }
        }
    };

    // 'input' pega a digitação, 'change' pega a seleção do datalist
    input.addEventListener('input', acao);
    input.addEventListener('change', acao);
}

// Inicializa para os campos de cabeçalho
['pregador_nome', 'louvor_nome', 'portao_nome'].forEach(processarTrocaFuncao);

// 4. PLACAR (CORREÇÃO DE CATEGORIAS ADULTO / CIAS)
function atualizarPlacar() {
    let mAd = 0, mCia = 0, vAdList = 0, vCiaList = 0;

    const ehCia = (cat) => {
        if (!cat) return false;
        const c = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return c.includes('cia') || c.includes('crianca') || c.includes('interme') || c.includes('adoles');
    };

    document.querySelectorAll('.card-chamada').forEach(card => {
        const check = card.querySelector('input[type="checkbox"]:checked');
        if (check) {
            const cat = check.getAttribute('data-cat');
            const sit = check.getAttribute('data-sit');
            const cia = ehCia(cat);

            if (sit === 'Membro') {
                if (cia) mCia++; else mAd++;
            } else {
                if (cia) vCiaList++; else vAdList++;
            }
        }
    });

    const vAdMan = parseInt(document.getElementById('vis_adultos').value) || 0;
    const vCiaMan = parseInt(document.getElementById('vis_cias').value) || 0;

    document.getElementById('cont_membros_adultos').innerText = mAd;
    document.getElementById('cont_membros_cias').innerText = mCia;
    document.getElementById('cont_vis_adultos_display').innerText = vAdList + vAdMan;
    document.getElementById('cont_vis_cias_display').innerText = vCiaList + vCiaMan;
    document.getElementById('cont_total').innerText = mAd + mCia + vAdList + vAdMan + vCiaList + vCiaMan;
}

// 5. SALVAR TUDO NO SUPABASE
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
        // 1. Deleta presenças antigas para evitar duplicidade
        await _supabase.from('presencas').delete().eq('data_culto', data_culto).eq('tipo_evento', tipo_evento);
        // 2. Insere novas presenças
        if (presencas.length > 0) await _supabase.from('presencas').insert(presencas);
        // 3. Salva resumo (Upsert)
        await _supabase.from('resumo_culto').upsert(resumo, { onConflict: 'data_culto, tipo_evento' });
        
        alert("✅ Salvo com sucesso!");
    } catch (e) {
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
    const data = document.getElementById('data_chamada').value.split('-').reverse().join('/');
    const msg = `ICM - Dona Augusta\n📊 Resumo do Culto - ${data}\n\nTotal Vidas: ${document.getElementById('cont_total').innerText}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}