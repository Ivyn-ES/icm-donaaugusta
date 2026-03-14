console.log("🚀 O Script carregou com sucesso!");
// ==========================================
// 1. CONFIGURAÇÃO E CONEXÃO
// ==========================================
const SUPABASE_URL = 'https://pxjczmjhzopfxwlmpjfv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4amN6bWpoem9wZnh3bG1wamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjUzMjYsImV4cCI6MjA4NzEwMTMyNn0.OfekQPuYUwsZu5X9_lPDGBbVTZYBvAQ5KdiFx3TFOCY';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. SEGURANÇA E ACESSO (VERSÃO DINÂMICA)
// ==========================================
function verificarAcesso() {
    const usuarioJson = localStorage.getItem('usuarioLogado');
    const usuario = usuarioJson ? JSON.parse(usuarioJson) : null;
    if (!usuario) {
        if (!window.location.href.includes('index.html')) {
            window.location.href = '../index.html';
        }
        return null;
    }
    return usuario;
}

// ==========================================
// 3. FUNÇÃO DE LOGIN (VERSÃO FINAL)
// ==========================================
async function realizarLogin(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    
    console.log("Tentando realizar login...");

    // Pegamos os elementos para checar se existem
    const campoLogin = document.getElementById('login') || document.getElementById('usuario');
    const campoSenha = document.getElementById('senha');

    if (!campoLogin || !campoSenha) {
        console.error("Erro: Campos de login ou senha não encontrados no HTML!");
        return;
    }

    const loginInput = campoLogin.value.trim();
    const senhaInput = campoSenha.value.trim();

    console.log("Dados capturados, consultando Supabase para:", loginInput);

    const { data: usuario, error } = await _supabase
        .from('usuarios')
        .select('*')
        .eq('login', loginInput)
        .eq('senha', senhaInput)
        .single();

    if (error || !usuario) {
        console.error("Erro na consulta ou usuário inválido:", error);
        alert('Login ou senha incorretos!');
        return;
    }

    console.log("Sucesso! Redirecionando...");
    localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
    window.location.href = 'pages/dashboard.html';
}

// ==========================================
// 4. MÓDULO DE CHAMADA (PRESENÇA) - ATUALIZADO COM FILTRO
// ==========================================
async function renderizarListaChamada() {
    const container = document.getElementById('listaChamada');
    const dataSelecionada = document.getElementById('data_chamada')?.value;
    const eventoSelecionado = document.getElementById('tipo_evento')?.value;
    
    if (!container) return;

    const user = verificarAcesso();
    if (!user) return;

    const nivel = (user.permissao || user.nivel || "").toLowerCase();
    // Definimos quem pode ver a igreja toda
    const vêTudo = ['admin', 'master', 'secretario', 'apoio', 'coordenadora'].includes(nivel);

    try {
        // --- INÍCIO DO FILTRO INTELIGENTE ---
        let consulta = _supabase.from('membros')
            .select('id, nome, apelido, grupo, categoria, situacao') 
            .eq('status_registro', 'Ativo');

        // Se for Responsável, ele só faz chamada do grupo dele
        if (!vêTudo && user.grupo) {
            consulta = consulta.eq('grupo', user.grupo);
        }

        const { data: membros, error: errM } = await consulta.order('nome', { ascending: true });
        // --- FIM DO FILTRO ---
        
        if (errM) throw errM;

        let jaRegistrados = [];
        if (dataSelecionada && eventoSelecionado) {
            const { data: pres } = await _supabase.from('presencas')
                .select('membro_id, status, presenca')
                .eq('data_culto', dataSelecionada)
                .eq('tipo_evento', eventoSelecionado);
            jaRegistrados = pres || [];
        }

        container.innerHTML = "";

        if (!membros || membros.length === 0) {
            container.innerHTML = "<p style='text-align:center; padding:20px;'>Nenhum membro encontrado para este grupo.</p>";
            return;
        }

        container.innerHTML = membros.map(m => {
            const reg = jaRegistrados.find(r => r.membro_id === m.id);
            let statusAtual = 'Ausente';
            if (reg) {
                if (reg.status && reg.status !== 'Ausente') statusAtual = reg.status;
                else if (reg.presenca === true) statusAtual = 'Presente';
            }

            const nomeExibicao = m.apelido ? `<strong>${m.apelido}</strong>` : `<strong>${m.nome.split(" ")[0]}</strong>`;
            
            return `
                <div class="card-chamada" data-id="${m.id}" data-status="${statusAtual}"
                     style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #f0f0f0; background:${statusAtual === 'Presente' ? '#f0fff4' : '#fff'}; transition: 0.2s;">
                    
                    <div style="flex:1;">
                        <span style="font-size:1.05rem;">${nomeExibicao}</span>
                        <br><small style="color: #888;">${m.categoria} ${vêTudo ? ` - ${m.grupo}` : ''}</small>
                    </div>

                    <div style="display:flex; gap:20px; align-items:center;">
                        <button onclick="selecionarStatus('${m.id}', 'Presente')" id="btn_P_${m.id}" 
                                style="width:35px; height:35px; cursor:pointer; font-size:1.5rem; display:flex; align-items:center; justify-content:center; background:none; padding:0;
                                border: ${statusAtual === 'Presente' ? 'none' : '1px solid #ccc'}; border-radius:4px;">
                            ${statusAtual === 'Presente' ? '✅' : ''}
                        </button>
                        
                        <button onclick="selecionarStatus('${m.id}', 'ICM')" id="btn_I_${m.id}" 
                                style="width:35px; height:35px; border:none; cursor:pointer; font-size:1.5rem; display:flex; align-items:center; justify-content:center; background:none; padding:0;">
                            ${statusAtual === 'ICM' ? '✅' : '🏠'}
                        </button>
                        
                        <button onclick="selecionarStatus('${m.id}', 'Maanaim')" id="btn_M_${m.id}" 
                                style="width:35px; height:35px; border:none; cursor:pointer; font-size:1.5rem; display:flex; align-items:center; justify-content:center; background:none; padding:0;">
                            ${statusAtual === 'Maanaim' ? '✅' : '⛰️'}
                        </button>
                    </div>
                </div>`;
        }).join('');
        
        if (typeof atualizarContadores === "function") atualizarContadores();
    } catch (err) { console.error("Erro Chamada:", err); }
}

// A função selecionarStatus permanece a mesma que você enviou, sem alterações.
function selecionarStatus(membroId, novoStatus) {
    const card = document.querySelector(`.card-chamada[data-id="${membroId}"]`);
    const btnP = document.getElementById(`btn_P_${membroId}`);
    const btnI = document.getElementById(`btn_I_${membroId}`);
    const btnM = document.getElementById(`btn_M_${membroId}`);
    const statusAnterior = card.getAttribute('data-status');

    btnP.innerText = ''; 
    btnP.style.border = '1px solid #ccc';
    btnI.innerText = '🏠'; 
    btnM.innerText = '⛰️';
    card.style.background = '#fff';

    if (statusAnterior === novoStatus) {
        card.setAttribute('data-status', 'Ausente');
    } else {
        card.setAttribute('data-status', novoStatus);
        
        if (novoStatus === 'Presente') {
            btnP.innerText = '✅';
            btnP.style.border = 'none'; 
            card.style.background = '#f0fff4'; 
        } else if (novoStatus === 'ICM') {
            btnI.innerText = '✅';
            card.style.background = '#f0f7ff'; 
        } else if (novoStatus === 'Maanaim') {
            btnM.innerText = '✅';
            card.style.background = '#fffaf0'; 
        }
    }
    if (typeof atualizarContadores === "function") atualizarContadores();
}

// ==========================================
// 5. MÓDULO DE AUTOMAÇÃO E ESCALA
// ==========================================

window.membrosCache = []; 

async function carregarSugestoesEFuncoes() {
    try {
        const { data: membros, error } = await _supabase.from('membros')
            .select('nome, apelido, funcao, situacao')
            .eq('status_registro', 'Ativo');

        if (error) throw error;
        window.membrosCache = membros;

        const datalist = document.getElementById('listaMembrosSugestao');
        if (datalist) {
            datalist.innerHTML = membros.map(m => {
                const label = m.apelido ? `${m.nome} (${m.apelido})` : m.nome;
                return `<option value="${m.nome}">${m.funcao} - ${label}</option>`;
            }).join('');
        }
    } catch (err) { console.error("Erro nas sugestões:", err); }
}

function obterNomeResumido(nomeCompleto) {
    if (!nomeCompleto) return "";
    const partes = nomeCompleto.trim().split(" ");
    return partes.length > 1 ? `${partes[0]} ${partes[1]}` : partes[0];
}

function identificarFuncao(input, idSelectAlvo) {
    const termo = input.value.trim().toLowerCase();
    const membro = window.membrosCache.find(m => 
        (m.apelido && m.apelido.toLowerCase() === termo) || 
        (m.nome.toLowerCase() === termo)
    );
    if (membro) {
        const select = document.getElementById(idSelectAlvo);
        if (select) select.value = membro.funcao || "Membro";
    }
}

function ajustarVisitante(id, valor) {
    const input = document.getElementById(id);
    let atual = parseInt(input.value) || 0;
    atual += valor;
    if (atual < 0) atual = 0;
    input.value = atual;
    atualizarContadores();
}

async function gerarResumoWhatsApp() {
    try {
        const dataInput = document.getElementById('data_chamada').value;
        const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const dataObj = new Date(dataInput + 'T12:00:00');
        const dataFmt = `${dataObj.getDate()}/${meses[dataObj.getMonth()]}`;

        const total = document.getElementById('cont_total').innerText;
        const mAd = document.getElementById('cont_membros_adultos').innerText;
        const mCi = document.getElementById('cont_membros_cias').innerText;
        const vAd = document.getElementById('cont_vis_adultos_display').innerText;
        const vCi = document.getElementById('cont_vis_cias_display').innerText;

        // --- CÁLCULO DA PORCENTAGEM (PRECISÃO TOTAL) ---
        // Aqui filtramos apenas quem é 'Membro' para a base do cálculo (o seu 46)
        const cardsMembros = Array.from(document.querySelectorAll('.card-chamada'))
                                  .filter(c => c.getAttribute('data-situacao') === 'Membro');
        
        const totalMembrosAtivos = cardsMembros.length; 
        const totalPresentesMembros = parseInt(mAd) + parseInt(mCi);
        
        // Se 25 presentes de 46 ativos, o percentual será 54%
        const percentual = totalMembrosAtivos > 0 ? Math.round((totalPresentesMembros / totalMembrosAtivos) * 100) : 0;
        const emojiCor = percentual < 50 ? '🔴' : '🟢';

        const obterApelidoOuPrimeiroNome = (id) => {
            const el = document.getElementById(id);
            if (!el) return "";
            const valorInput = el.value.trim();
            if (!valorInput) return "";

            const membro = window.membrosCache?.find(m => 
                (m.nome && m.nome.toLowerCase() === valorInput.toLowerCase()) || 
                (m.apelido && m.apelido.toLowerCase() === valorInput.toLowerCase())
            );

            if (membro && membro.apelido && membro.apelido.trim() !== "") {
                return membro.apelido;
            } else {
                return valorInput.split(" ")[0];
            }
        };

        const pregador = obterApelidoOuPrimeiroNome('pregador_nome');
        const louvor = obterApelidoOuPrimeiroNome('louvor_nome');
        const portao = obterApelidoOuPrimeiroNome('portao_nome');
        const texto = document.getElementById('texto_biblico').value || "---";

        let msg = `*ICM - Dona Augusta*\n*📊 Resumo do Culto - ${dataFmt}*\n\n`;
        
        msg += `*Público:*\n`;
        msg += `- Membros (Ad/CIA): ${mAd}/${mCi} - ${emojiCor} ${percentual}%\n`;
        msg += `- Visitantes (Ad/CIA): ${vAd}/${vCi}\n`;
        msg += `*⭐ Total Geral: ${total}*\n\n`;

        msg += `*Responsáveis:*\n`;
        
        if (pregador !== "" && (pregador === louvor || louvor === "")) {
            msg += `⭐ Dirigente: ${pregador}\n`;
            msg += `📖 Texto: ${texto}\n`;
        } else {
            if (pregador) {
                msg += `🎤 Pregador: ${pregador}\n`;
                msg += `📖 Texto: ${texto}\n`;
            }
            if (louvor) msg += `🎶 Louvor: ${louvor}\n`;
        }
        
        if (portao) msg += `🚪 Portão: ${portao}\n`;
        
        const obs = document.getElementById('observacoes_culto').value;
        if(obs) msg += `\n📝 *Obs:* ${obs}`;

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (e) { 
        console.error(e);
        alert("Erro ao gerar resumo."); 
    }
}

async function salvarChamada() {
    const btn = document.getElementById('btnFinalizar');
    const original = btn.innerText;
    btn.innerText = "⌛ Salvando...";
    btn.disabled = true;

    try {
        const dataCulto = document.getElementById('data_chamada').value;
        const tipoEvento = document.getElementById('tipo_evento').value;

        const registros = Array.from(document.querySelectorAll('.card-chamada'))
            .filter(card => card.getAttribute('data-status') !== 'Faltou')
            .map(card => ({
                membro_id: card.getAttribute('data-id'),
                data_culto: dataCulto,
                tipo_evento: tipoEvento,
                status: card.getAttribute('data-status'),
                presenca: true
            }));

        const resumo = {
            data_culto: dataCulto, tipo_evento: tipoEvento, grupo: 'Geral',
            vis_adultos: parseInt(document.getElementById('vis_adultos').value) || 0,
            vis_cias: parseInt(document.getElementById('vis_cias').value) || 0,
            pregador_nome: document.getElementById('pregador_nome').value,
            pregador_funcao: document.getElementById('pregador_funcao').value,
            louvor_nome: document.getElementById('louvor_nome').value,
            louvor_funcao: document.getElementById('louvor_funcao').value,
            portao_nome: document.getElementById('portao_nome').value,
            portao_funcao: document.getElementById('portao_funcao').value,
            texto_biblico: document.getElementById('texto_biblico').value,
            observacoes: document.getElementById('observacoes_culto').value
        };

        // UPSERT com Trava: Deletar e inserir presenças garante limpeza de duplicados
        await _supabase.from('presencas').delete().eq('data_culto', dataCulto).eq('tipo_evento', tipoEvento);
        
        if (registros.length > 0) {
            await _supabase.from('presencas').insert(registros);
        }
        await _supabase.from('resumo_culto').upsert([resumo], { onConflict: 'data_culto, tipo_evento, grupo' });

        alert("✅ Sincronizado com o Supabase!");
    } catch (e) { alert("Erro ao salvar."); }
    btn.innerText = original;
    btn.disabled = false;
}

// ==========================================
// 6. RENDERIZAÇÃO, PLACAR E SUGESTÕES
// ==========================================

async function renderizarListaChamada() {
    const listaContainer = document.getElementById('listaChamada');
    listaContainer.innerHTML = "<p style='text-align:center;'>Buscando membros...</p>";

    try {
        const { data: membros, error } = await _supabase.from('membros')
            .select('*').eq('status_registro', 'Ativo').order('nome', { ascending: true });

        if (error) throw error;
        listaContainer.innerHTML = ""; 

        membros.forEach(m => {
            const card = document.createElement('div');
            card.className = 'card-chamada';
            card.style = "display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;";
            card.setAttribute('data-id', m.id);
            card.setAttribute('data-status', 'Faltou');
            card.setAttribute('data-categoria', m.categoria || "");
            card.setAttribute('data-situacao', m.situacao || "Membro");

            const nomePrincipal = m.apelido || m.nome;
            const nomeResumido = obterNomeResumido(m.nome);
            const tagVis = m.situacao === 'Visitante' ? '<span style="color:red; font-weight:bold; font-size:0.7rem;">Vis. </span>' : '';

            card.innerHTML = `
                <div style="flex: 1;">
                    <strong style="display:block; font-size: 1rem; color: #333;">${nomePrincipal}</strong>
                    <small style="color: #888; font-size: 0.8rem;">${tagVis}(${nomeResumido})</small>
                </div>
                <div class="botoes-status" style="display:flex; gap:15px; padding-right: 10px;">
                    <span class="op-status btn-check" onclick="marcarStatus(this, 'Presente')" style="cursor:pointer; font-size:1.3rem; filter:grayscale(1); opacity:0.3; transition: 0.2s;">✅</span>
                    <span class="op-status btn-icm" onclick="marcarStatus(this, 'ICM')" style="cursor:pointer; font-size:1.3rem; filter:grayscale(1); opacity:0.3; transition: 0.2s;">🏠</span>
                    <span class="op-status btn-maa" onclick="marcarStatus(this, 'Maanaim')" style="cursor:pointer; font-size:1.3rem; filter:grayscale(1); opacity:0.3; transition: 0.2s;">⛰️</span>
                </div>
            `;
            listaContainer.appendChild(card);
        });
        
        // Carrega os dados salvos e religa a inteligência de apelidos
        await carregarDadosExistentes(); 
        if (typeof carregarSugestoesEFuncoes === "function") {
            await carregarSugestoesEFuncoes(); 
        }
        
    } catch (err) { console.error("Erro na renderização:", err); }
}

function marcarStatus(elemento, novoStatus) {
    const card = elemento.closest('.card-chamada');
    if (!card) return;

    const statusAnterior = card.getAttribute('data-status');
    const statusFinal = (statusAnterior === novoStatus) ? 'Faltou' : novoStatus;
    card.setAttribute('data-status', statusFinal);

    // Reset visual dos botões na linha
    card.querySelectorAll('.op-status').forEach(i => {
        i.style.filter = 'grayscale(1)';
        i.style.opacity = '0.3';
        i.style.transform = 'scale(1)';
    });

    // Acende apenas o botão clicado
    if (statusFinal !== 'Faltou') {
        elemento.style.filter = 'none';
        elemento.style.opacity = '1';
        elemento.style.transform = 'scale(1.4)';
        card.style.backgroundColor = '#f0f7ff';
    } else {
        card.style.backgroundColor = 'transparent';
    }

    atualizarContadores();
}

async function carregarDadosExistentes() {
    const dataCulto = document.getElementById('data_chamada').value;
    const tipoEvento = document.getElementById('tipo_evento').value;

    // Reset preventivo dos campos de texto/número
    const campos = ['vis_adultos', 'vis_cias', 'pregador_nome', 'texto_biblico', 'louvor_nome', 'portao_nome', 'observacoes_culto'];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (el.type === 'number') ? 0 : "";
    });

    // Reset visual de todos os cards antes da nova carga
    document.querySelectorAll('.card-chamada').forEach(card => {
        card.setAttribute('data-status', 'Faltou');
        card.style.backgroundColor = 'transparent';
        card.querySelectorAll('.op-status').forEach(i => {
            i.style.filter = 'grayscale(1)';
            i.style.opacity = '0.3';
            i.style.transform = 'scale(1)';
        });
    });

    try {
        const { data: presencas } = await _supabase.from('presencas')
            .select('membro_id, status').eq('data_culto', dataCulto).eq('tipo_evento', tipoEvento);

        // Aplica presenças do banco nos cards
        presencas?.forEach(p => {
            const card = document.querySelector(`.card-chamada[data-id="${p.membro_id}"]`);
            if (card && p.status !== 'Faltou') {
                card.setAttribute('data-status', p.status);
                let btnClass = p.status === 'Presente' ? '.btn-check' : (p.status === 'ICM' ? '.btn-icm' : '.btn-maa');
                const btn = card.querySelector(btnClass);
                if (btn) {
                    btn.style.filter = 'none';
                    btn.style.opacity = '1';
                    btn.style.transform = 'scale(1.4)';
                    card.style.backgroundColor = '#f0f7ff';
                }
            }
        });

        // Busca o resumo do culto
        const { data: resumo } = await _supabase.from('resumo_culto')
            .select('*').eq('data_culto', dataCulto).eq('tipo_evento', tipoEvento).maybeSingle();
        
        if (resumo) {
            if(document.getElementById('vis_adultos')) document.getElementById('vis_adultos').value = resumo.vis_adultos || 0;
            if(document.getElementById('vis_cias')) document.getElementById('vis_cias').value = resumo.vis_cias || 0;
            if(document.getElementById('pregador_nome')) document.getElementById('pregador_nome').value = resumo.pregador_nome || "";
            if(document.getElementById('texto_biblico')) document.getElementById('texto_biblico').value = resumo.texto_biblico || "";
            if(document.getElementById('louvor_nome')) document.getElementById('louvor_nome').value = resumo.louvor_nome || "";
            if(document.getElementById('portao_nome')) document.getElementById('portao_nome').value = resumo.portao_nome || "";
            if(document.getElementById('observacoes_culto')) document.getElementById('observacoes_culto').value = resumo.observacoes || "";
        }
        
        atualizarContadores();
    } catch (e) { console.error("Erro ao carregar dados:", e); }
}

function atualizarContadores() {
    let mAd = 0, mCi = 0, vAd = 0, vCi = 0;
    const cards = document.querySelectorAll('.card-chamada');
    const totalMembrosAtivos = cards.length;

    cards.forEach(card => {
        const status = card.getAttribute('data-status');
        if (status && status !== 'Faltou') {
            const sit = card.getAttribute('data-situacao');
            const cat = (card.getAttribute('data-categoria') || "").toLowerCase();
            const eCia = (cat.includes('crian') || cat.includes('interme') || cat.includes('adolesc'));
            
            if (sit === 'Visitante') { 
                if (eCia) vCi++; else vAd++; 
            } else { 
                if (eCia) mCi++; else mAd++; 
            }
        }
    });

    const vA = parseInt(document.getElementById('vis_adultos')?.value) || 0;
    const vC = parseInt(document.getElementById('vis_cias')?.value) || 0;

    // Cálculo da Porcentagem
    const totalMembrosPresentes = mAd + mCi;
    let percentual = totalMembrosAtivos > 0 ? Math.round((totalMembrosPresentes / totalMembrosAtivos) * 100) : 0;
    const emojiCor = percentual < 50 ? '🔴' : '🟢';

    // Atualização dos Displays
    const setT = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setT('cont_membros_adultos', mAd);
    setT('cont_membros_cias', mCi);
    setT('cont_vis_adultos_display', vAd + vA);
    setT('cont_vis_cias_display', vCi + vC);
    setT('cont_total', mAd + mCi + vAd + vA + vCi + vC);
    
    // Atualiza o Display da Porcentagem
    const displayPerc = document.getElementById('cont_percentual_display');
    if (displayPerc) {
        displayPerc.innerText = `${emojiCor} ${percentual}%`;
    }
}

// ==========================================
// 7. MÓDULO ADMINISTRATIVO
// ==========================================

// --- NOVA FUNÇÃO: RESET DE SENHA ---
async function solicitarNovaSenha(idUsuario, nomeUsuario) {
    const userLogado = verificarAcesso();
    const nivel = (userLogado?.permissao || userLogado?.nivel || "").toLowerCase();
    
    if (nivel !== 'admin' && nivel !== 'master') {
        alert("🚫 Acesso negado. Apenas Administradores podem alterar senhas.");
        return;
    }

    const novaSenha = prompt(`Digite a nova senha para o usuário: ${nomeUsuario.toUpperCase()}`);
    if (novaSenha === null) return; 
    
    if (novaSenha.trim().length < 4) {
        alert("⚠️ A senha deve ter pelo menos 4 caracteres.");
        return;
    }

    try {
        const { error } = await _supabase
            .from('usuarios')
            .update({ senha: novaSenha.trim() })
            .eq('id', idUsuario);

        if (error) throw error;
        alert(`✅ Senha de ${nomeUsuario} alterada com sucesso!`);
    } catch (err) {
        console.error(err);
        alert("❌ Erro ao atualizar senha.");
    }
}

async function renderizarGrupos() {
    const corpo = document.getElementById('corpoTabelaGrupos');
    if (!corpo) return;
    try {
        const { data, error } = await _supabase.from('grupos').select('*').order('nome');
        if (error) throw error;
        corpo.innerHTML = data.map(g => `
            <tr>
                <td>${g.nome}</td>
                <td style="text-align:center;">
                    <button onclick="deletarGrupo('${g.id}')" style="background:none; border:none; cursor:pointer;" title="Excluir Grupo">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (err) { console.error(err); }
}

async function deletarGrupo(id) {
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();
    if (nivel !== 'admin' && nivel !== 'master') {
        alert("❌ Ação restrita a Administradores.");
        return;
    }
    if (!confirm("Excluir este grupo permanentemente?")) return;
    try {
        const { error } = await _supabase.from('grupos').delete().eq('id', id);
        if (error) throw error;
        alert("✅ Grupo excluído!");
        renderizarGrupos();
    } catch (err) { alert("Erro ao excluir grupo."); }
}

async function renderizarUsuarios() {
    const corpo = document.getElementById('corpoTabelaUsuarios');
    if (!corpo) return;
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();
    if (nivel !== 'admin' && nivel !== 'master') {
        corpo.innerHTML = '<tr><td colspan="4">Acesso Negado</td></tr>';
        return;
    }
    try {
        const { data, error } = await _supabase.from('usuarios').select('*').order('login');
        if (error) throw error;
        corpo.innerHTML = data.map(u => `
            <tr>
                <td>${u.login}</td>
                <td>${u.permissao}</td>
                <td>${u.grupo_vinculado || 'Todos'}</td>
                <td style="text-align:center;">
                    <button onclick="solicitarNovaSenha('${u.id}', '${u.login}')" style="background:none; border:none; cursor:pointer; margin-right:10px;" title="Alterar Senha">🔑</button>
                    <button onclick="deletarUsuario('${u.id}')" style="background:none; border:none; cursor:pointer;" title="Remover Usuário">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (err) { console.error(err); }
}

async function deletarUsuario(id) {
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();
    if (nivel !== 'admin' && nivel !== 'master') {
        alert("❌ Ação restrita a Administradores.");
        return;
    }
    if (!confirm("Deseja realmente remover o acesso deste usuário?")) return;
    try {
        const { error } = await _supabase.from('usuarios').delete().eq('id', id);
        if (error) throw error;
        alert("✅ Usuário removido!");
        renderizarUsuarios();
    } catch (err) { alert("Erro ao remover usuário."); }
}

async function carregarGruposNoSelect() {
    const selectUsuarios = document.getElementById('grupo_vinculado');
    const selectMembros = document.getElementById('grupo');
    if (!selectUsuarios && !selectMembros) return;
    try {
        const { data, error } = await _supabase.from('grupos').select('nome').order('nome');
        if (error || !data) return;
        const optionsHtml = data.map(g => `<option value="${g.nome}">${g.nome}</option>`).join('');
        if (selectUsuarios) selectUsuarios.innerHTML = '<option value="">Todos (Admin)</option>' + optionsHtml;
        if (selectMembros) selectMembros.innerHTML = '<option value="">Selecione o Grupo</option>' + optionsHtml;
    } catch (err) { console.error("Erro ao carregar grupos:", err); }
}

async function criarUsuario(dados) {
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();
    if (nivel !== 'admin' && nivel !== 'master') {
        alert("❌ Sem permissão.");
        return false;
    }
    try {
        const { error } = await _supabase.from('usuarios').insert([dados]);
        if (error) throw error;
        alert("✅ Usuário criado!");
        return true;
    } catch (err) { alert("❌ Erro ao criar usuário."); return false; }
}

// ==========================================
// 8. INTERFACE (APOSENTADO - AGORA USA O MÓDULO 15)
// ==========================================
function ajustarInterfacePorPerfil() {
    // Esta função antiga foi desativada para não conflitar com o Módulo 15.
    console.log("Sistema utilizando controle dinâmico do Módulo 15.");
}

// ==========================================
// 9. RELATÓRIOS E ANIVERSARIANTES
// ==========================================
async function gerarRelatorio() {
    const dataFiltro = document.getElementById('filtroData').value;
    const corpoRelatorio = document.getElementById('corpoRelatorio');
    const resumo = document.getElementById('resumoCards');
    if (!dataFiltro || !corpoRelatorio) return;

    try {
        const { data: membros } = await _supabase.from('membros').select('id, nome, grupo, situacao');
        const { data: presencas } = await _supabase.from('presencas').select('membro_id').eq('data_culto', dataFiltro).eq('presenca', true);
        const idsPresentes = (presencas || []).map(p => p.membro_id);
        let pres = 0, aus = 0;

        corpoRelatorio.innerHTML = membros.map(m => {
            const esta = idsPresentes.includes(m.id);
            esta ? pres++ : aus++;
            return `<tr style="border-left: 5px solid ${esta ? '#2ed573' : '#ff4757'}">
                <td>${m.nome}</td>
                <td>${esta ? '✅ Presente' : '⚠️ Ausente'}</td>
                <td>${!esta ? `<button class="btn-whatsapp" onclick="contatarMembro('${m.nome}')">📱 Cuidar</button>` : '---'}</td>
            </tr>`;
        }).join('');
        resumo.innerHTML = `<div class="card-resumo"><h3>${pres}</h3><p>Presentes</p></div><div class="card-resumo" style="color:#ff4757"><h3>${aus}</h3><p>Ausentes</p></div>`;
    } catch (err) { console.error(err); }
}
// ==========================================
// 10. INICIALIZAÇÃO AUTOMÁTICA
// ==========================================

// ==========================================
// 11. CIAs (SALVAR / ATUALIZAR)
// ==========================================
async function salvarEventoEspecial() {
    const data_evento = document.getElementById('data_especial').value;
    const local = document.getElementById('local_evento').value.trim();
    const descricao = document.getElementById('desc_evento').value.trim();
    
    // Mudamos o alerta para ser mais amigável conforme o novo foco
    if (!data_evento || !local || !descricao) {
        return alert("⚠️ Por favor, informe a Data, o Local e a Descrição (ex: Crianças).");
    }

    const dados = {
        data_evento, 
        local_evento: local,
        descricao,
        m_varoes: parseInt(document.getElementById('val_membro_Varões').innerText) || 0,
        m_senhoras: parseInt(document.getElementById('val_membro_Senhoras').innerText) || 0,
        m_jovens: parseInt(document.getElementById('val_membro_Jovens').innerText) || 0,
        m_adolescentes: parseInt(document.getElementById('val_membro_Adolescentes').innerText) || 0,
        m_intermediarios: parseInt(document.getElementById('val_membro_Intermediários').innerText) || 0,
        m_criancas: parseInt(document.getElementById('val_membro_Crianças').innerText) || 0,
        m_colo: parseInt(document.getElementById('val_membro_Crianças de Colo').innerText) || 0,
        v_varoes: parseInt(document.getElementById('val_vis_Varões').innerText) || 0,
        v_senhoras: parseInt(document.getElementById('val_vis_Senhoras').innerText) || 0,
        v_jovens: parseInt(document.getElementById('val_vis_Jovens').innerText) || 0,
        v_adolescentes: parseInt(document.getElementById('val_vis_Adolescentes').innerText) || 0,
        v_intermediarios: parseInt(document.getElementById('val_vis_Intermediários').innerText) || 0,
        v_criancas: parseInt(document.getElementById('val_vis_Crianças').innerText) || 0,
        v_colo: parseInt(document.getElementById('val_vis_Crianças de Colo').innerText) || 0
    };

    // Pega o ID caso seja uma edição para não duplicar
    const idEdicao = document.getElementById('id_evento_edicao')?.value;
    if (idEdicao) dados.id = idEdicao; 

    try {
        const { data, error } = await _supabase
            .from('eventos_especiais')
            .upsert([dados])
            .select();

        if (error) throw error;

        // "Carimbamos" o ID na página para as próximas clicadas serem atualizações
        if (data && data[0].id) {
            if (typeof garantirCampoEdicao === "function") {
                garantirCampoEdicao(data[0].id);
            }
        }

        alert(idEdicao ? "✅ Informações atualizadas com sucesso!" : "✅ Informações salvas com sucesso!");
    } catch (err) { 
        console.error("Erro Supabase:", err);
        alert("❌ Erro ao salvar."); 
    }
}

function gerarWhatsEspecial() {
    const nomeIgreja = "ICM - Dona Augusta";
    const local = document.getElementById('local_evento').value.trim() || "Não selecionado";
    const desc = document.getElementById('desc_evento').value.trim() || "CIAs";
    const dataRaw = document.getElementById('data_especial').value;
    const dataFmt = dataRaw ? dataRaw.split('-').reverse().join('/') : "--/--/----";

    const obterListaCompleta = (prefixo) => {
        const cats = ["Varões", "Senhoras", "Jovens", "Adolescentes", "Intermediários", "Crianças", "Crianças de Colo"];
        let lista = ""; 
        let total = 0;
        cats.forEach(c => {
            const val = parseInt(document.getElementById(`val_${prefixo}_${c}`).innerText) || 0;
            // Mantendo todos os campos visíveis (inclusive os zerados) para conferência total
            lista += `   • ${c}: ${val}\n`;
            total += val;
        });
        return { lista, total };
    };

    const membros = obterListaCompleta('membro');
    const visitantes = obterListaCompleta('vis');

    // Montagem da Mensagem - Estilo CIAs
    let msg = `*📊 RELATÓRIO CIAs - ${nomeIgreja.toUpperCase()}*\n\n`;
    msg += `📅 *DATA:* ${dataFmt}\n`;
    msg += `📍 *LOCAL:* ${local}\n`;
    msg += `📝 *GRUPO:* ${desc.toUpperCase()}\n\n`;
    msg += `--------------------------------\n\n`;
    msg += `*👥 MEMBROS: (${membros.total})*\n${membros.lista}`;
    msg += `\n*🌟 VISITANTES: (${visitantes.total})*\n${visitantes.lista}`;
    msg += `\n*📉 TOTAL GERAL: ${membros.total + visitantes.total}*\n\n`;
    msg += `_A Paz do Senhor Jesus!_`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

// ==========================================
// 12. MÓDULO DE PASTOREIO
// ==========================================
async function carregarListaCuidado() {
    const listaCorpo = document.getElementById('corpoCuidado');
    if (!listaCorpo) return;
    const user = JSON.parse(localStorage.getItem('usuarioLogado')); 
    const nivel = (user?.permissao || "").toLowerCase();
    
    if (nivel !== 'pastor' && nivel !== 'admin' && nivel !== 'master') {
        if (document.getElementById('secaoCuidado')) document.getElementById('secaoCuidado').style.display = 'none';
        return;
    }

    try {
        const { data: membros, error: errM } = await _supabase.from('membros').select('id, nome, categoria, ultimo_cuidado').eq('status_registro', 'Ativo');
        const { data: presencas } = await _supabase.from('presencas').select('membro_id, data_culto').eq('presenca', true).order('data_culto', { ascending: false });
        if (errM) throw errM;

        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        let html = "";

        membros.forEach(m => {
            const ultPres = presencas.find(p => p.membro_id === m.id);
            let dataRef = ultPres ? new Date(ultPres.data_culto + "T00:00:00") : new Date(2000, 0, 1);
            if (m.ultimo_cuidado) {
                const dataCuidado = new Date(m.ultimo_cuidado + "T00:00:00");
                if (dataCuidado > dataRef) dataRef = dataCuidado;
            }
            const diffDias = Math.floor((hoje - dataRef) / (1000 * 60 * 60 * 24));
            const cat = (m.categoria || "").toLowerCase();
            const limite = (cat.includes('idoso') || cat.includes('idosa')) ? 30 : 7;

            if (diffDias > limite) {
                html += `<tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;"><strong>${m.nome}</strong><br><small>${m.categoria}</small></td>
                    <td style="padding: 10px;"><span class="badge-alerta">${diffDias} dias</span></td>
                    <td style="padding: 10px; display: flex; gap: 8px;">
                        <button onclick="marcarComoResolvido('${m.id}')" style="background:#3498db; color:white; border:none; border-radius:4px; padding:5px 10px;">✅</button>
                    </td>
                </tr>`;
            }
        });
        listaCorpo.innerHTML = html || "<tr><td colspan='3' style='text-align:center;'>✅ Todos em dia!</td></tr>";
    } catch (error) { console.error(error); }
}

async function marcarComoResolvido(idMembro) {
    if (!confirm("Registrar cuidado hoje?")) return;
    const hoje = new Date().toISOString().split('T')[0];
    try {
        await _supabase.from('membros').update({ ultimo_cuidado: hoje }).eq('id', idMembro);
        alert("📖 Cuidado registrado!");
        carregarListaCuidado();
    } catch (err) { alert("Erro ao salvar."); }
}

// ==========================================
// RELATÓRIO DE ANIVERSARIANTES (VERSÃO ÚNICA)
// ==========================================
async function gerarRelatorioAniversariantes() {
    const corpoTabela = document.getElementById('corpoTabelaAniversarios');
    const msgVazia = document.getElementById('msgVazia');
    const selectMes = document.getElementById('filtroMes');
    const filtroSexo = document.getElementById('filtroSexo').value;

    if (!corpoTabela) return;

    corpoTabela.innerHTML = '<tr><td colspan="3" style="text-align:center;">Buscando...</td></tr>';
    msgVazia.style.display = 'none';

    const mesEscrito = selectMes.options[selectMes.selectedIndex].text;

    try {
        // Busca simples: apenas membros ativos do mês selecionado
        let query = _supabase
            .from('membros')
            .select('nome, sexo, dia, mes')
            .eq('status_registro', 'Ativo')
            .eq('mes', mesEscrito);

        if (filtroSexo !== 'Todos') {
            query = query.eq('sexo', filtroSexo);
        }

        const { data, error } = await query;
        if (error) throw error;

        // FILTRAGEM MANUAL (O pulo do gato): 
        // Remove quem não tem dia ou mês preenchido (os temporários)
        const listaLimpa = data.filter(m => {
            return m.dia && m.dia.toString().trim() !== "" && 
                   m.mes && m.mes.toString().trim() !== "";
        });

        if (listaLimpa.length === 0) {
            corpoTabela.innerHTML = '';
            msgVazia.style.display = 'block';
            return;
        }

        // Ordenar por dia (numérico)
        listaLimpa.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));

        corpoTabela.innerHTML = '';
        listaLimpa.forEach(m => {
            const icone = m.sexo === 'Masculino' ? '👔' : '💐';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">${m.dia}</td>
                <td>${m.nome}</td>
                <td style="text-align: center;">${icone}</td>
            `;
            corpoTabela.appendChild(tr);
        });

    } catch (err) {
        console.error("Erro ao gerar relatório:", err);
        corpoTabela.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center;">Erro ao carregar dados.</td></tr>';
    }
}

// ==========================================
// FUNÇÃO DE ENVIO PARA WHATSAPP
// ==========================================
function enviarAniversariantesZap() {
    const selectMes = document.getElementById('filtroMes');
    if (!selectMes) return;
    
    const mesNome = selectMes.options[selectMes.selectedIndex].text;
    const linhas = document.querySelectorAll('#corpoTabelaAniversarios tr');
    
    // Verifica se a tabela está vazia ou ainda carregando
    if (linhas.length === 0 || linhas[0].innerText.includes('Buscando') || linhas[0].innerText.includes('Nenhum')) {
        alert("Não há aniversariantes na lista para enviar!");
        return;
    }

    let texto = `*🎂 ANIVERSARIANTES DE ${mesNome.toUpperCase()}*\n\n`;

    linhas.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        if (colunas.length >= 3) {
            const dia = colunas[0].innerText.trim();
            const nome = colunas[1].innerText.trim();
            const opcao = colunas[2].innerText.trim(); // Pega o 👔 ou 💐
            texto += `*Dia ${dia}* - ${nome} ${opcao}\n`;
        }
    });

    texto += `\n_A Paz do Senhor Jesus!_`;

    // Tenta abrir o WhatsApp
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    
    // Pequeno truque para garantir que o navegador não bloqueie o pop-up
    const win = window.open(url, '_blank');
    if (win) {
        win.focus();
    } else {
        alert('Por favor, permita pop-ups para abrir o WhatsApp.');
    }
}

// ==========================================
// 13. CONSULTAR HISTÓRICO E BOTÃO OLHO
// ==========================================
async function carregarHistoricoEventos() {
    const corpoTabela = document.getElementById('corpoHistoricoEventos');
    if (!corpoTabela) return;
    corpoTabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Buscando eventos...</td></tr>';

    try {
        const { data, error } = await _supabase.from('eventos_especiais').select('*').order('data_evento', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            corpoTabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum evento encontrado.</td></tr>';
            return;
        }
        corpoTabela.innerHTML = '';
        data.forEach(ev => {
            const dataFmt = ev.data_evento.split('-').reverse().join('/');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">${dataFmt}</td>
                <td style="font-weight: bold;">${ev.descricao}</td>
                <td>${ev.local_evento || '---'}</td>
                <td style="text-align: center;">
                    <button onclick="verDetalhesEvento('${ev.id}')" class="btn-detalhes">👁️</button>
                </td>
            `;
            corpoTabela.appendChild(tr);
        });
    } catch (err) { corpoTabela.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Erro ao carregar.</td></tr>'; }
}

function verDetalhesEvento(id) {
    // Redireciona para a página de eventos levando o ID para carregar os dados
    window.location.href = `eventos.html?id=${id}`;
}

// ==========================================
// 14. VER DETALHES OU REENVIAR EVENTO
// ==========================================
async function verDetalhesEvento(id) {
    try {
        // Busca o evento específico pelo ID
        const { data, error } = await _supabase
            .from('eventos_especiais')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Montando o resumo dos números para mostrar na tela
        const dataFmt = data.data_evento.split('-').reverse().join('/');
        
        // Somando Totais (ajustado para os nomes do seu banco)
        const totalM = (data.m_varoes || 0) + (data.m_senhoras || 0) + (data.m_jovens || 0) + 
                       (data.m_adolescentes || 0) + (data.m_intermediarios || 0) + 
                       (data.m_criancas || 0) + (data.m_colo || 0);
                       
        const totalV = (data.v_varoes || 0) + (data.v_senhoras || 0) + (data.v_jovens || 0) + 
                       (data.v_adolescentes || 0) + (data.v_intermediarios || 0) + 
                       (data.v_criancas || 0) + (data.v_colo || 0);

        // Um alerta simples com o resumo (estilo MacGyver: funcional e direto)
        const resumo = `
📊 EVENTO: ${data.descricao}
📍 LOCAL: ${data.local_evento || 'Não informado'}
📅 DATA: ${dataFmt}

👥 Membros: ${totalM}
🤝 Visitantes: ${totalV}
📈 Total Geral: ${totalM + totalV}

Deseja reenviar este relatório pelo WhatsApp?
        `;

        if (confirm(resumo)) {
            // Se o usuário clicar em OK, chamamos a lógica de enviar WhatsApp
            // Podemos adaptar a função gerarWhatsEspecial para aceitar dados prontos
            prepararReenvioWhats(data);
        }

    } catch (err) {
        console.error("Erro ao detalhar:", err);
        alert("❌ Não foi possível carregar os detalhes deste evento.");
    }
}

// Função auxiliar para montar a mensagem com os dados que vieram do banco
function prepararReenvioWhats(ev) {
    const dataFmt = ev.data_evento.split('-').reverse().join('/');
    
    // Lista de categorias para iterar (exatamente como no seu banco)
    const categorias = [
        { label: "Varões", m: ev.m_varoes, v: ev.v_varoes },
        { label: "Senhoras", m: ev.m_senhoras, v: ev.v_senhoras },
        { label: "Jovens", m: ev.m_jovens, v: ev.v_jovens },
        { label: "Adolescentes", m: ev.m_adolescentes, v: ev.v_adolescentes },
        { label: "Intermediários", m: ev.m_intermediarios, v: ev.v_intermediarios },
        { label: "Crianças", m: ev.m_criancas, v: ev.v_criancas },
        { label: "Crianças de Colo", m: ev.m_colo, v: ev.v_colo }
    ];

    let textoM = ""; let textoV = "";
    let somaM = 0; let somaV = 0;

    categorias.forEach(c => {
        if (c.m > 0) { textoM += `   • ${c.label}: ${c.m}\n`; somaM += c.m; }
        if (c.v > 0) { textoV += `   • ${c.label}: ${c.v}\n`; somaV += c.v; }
    });

    let msg = `*📊 RELATÓRIO DE EVENTO - ICM DONA AUGUSTA*\n\n`;
    msg += `📅 *DATA:* ${dataFmt}\n`;
    msg += `📍 *LOCAL:* ${ev.local_evento}\n`;
    msg += `📝 *EVENTO:* ${ev.descricao.toUpperCase()}\n\n`;
    msg += `--- \n\n`;
    msg += `*👥 MEMBROS: (${somaM})*\n${textoM || "   _Nenhum_\n"}`;
    msg += `\n*🌟 VISITANTES: (${somaV})*\n${textoV || "   _Nenhum_\n"}`;
    msg += `\n*📉 TOTAL GERAL: ${somaM + somaV}*\n\n`;
    msg += `_A Paz do Senhor Jesus!_`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

// ==========================================
// 15. CONTROLE DE VISIBILIDADE DINÂMICO
// ==========================================
async function ajustarInterfacePorPerfil() {
    const usuarioJson = localStorage.getItem('usuarioLogado');
    const user = usuarioJson ? JSON.parse(usuarioJson) : null;
    if (!user) return;

    // Pegamos o nível (ex: coord, apoio, secre)
    const nivel = (user.permissao || user.nivel || "").toLowerCase();

    // 1. BUSCA AS PERMISSÕES NO SUPABASE
    const { data: p, error } = await _supabase
        .from('niveis_acesso')
        .select('*')
        .eq('nivel_nome', nivel)
        .single();

    if (error || !p) {
        console.warn("Usando regras padrão pois não achei o nível no banco.");
        return; // Se der erro, ele mantém como está no HTML
    }

// 2. MAPEAMENTO (ID do seu HTML : Coluna do Banco)
    const mapa = {
        'btnChamada': p.p_chamada,
        'btnEventos': p.p_cias,         // No HTML é btnEventos, no banco é p_cias
        'idBtnCadastro': p.p_cadastro,   // Mantive o "id" no início como no seu HTML
        'btnLista': p.p_membros,
        'btnAniversariantes': p.p_niver,
        'btnLocais': p.p_igrejas,       // No HTML é btnLocais, no banco é p_igrejas
        'btnGrupos': p.p_grupos,
        'btnUsuarios': p.p_usuarios,
        'btnPermissoes': p.p_permissoes,
        'btnRelatorios': p.p_relatorios  // Adicionei este que estava no seu Modulo 8
    };

    // 3. APLICA A VISIBILIDADE NOS BOTÕES INTERNOS
    for (const id in mapa) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = mapa[id] ? 'flex' : 'none';
        }
    }

    // 4. LÓGICA DOS "MESTRES" (SEÇÕES)
    // Se todos os botões de uma seção sumirem, podemos esconder o título/mestre dela
    const mestreAdmin = document.getElementById('btn-mestre-admin');
    if (mestreAdmin) {
        // Só mostra o menu Admin se tiver permissão de Usuários OU Permissões
        mestreAdmin.style.display = (p.p_usuarios || p.p_permissoes) ? 'block' : 'none';
    }
    
    // Você pode repetir a lógica acima para os outros "Mestres" se desejar
}

// ==========================================
// 16. INICIALIZAÇÃO DA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Carregado. Iniciando verificações...");

    const user = verificarAcesso(); 
    const urlAtual = window.location.href;
    
    // 1. Lógica para a Página de Login
    const formLogin = document.getElementById('loginForm');
    if (formLogin) {
        console.log("Formulário de login detetado.");
        formLogin.addEventListener('submit', realizarLogin);
    }

    // 2. Lógica para páginas internas
    if (user) {
        console.log("Usuário logado:", user.login);
        const elBoasVindas = document.getElementById('boasVindas');
        if (elBoasVindas) {
            elBoasVindas.innerText = `Olá, ${user.login}!`;
        }

        // Executa o Módulo 15
        if (typeof ajustarInterfacePorPerfil === 'function') {
            ajustarInterfacePorPerfil();
        }
    }
});