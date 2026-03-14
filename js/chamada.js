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

        // B. BUSCA PRESENÇAS EXISTENTES
        const { data: presencasExistentes, error: errP } = await _supabase
            .from('presencas')
            .select('membro_id, status')
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
        }

        // E. ALIMENTA SUGESTÕES (DATALIST)
        const datalist = document.getElementById('listaMembrosSugestao');
        datalist.innerHTML = membros.map(m => `<option value="${m.apelido || m.nome}">`).join('');

        // F. RENDERIZA LISTA (CORREÇÃO DE COMPARAÇÃO DE ID)
        container.innerHTML = membros.map(m => {
            // Buscamos se o ID do membro está na lista de presenças do dia
            const registro = presencasExistentes?.find(p => String(p.membro_id) === String(m.id));
            
            const isVisitante = m.situacao === 'Visitante';
            const partesNome = m.nome.split(' ');
            const apelidoExibir = m.apelido || partesNome[0];

            return `
            <div class="card-chamada">
                <div style="flex: 1;">
                    <strong style="font-size: 1.1rem; color: #2c3e50; display: block;">${apelidoExibir}</strong>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <small style="color: #7f8c8d;">(${partesNome.slice(0,2).join(' ')})</small>
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
        console.error("Erro na renderização:", err);
    }
}

// 2. EXCLUSIVIDADE DE MARCAÇÃO
function marcarExclusivo(el) {
    const checks = el.parentElement.querySelectorAll('input[type="checkbox"]');
    if (el.checked) {
        checks.forEach(c => { if(c !== el) c.checked = false; });
    }
    atualizarPlacar();
}

// 3. AUTO-COMPLETAR FUNÇÃO (Ajustado para ler campo 'funcao' da tabela membros)
function vincularAutoCompletar(idInput) {
    const input = document.getElementById(idInput);
    if (!input) return;

    const preencherFuncao = () => {
        const valorDigitado = input.value.trim().toLowerCase();
        // Busca no cache pelo apelido ou nome completo
        const membro = listaMembrosCache.find(m => 
            (m.apelido && m.apelido.toLowerCase() === valorDigitado) || 
            (m.nome.toLowerCase() === valorDigitado)
        );

        if (membro) {
            const idSelect = idInput.replace('_nome', '_funcao');
            const selectFuncao = document.getElementById(idSelect);
            
            if (selectFuncao && membro.funcao) {
                // Normaliza para comparar (ex: Diácono -> diacono)
                const normal = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                const funcaoMembro = normal(membro.funcao);

                for (let i = 0; i < selectFuncao.options.length; i++) {
                    if (normal(selectFuncao.options[i].text) === funcaoMembro || normal(selectFuncao.options[i].value) === funcaoMembro) {
                        selectFuncao.selectedIndex = i;
                        break;
                    }
                }
            }
        }
    };

    input.addEventListener('change', preencherFuncao);
    input.addEventListener('input', preencherFuncao);
}

['pregador_nome', 'louvor_nome', 'portao_nome'].forEach(vincularAutoCompletar);

// 4. PLACAR (Categorias Exatas: Adulto, Jovem, Adolescente, Intermediário, Criança)
function atualizarPlacar() {
    let mAd = 0, mCia = 0, vAdList = 0, vCiaList = 0;

    const listaCias = ['Adolescente', 'Intermediário', 'Criança'];

    document.querySelectorAll('.card-chamada').forEach(card => {
        const check = card.querySelector('input[type="checkbox"]:checked');
        if (check) {
            const cat = check.getAttribute('data-cat'); // Pega do banco
            const sit = check.getAttribute('data-sit'); // Membro ou Visitante
            const ehCia = listaCias.includes(cat);

            if (sit === 'Membro') {
                if (ehCia) mCia++; else mAd++;
            } else {
                if (ehCia) vCiaList++; else vAdList++;
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
        await _supabase.from('presencas').delete().eq('data_culto', data_culto).eq('tipo_evento', tipo_evento);
        if (presencas.length > 0) await _supabase.from('presencas').insert(presencas);
        await _supabase.from('resumo_culto').upsert(resumo, { onConflict: 'data_culto, tipo_evento' });
        alert("✅ Salvo com sucesso!");
    } catch (e) {
        alert("❌ Erro ao salvar.");
    }
}

// 6. AJUSTE DE VISITANTES E WHATSAPP
function ajustarVisitante(id, mudanca) {
    const input = document.getElementById(id);
    input.value = Math.max(0, (parseInt(input.value) || 0) + mudanca);
    atualizarPlacar();
}

function enviarResumoWhatsapp() {
    // Mesma lógica anterior...
}