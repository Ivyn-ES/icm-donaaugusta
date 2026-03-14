// ==========================================
// SOLDADO: js/chamada.js - VERSÃO INTEGRAL CORRIGIDA FINAL
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

        // B. BUSCA PRESENÇAS (Tabela: presencas)
        const { data: presencasExistentes } = await _supabase
            .from('presencas')
            .select('*')
            .eq('data_culto', dataSelecionada)
            .eq('tipo_evento', tipoEvento);

        // C. BUSCA RESUMO DO CULTO (Tabela: resumo_culto)
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
            ['pregador_nome', 'texto_biblico', 'louvor_nome', 'portao_nome', 'observacoes_culto'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = '';
            });
            ['pregador_funcao', 'louvor_funcao', 'portao_funcao'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = 'Membro';
            });
            document.getElementById('vis_adultos').value = 0;
            document.getElementById('vis_cias').value = 0;
        }

        // E. ALIMENTA DATALIST
        const datalist = document.getElementById('listaMembrosSugestao');
        if(datalist) datalist.innerHTML = membros.map(m => `<option value="${m.apelido || m.nome}">`).join('');

        // F. RENDERIZA LISTA NOMINAL
        container.innerHTML = membros.map(m => {
            const registro = presencasExistentes?.find(p => String(p.membro_id) === String(m.id));
            const isVisitante = m.situacao === 'Visitante';
            const apelidoExibir = m.apelido || m.nome.split(' ')[0];

            // AJUSTE: Comparação com os nomes completos salvos no banco
            const statusSalvo = registro?.status;

            return `
            <div class="card-chamada">
                <div style="flex: 1;">
                    <strong style="font-size: 1.1rem; color: #2c3e50; display: block;">${apelidoExibir}</strong>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <small style="color: #7f8c8d;">(${m.nome.split(' ').slice(0,2).join(' ')})</small>
                        ${isVisitante ? '<small style="color: #e74c3c; font-weight: bold;">• Vis.</small>' : ''}
                    </div>
                </div>
                <div class="colunas-nomes">
                    <input type="checkbox" class="custom-check check-presenca" 
                        ${statusSalvo === 'Presente' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this)" 
                        data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}">
                    
                    <input type="checkbox" class="custom-check check-icm" 
                        ${statusSalvo === 'Outra ICM' ? 'checked' : ''} 
                        onclick="marcarExclusivo(this)"
                        data-id="${m.id}" data-cat="${m.categoria}" data-sit="${m.situacao}">
                    
                    <input type="checkbox" class="custom-check check-maanaim" 
                        ${statusSalvo === 'Maanaim' ? 'checked' : ''} 
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
    const pai = el.parentElement;
    const checks = pai.querySelectorAll('input[type="checkbox"]');
    if (el.checked) {
        checks.forEach(c => { if(c !== el) c.checked = false; });
    }
    atualizarPlacar();
}

// 3. AUTO-COMPLETAR FUNÇÃO
function vincularAutoCompletar(idInput) {
    const input = document.getElementById(idInput);
    if (!input) return;

    const acao = () => {
        const valor = input.value.trim().toLowerCase();
        const membro = listaMembrosCache.find(m => 
            (m.apelido && m.apelido.toLowerCase() === valor) || 
            (m.nome.toLowerCase() === valor)
        );

        if (membro && membro.funcao) {
            const select = document.getElementById(idInput.replace('_nome', '_funcao'));
            if (select) {
                const normal = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                const fMembro = normal(membro.funcao);

                for (let i = 0; i < select.options.length; i++) {
                    const textoOp = normal(select.options[i].text);
                    if (textoOp === fMembro) {
                        select.selectedIndex = i;
                        break;
                    }
                }
            }
        }
    };
    input.addEventListener('input', acao);
    input.addEventListener('change', acao);
}
['pregador_nome', 'louvor_nome', 'portao_nome'].forEach(vincularAutoCompletar);

// 4. PLACAR
function atualizarPlacar() {
    let mAd = 0, mCia = 0, vAdL = 0, vCiaL = 0;
    const listaCias = ['Adolescente', 'Intermediário', 'Criança'];

    document.querySelectorAll('.card-chamada').forEach(card => {
        const ck = card.querySelector('input[type="checkbox"]:checked');
        if (ck) {
            const cat = ck.getAttribute('data-cat');
            const sit = ck.getAttribute('data-sit');
            const ehCia = listaCias.includes(cat);

            if (sit === 'Membro') {
                if (ehCia) mCia++; else mAd++;
            } else {
                if (ehCia) vCiaL++; else vAdL++;
            }
        }
    });

    const vAdM = parseInt(document.getElementById('vis_adultos').value) || 0;
    const vCiaM = parseInt(document.getElementById('vis_cias').value) || 0;

    document.getElementById('cont_membros_adultos').innerText = mAd;
    document.getElementById('cont_membros_cias').innerText = mCia;
    document.getElementById('cont_vis_adultos_display').innerText = vAdL + vAdM;
    document.getElementById('cont_vis_cias_display').innerText = vCiaL + vCiaM;
    document.getElementById('cont_total').innerText = mAd + mCia + vAdL + vAdM + vCiaL + vCiaM;
}

// 5. SALVAR TUDO
async function salvarChamada() {
    const data_culto = document.getElementById('data_chamada').value;
    const tipo_evento = document.getElementById('tipo_evento').value;

    // A. Coleta Presenças (CORRIGIDO: Identifica o checkbox específico e define status longo + presenca:true)
    const presencas = [];
    document.querySelectorAll('.card-chamada').forEach(card => {
        const ckPresenca = card.querySelector('.check-presenca:checked');
        const ckICM = card.querySelector('.check-icm:checked');
        const ckMaanaim = card.querySelector('.check-maanaim:checked');

        let statusFinal = null;
        if (ckPresenca) statusFinal = 'Presente';
        else if (ckICM) statusFinal = 'Outra ICM';
        else if (ckMaanaim) statusFinal = 'Maanaim';

        if (statusFinal) {
            presencas.push({ 
                membro_id: (ckPresenca || ckICM || ckMaanaim).getAttribute('data-id'), 
                data_culto, 
                tipo_evento, 
                status: statusFinal,
                presenca: true // Resolve o problema do campo NULL
            });
        }
    });

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
        // 1. Salvar Presenças
        await _supabase.from('presencas').delete().eq('data_culto', data_culto).eq('tipo_evento', tipo_evento);
        if (presencas.length > 0) {
            const { error: errorP } = await _supabase.from('presencas').insert(presencas);
            if (errorP) throw errorP;
        }

        // 2. Salvar Resumo
        await _supabase.from('resumo_culto').delete().eq('data_culto', data_culto).eq('tipo_evento', tipo_evento);
        const { error: errorResumo } = await _supabase.from('resumo_culto').insert([resumo]);
        if (errorResumo) throw errorResumo;

        alert("✅ Registro completo salvo com sucesso!");
        
        // RECARREGA para garantir que os checks fiquem ativos na tela
        renderizarListaChamada(); 

    } catch (e) {
        console.error("Erro ao salvar:", e);
        alert("❌ Erro ao salvar dados.");
    }
}

// 6. AUXILIARES
function ajustarVisitante(id, mudanca) {
    const input = document.getElementById(id);
    if(input) {
        input.value = Math.max(0, (parseInt(input.value) || 0) + mudanca);
        atualizarPlacar();
    }
}