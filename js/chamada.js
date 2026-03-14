// ==========================================
// SOLDADO: js/chamada.js - VERSÃO DEFINITIVA
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

        // D. PREENCHE OS CAMPOS DO RESUMO (DE ACORDO COM SUA TABELA)
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
            // Reseta campos se não houver registro
            ['pregador_nome', 'texto_biblico', 'louvor_nome', 'portao_nome', 'observacoes_culto'].forEach(id => {
                document.getElementById(id).value = '';
            });
            ['pregador_funcao', 'louvor_funcao', 'portao_funcao'].forEach(id => {
                document.getElementById(id).value = 'Membro';
            });
            document.getElementById('vis_adultos').value = 0;
            document.getElementById('vis_cias').value = 0;
        }

        // E. RENDERIZA LISTA NOMINAL
        const datalist = document.getElementById('listaMembrosSugestao');
        datalist.innerHTML = membros.map(m => `<option value="${m.apelido || m.nome}">`).join('');

        container.innerHTML = membros.map(m => {
            const registro = presencasExistentes?.find(p => p.membro_id == m.id);
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

// 3. AUTO-COMPLETAR FUNÇÃO (REESCRITO PARA SER INFALÍVEL)
function vincularAutoCompletar(idInput) {
    const input = document.getElementById(idInput);
    if (!input) return;

    input.addEventListener('change', () => {
        const valorDigitado = input.value.trim().toLowerCase();
        const membro = listaMembrosCache.find(m => 
            (m.apelido && m.apelido.toLowerCase() === valorDigitado) || 
            (m.nome.toLowerCase() === valorDigitado)
        );

        if (membro) {
            const idSelect = idInput.replace('_nome', '_funcao');
            const selectFuncao = document.getElementById(idSelect);
            if (selectFuncao) {
                // Normalização para ignorar acentos e espaços
                const normalizar = (txt) => txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                const catMembro = normalizar(membro.categoria || "");

                for (let i = 0; i < selectFuncao.options.length; i++) {
                    const textoOpcao = normalizar(selectFuncao.options[i].text);
                    const valorOpcao = normalizar(selectFuncao.options[i].value);
                    
                    if (textoOpcao === catMembro || valorOpcao === catMembro) {
                        selectFuncao.selectedIndex = i;
                        break;
                    }
                }
            }
        }
    });
}

// Inicializa o auto-completar para os 3 campos
['pregador_nome', 'louvor_nome', 'portao_nome'].forEach(vincularAutoCompletar);

// 4. PLACAR
function atualizarPlacar() {
    let mAdultos = 0, mCias = 0;
    let vAdultosLista = 0, vCiasLista = 0;
    
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

// 5. SALVAR TUDO
async function salvarChamada() {
    const data_culto = document.getElementById('data_chamada').value;
    const tipo_evento = document.getElementById('tipo_evento').value;

    // A. Coleta Presenças (Conforme sua tabela: membro_id, data_culto, tipo_evento, status)
    const presencas = [];
    document.querySelectorAll('.card-chamada').forEach(card => {
        const inputCheck = card.querySelector('input[type="checkbox"]:checked');
        if (inputCheck) {
            const idMembro = inputCheck.getAttribute('data-id');
            let statusChar = 'P'; // Default
            if (inputCheck.classList.contains('check-icm')) statusChar = 'I';
            if (inputCheck.classList.contains('check-maanaim')) statusChar = 'M';
            
            presencas.push({ 
                membro_id: idMembro, 
                data_culto, 
                tipo_evento, 
                status: statusChar 
            });
        }
    });

    // B. Coleta Resumo (Conforme sua tabela resumo_culto)
    const resumo = {
        data_culto,
        tipo_evento,
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
        // Primeiro deleta as presenças antigas daquele dia/evento para não duplicar se mudar o status
        await _supabase.from('presencas').delete().eq('data_culto', data_culto).eq('tipo_evento', tipo_evento);
        
        // Insere as novas presenças
        if (presencas.length > 0) {
            await _supabase.from('presencas').insert(presencas);
        }

        // Upsert no resumo
        await _supabase.from('resumo_culto').upsert(resumo, { onConflict: 'data_culto, tipo_evento' });
        
        alert("✅ Registro de Culto Salvo!");
    } catch (e) {
        console.error(e);
        alert("❌ Erro ao salvar dados.");
    }
}

// 6. OUTRAS FUNÇÕES
function ajustarVisitante(id, mudanca) {
    const input = document.getElementById(id);
    input.value = Math.max(0, (parseInt(input.value) || 0) + mudanca);
    atualizarPlacar();
}

function enviarResumoWhatsapp() {
    // ... (mesma lógica anterior de gerar a string msg)
}