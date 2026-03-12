// ==========================================
// 1. CONFIGURAÇÃO E CONEXÃO
// ==========================================
const SUPABASE_URL = 'https://pxjczmjhzopfxwlmpjfv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4amN6bWpoem9wZnh3bG1wamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjUzMjYsImV4cCI6MjA4NzEwMTMyNn0.OfekQPuYUwsZu5X9_lPDGBbVTZYBvAQ5KdiFx3TFOCY';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. SEGURANÇA E ACESSO
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

    const urlAtual = window.location.href;
    const nivel = (usuario.nivel || "").toLowerCase();

    if (nivel === 'livre') {
        const proibidas = ['dashboard.html', 'cadastro-membro.html', 'admin-usuarios.html', 'admin-grupos.html', 'chamada.html', 'lista-membros.html', 'relatorio-presenca.html', 'relatorio-aniversariantes.html'];
        if (proibidas.some(p => urlAtual.includes(p))) {
            window.location.href = 'livre.html';
            return usuario;
        }
    }

    if (nivel === 'user' || nivel === 'apoio' || nivel === 'coordenadora') {
        const adminPaginas = ['admin-usuarios.html', 'admin-grupos.html'];
        if (adminPaginas.some(p => urlAtual.includes(p))) {
            window.location.href = 'dashboard.html';
            return usuario;
        }
    }
    return usuario;
}

async function realizarLogin(usuarioDigitado, senhaDigitada) {
    try {
        const { data, error } = await _supabase
            .from('usuarios')
            .select('*')
            .ilike('login', usuarioDigitado.trim()) 
            .eq('senha', senhaDigitada.trim())
            .single();

        if (error || !data) {
            alert('❌ Login falhou! Usuário ou senha incorretos.');
            return;
        }

        localStorage.setItem('usuarioLogado', JSON.stringify({
            nome: data.login.toLowerCase(),
            login: data.login.toLowerCase(),
            nivel: data.permissao.toLowerCase(),
            permissao: data.permissao.toLowerCase(),
            grupo: data.grupo_vinculado
        }));

        if (data.permissao.toLowerCase() === 'livre') {
            window.location.href = 'pages/livre.html';
        } else {
            window.location.href = 'pages/dashboard.html';
        }
    } catch (err) {
        console.error('Erro de Login:', err);
        alert('⚠️ Erro ao conectar.');
    }
}

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = '../index.html';
}

// ==========================================
// 3. MÓDULO DE MEMBROS
// ==========================================
async function renderizarListaMembros() {
    const corpoTabela = document.getElementById('corpoTabelaMembros');
    if (!corpoTabela) return;

    const user = verificarAcesso();
    if (!user) return;

    const nivel = (user.permissao || user.nivel || "").toLowerCase();
    const ehPrivilegiado = (nivel === 'admin' || nivel === 'master' || nivel === 'coordenadora');
    const ehAdminMaster = (nivel === 'admin' || nivel === 'master');

    try {
        let consulta = _supabase.from('membros').select('*').eq('status_registro', 'Ativo');
        if (!ehPrivilegiado) consulta = consulta.eq('grupo', user.grupo); 

        const { data, error } = await consulta.order('nome', { ascending: true });
        if (error) throw error;

        if (!data || data.length === 0) {
            corpoTabela.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Nenhum membro encontrado.</td></tr>";
            return;
        }

        corpoTabela.innerHTML = data.map(m => `
            <tr>
                <td>${m.nome} ${m.apelido ? `<br><small>(${m.apelido})</small>` : ''}</td> 
                <td>${m.categoria}</td>
                <td>${m.grupo || 'Sem Grupo'}</td>
                <td>${m.situacao}</td>
                <td style="text-align:center;">
                    ${ehAdminMaster ? `
                        <button onclick="prepararEdicao('${m.id}')" style="background:none; border:none; cursor:pointer;">✏️</button>
                        <button onclick="excluirMembro('${m.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
                    ` : (ehPrivilegiado ? '👁️' : '🔒')}
                </td>
            </tr>`).join('');
    } catch (err) { 
        console.error("Erro:", err);
        corpoTabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar os dados.</td></tr>"; 
    }
}

async function cadastrarMembro(dados) {
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();
    if (nivel !== 'admin' && nivel !== 'master' && nivel !== 'coordenadora' && nivel !== 'pastor') {
        alert("❌ Sem permissão.");
        return false;
    }
    try {
        const { error } = await _supabase.from('membros').insert([{
            nome: dados.nome, apelido: dados.apelido, funcao: dados.funcao,
            situacao: dados.situacao, categoria: dados.categoria, sexo: dados.sexo,
            eh_idoso: dados.eh_idoso, grupo: dados.grupo, dia: parseInt(dados.niver_dia) || 0, 
            mes: dados.niver_mes, familia_id: dados.familia_vinculo || crypto.randomUUID(), 
            status_registro: 'Ativo'
        }]);
        if (error) throw error;
        alert("✅ Cadastrado!");
        return true; 
    } catch (err) { alert("Erro: " + err.message); return false; }
}

async function atualizarMembro(id, dados) {
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();
    if (nivel !== 'admin' && nivel !== 'master' && nivel !== 'coordenadora' && nivel !== 'pastor') return false;
    try {
        const { error } = await _supabase.from('membros').update({
            nome: dados.nome, apelido: dados.apelido, funcao: dados.funcao,
            situacao: dados.situacao, categoria: dados.categoria, sexo: dados.sexo,
            eh_idoso: dados.eh_idoso, grupo: dados.grupo, dia: parseInt(dados.niver_dia) || 0,
            mes: dados.niver_mes, familia_id: dados.familia_vinculo || crypto.randomUUID()
        }).eq('id', id);
        if (error) throw error;
        alert("✅ Atualizado!");
        return true;
    } catch (err) { alert("Erro: " + err.message); return false; }
}

async function carregarMembrosParaVinculo() {
    const selectFamilia = document.getElementById('vinculo_familia');
    if (!selectFamilia) return;
    try {
        const { data, error } = await _supabase.from('membros').select('nome, familia_id').eq('status_registro', 'Ativo').order('nome');
        if (error) throw error;
        let html = '<option value="">Ninguém (Membro Individual / Novo Responsável)</option>';
        if (data) html += data.map(m => `<option value="${m.familia_id}">${m.nome}</option>`).join('');
        selectFamilia.innerHTML = html;
    } catch (err) { console.error(err); }
}

function prepararEdicao(id) {
    localStorage.setItem('idMembroEdicao', id);
    window.location.href = 'cadastro-membro.html';
}

async function excluirMembro(id) {
    const user = verificarAcesso();
    if (!confirm("Deseja excluir?")) return;
    try {
        const { error } = await _supabase.from('membros').delete().eq('id', id);
        if (error) throw error;
        alert("✅ Removido!");
        renderizarListaMembros();
    } catch (err) { alert(err.message); }
}

// ==========================================
// 4. MÓDULO DE CHAMADA (PRESENÇA) - VERSÃO ESPAÇO OTIMIZADO
// ==========================================

async function renderizarListaChamada() {
    const container = document.getElementById('listaChamada');
    const dataSelecionada = document.getElementById('data_chamada')?.value;
    const eventoSelecionado = document.getElementById('tipo_evento')?.value;
    
    // 1. Localizamos o título para injetar os nomes lá em cima
    const areaTitulo = document.querySelector('.titulo-chamada-container'); 
    // Nota: Se você não tiver essa classe, pode ajustar o seletor acima.

    if (!container) return;

    try {
        const { data: membros, error: errM } = await _supabase.from('membros')
            .select('id, nome, apelido, grupo, categoria, situacao') 
            .eq('status_registro', 'Ativo').order('nome');
        
        if (errM) throw errM;

        let jaRegistrados = [];
        if (dataSelecionada && eventoSelecionado) {
            const { data: pres } = await _supabase.from('presencas')
                .select('membro_id, status, presenca')
                .eq('data_culto', dataSelecionada)
                .eq('tipo_evento', eventoSelecionado);
            jaRegistrados = pres || [];
        }

        // 2. Limpamos o container para a nova lista
        container.innerHTML = "";

        // 3. Geramos os Cards um por um
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
        
        atualizarContadores();
    } catch (err) { console.error(err); }
}

function selecionarStatus(membroId, novoStatus) {
    const card = document.querySelector(`.card-chamada[data-id="${membroId}"]`);
    const btnP = document.getElementById(`btn_P_${membroId}`);
    const btnI = document.getElementById(`btn_I_${membroId}`);
    const btnM = document.getElementById(`btn_M_${membroId}`);
    const statusAnterior = card.getAttribute('data-status');

    // RESET: Volta ao quadradinho no Presente e ícones nos outros
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
    atualizarContadores();
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
                const valor = m.nome; 
                const label = m.apelido ? `${m.nome} (${m.apelido})` : m.nome;
                return `<option value="${valor}">${m.funcao} - ${label}</option>`;
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

// SOLDA DOS BOTÕES + e - DE VISITANTES
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
        const dataFmt = dataInput ? dataInput.split('-').reverse().join('/') : "--/--/--";
        const total = document.getElementById('cont_total').innerText;
        
        const pNome = (id) => {
            const val = document.getElementById(id).value;
            return val ? val.split(" ")[0] : "---";
        };

        let msg = `*ICM - Dona Augusta*\n*📊 RESUMO - ${dataFmt}*\n\n`;
        msg += `*⭐ TOTAL GERAL: ${total}*\n\n`;
        msg += `🎤 *Pregador:* ${document.getElementById('pregador_funcao').value} ${pNome('pregador_nome')}\n`;
        msg += `🎶 *Louvor:* ${document.getElementById('louvor_funcao').value} ${pNome('louvor_nome')}\n`;
        msg += `🚪 *Portão:* ${document.getElementById('portao_funcao').value} ${pNome('portao_nome')}\n`;
        msg += `📖 *Texto:* ${document.getElementById('texto_biblico').value || "---"}\n`;
        
        const obs = document.getElementById('observacoes_culto').value;
        if(obs) msg += `\n📝 *Obs:* ${obs}`;

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (e) {
        alert("Erro ao gerar resumo. Verifique se os campos estão preenchidos.");
    }
}

async function salvarChamada() {
    const btn = document.getElementById('btnFinalizar');
    const textoOriginal = btn.innerText;
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

        // Salva as presenças
        if (registros.length > 0) {
            await _supabase.from('presencas').upsert(registros, { onConflict: 'membro_id, data_culto, tipo_evento' });
        }
        // Salva a ata/resumo
        await _supabase.from('resumo_culto').upsert([resumo], { onConflict: 'data_culto, tipo_evento, grupo' });

        alert("✅ Dados sincronizados com sucesso!");
    } catch (e) { 
        console.error(e);
        alert("Erro ao salvar no banco de dados."); 
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
}

// ==========================================
// 6. RENDERIZAÇÃO E PLACAR
// ==========================================

async function renderizarListaChamada() {
    const listaContainer = document.getElementById('listaChamada');
    listaContainer.innerHTML = "<p style='text-align:center; padding: 20px;'>Buscando no banco...</p>";

    try {
        const { data: membros, error } = await _supabase.from('membros')
            .select('*')
            .eq('status_registro', 'Ativo')
            .order('nome', { ascending: true });

        if (error) throw error;
        listaContainer.innerHTML = ""; 

        membros.forEach(m => {
            const card = document.createElement('div');
            card.style = "display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; transition: background 0.3s;";
            card.className = 'card-chamada';
            card.setAttribute('data-id', m.id);
            card.setAttribute('data-status', 'Faltou');
            card.setAttribute('data-categoria', m.categoria || "");
            card.setAttribute('data-situacao', m.situacao || "Membro");

            const nomePrincipal = m.apelido || m.nome;
            const nomeDoisTermos = obterNomeResumido(m.nome);
            const tagVis = m.situacao === 'Visitante' ? '<span style="color:red; font-weight:bold; font-size:0.7rem;">Vis. </span>' : '';

            card.innerHTML = `
                <div style="flex: 1;">
                    <strong style="display:block; font-size: 1rem; color: #333;">${nomePrincipal}</strong>
                    <small style="color: #888; font-size: 0.8rem;">${tagVis}(${nomeDoisTermos})</small>
                </div>
                <div class="botoes-status" style="display:flex; gap:12px; padding-right: 5px;">
                    <button type="button" onclick="marcarStatus(this, 'Presente')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; width:35px; filter: grayscale(1); opacity: 0.4;">✅</button>
                    <button type="button" onclick="marcarStatus(this, 'ICM')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; width:35px; filter: grayscale(1); opacity: 0.4;">🏠</button>
                    <button type="button" onclick="marcarStatus(this, 'Maanaim')" style="background:none; border:none; cursor:pointer; font-size:1.2rem; width:35px; filter: grayscale(1); opacity: 0.4;">⛰️</button>
                </div>
            `;
            listaContainer.appendChild(card);
        });
        
        await carregarDadosExistentes(); 
        await carregarSugestoesEFuncoes(); 
        
    } catch (err) { console.error(err); }
}

function marcarStatus(botao, novoStatus) {
    const card = botao.closest('.card-chamada');
    if (!card) return;

    const statusAtual = card.getAttribute('data-status');
    const statusFinal = (statusAtual === novoStatus) ? 'Faltou' : novoStatus;

    card.setAttribute('data-status', statusFinal);
    
    // Reseta visual dos botões
    card.querySelectorAll('.botoes-status button').forEach(btn => {
        btn.style.filter = 'grayscale(1)';
        btn.style.opacity = '0.4';
        btn.style.transform = 'scale(1)';
    });

    if (statusFinal !== 'Faltou') {
        // SEMPRE destaca o ✅ para indicar presença
        const btnCheck = card.querySelector('button[onclick*="Presente"]');
        if (btnCheck) {
            btnCheck.style.filter = 'none'; 
            btnCheck.style.opacity = '1';
            btnCheck.style.transform = 'scale(1.3)';
        }
        card.style.backgroundColor = '#f0f7ff';
    } else {
        card.style.backgroundColor = 'transparent';
    }

    atualizarContadores();
}

async function carregarDadosExistentes() {
    const dataCulto = document.getElementById('data_chamada').value;
    const tipoEvento = document.getElementById('tipo_evento').value;

    try {
        const { data: presencas } = await _supabase.from('presencas')
            .select('membro_id, status')
            .eq('data_culto', dataCulto)
            .eq('tipo_evento', tipoEvento);

        if (presencas) {
            presencas.forEach(p => {
                const card = document.querySelector(`.card-chamada[data-id="${p.membro_id}"]`);
                if (card) {
                    const emoji = p.status === 'Presente' ? '✅' : (p.status === 'ICM' ? '🏠' : '⛰️');
                    const btn = Array.from(card.querySelectorAll('button')).find(b => b.innerText === emoji);
                    if (btn) marcarStatus(btn, p.status);
                }
            });
        }

        const { data: resumo } = await _supabase.from('resumo_culto')
            .select('*').eq('data_culto', dataCulto).eq('tipo_evento', tipoEvento).maybeSingle();

        if (resumo) {
            document.getElementById('vis_adultos').value = resumo.vis_adultos || 0;
            document.getElementById('vis_cias').value = resumo.vis_cias || 0;
            document.getElementById('pregador_nome').value = resumo.pregador_nome || "";
            document.getElementById('pregador_funcao').value = resumo.pregador_funcao || "Membro";
            document.getElementById('texto_biblico').value = resumo.texto_biblico || "";
            document.getElementById('louvor_nome').value = resumo.louvor_nome || "";
            document.getElementById('louvor_funcao').value = resumo.louvor_funcao || "Membro";
            document.getElementById('portao_nome').value = resumo.portao_nome || "";
            document.getElementById('portao_funcao').value = resumo.portao_funcao || "Membro";
            document.getElementById('observacoes_culto').value = resumo.observacoes || "";
        }
        atualizarContadores();
    } catch (e) { console.error(e); }
}

function atualizarContadores() {
    let mAd = 0, mCi = 0, vAd = 0, vCi = 0;

    document.querySelectorAll('.card-chamada').forEach(card => {
        const status = card.getAttribute('data-status');
        
        // CONTA QUALQUER UM QUE NÃO SEJA "FALTOU"
        if (status !== 'Faltou') {
            const sit = card.getAttribute('data-situacao');
            const cat = (card.getAttribute('data-categoria') || "").toLowerCase();
            
            // Definição de CIAs: Criança, Intermediário, Adolescente
            const eCia = (cat.includes('crian') || cat.includes('interme') || cat.includes('adolesc'));

            if (sit === 'Visitante') {
                if (eCia) vCi++; else vAd++;
            } else {
                if (eCia) mCi++; else mAd++;
            }
        }
    });

    const vAdExtra = parseInt(document.getElementById('vis_adultos').value) || 0;
    const vCiExtra = parseInt(document.getElementById('vis_cias').value) || 0;

    document.getElementById('cont_membros_adultos').innerText = mAd;
    document.getElementById('cont_membros_cias').innerText = mCi;
    document.getElementById('cont_vis_adultos_display').innerText = vAd + vAdExtra;
    document.getElementById('cont_vis_cias_display').innerText = vCi + vCiExtra;
    document.getElementById('cont_total').innerText = mAd + mCi + vAd + vAdExtra + vCi + vCiExtra;
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
// 8. INTERFACE E PERMISSÕES (ATUALIZADO)
// ==========================================
function ajustarInterfacePorPerfil() {
    const user = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!user) return;
    const nivel = (user.permissao || user.nivel || "").toLowerCase(); 
    
    const b = {
        chamada: document.getElementById('btnChamada'),
        cadastro: document.getElementById('idBtnCadastro'),
        lista: document.getElementById('btnLista'),
        grupos: document.getElementById('btnGrupos'),
        usuarios: document.getElementById('btnUsuarios'),
        relatorios: document.getElementById('btnRelatorios'),
        aniversariantes: document.getElementById('btnAniversariantes')
    };

    // 1. ADMIN / MASTER / PASTOR (Vê tudo)
    if (nivel === 'admin' || nivel === 'master' || nivel === 'pastor') { 
        Object.values(b).forEach(el => { if(el) el.style.display = 'flex'; });
    } 
    // 2. COORDENADORA (Vê Lista e Aniversariantes)
    else if (nivel === 'coordenadora') {
        if (b.lista) b.lista.style.display = 'flex';
        if (b.aniversariantes) b.aniversariantes.style.display = 'flex';
        [b.chamada, b.cadastro, b.grupos, b.usuarios, b.relatorios].forEach(el => { if(el) el.style.display = 'none'; });
    }
    // 3. APOIO (Vê Chamada e Aniversariantes) - Ajustado conforme sua ideia
    else if (nivel === 'apoio') {
        if (b.chamada) b.chamada.style.display = 'flex';
        if (b.aniversariantes) b.aniversariantes.style.display = 'flex'; // Liberado para Apoio
        [b.cadastro, b.lista, b.relatorios, b.grupos, b.usuarios].forEach(el => { if(el) el.style.display = 'none'; });
    }
    // 4. USER (Vê Lista, Relatórios e Aniversariantes)
    else if (nivel === 'user') {
        if (b.lista) b.lista.style.display = 'flex';
        if (b.relatorios) b.relatorios.style.display = 'flex';
        if (b.aniversariantes) b.aniversariantes.style.display = 'flex'; // Liberado para User
        [b.chamada, b.cadastro, b.grupos, b.usuarios].forEach(el => { if(el) el.style.display = 'none'; });
    }
    // 5. LIVRE (Não vê nada do menu administrativo)
    else if (nivel === 'livre') {
        Object.values(b).forEach(el => { if(el) el.style.display = 'none'; });
    }
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
document.addEventListener('DOMContentLoaded', () => {
    const url = window.location.href;
    
    // Ajusta interface se a função existir
    if (typeof ajustarInterfacePorPerfil === 'function') ajustarInterfacePorPerfil();

    const formLogin = document.getElementById('loginForm');
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            realizarLogin(document.getElementById('usuario').value, document.getElementById('senha').value);
        });
    }

    // Gerenciamento de rotas
    if (url.includes('admin-usuarios.html')) { renderizarUsuarios(); carregarGruposNoSelect(); }
    if (url.includes('admin-grupos.html')) { renderizarGrupos(); }
    if (url.includes('lista-membros.html')) { renderizarListaMembros(); }
    
    // Na chamada.html, deixamos o carregarSugestoesMembros apenas para o delay do HTML
    if (url.includes('chamada.html')) { 
        renderizarListaChamada(); 
    }
    
    if (url.includes('cadastro-membro.html')) { carregarGruposNoSelect(); carregarMembrosParaVinculo(); }
});

// ==========================================
// 11. EVENTOS ESPECIAIS (SALVAR / ATUALIZAR)
// ==========================================
async function salvarEventoEspecial() {
    const data_evento = document.getElementById('data_especial').value;
    const local = document.getElementById('local_evento').value.trim();
    const descricao = document.getElementById('desc_evento').value.trim();
    
    if (!data_evento || !local || !descricao) {
        return alert("⚠️ Preencha Data, Local e Descrição do Evento.");
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

    // --- O Pulo do Gato para Edição (ID de Edição) ---
    const idEdicao = document.getElementById('id_evento_edicao')?.value;
    if (idEdicao) dados.id = idEdicao; 

    try {
        // Usamos UPSERT e .select() para capturar o ID caso seja um registro novo
        const { data, error } = await _supabase
            .from('eventos_especiais')
            .upsert([dados])
            .select();

        if (error) throw error;

        // Se for um novo registro, "carimbamos" o ID na página para os dados permanecerem editáveis
        if (data && data[0].id) {
            if (typeof garantirCampoEdicao === "function") {
                garantirCampoEdicao(data[0].id);
            }
        }

        alert(idEdicao ? "✅ Evento atualizado com sucesso!" : "✅ Evento salvo com sucesso!");
        // REMOVIDO: qualquer recarregamento de página para manter os dados na tela
    } catch (err) { 
        console.error("Erro Supabase:", err);
        alert("❌ Erro ao salvar."); 
    }
}

function gerarWhatsEspecial() {
    const nomeIgreja = "ICM - Dona Augusta";
    const local = document.getElementById('local_evento').value.trim() || "Não informado";
    const desc = document.getElementById('desc_evento').value.trim() || "Evento Especial";
    const dataRaw = document.getElementById('data_especial').value;
    const dataFmt = dataRaw ? dataRaw.split('-').reverse().join('/') : "--/--/----";

    const obterListaCompleta = (prefixo) => {
        const cats = ["Varões", "Senhoras", "Jovens", "Adolescentes", "Intermediários", "Crianças", "Crianças de Colo"];
        let lista = ""; let total = 0;
        cats.forEach(c => {
            const val = parseInt(document.getElementById(`val_${prefixo}_${c}`).innerText) || 0;
            // Agora SEM o 'if (val > 0)', para mostrar inclusive os zerados
            lista += `   • ${c}: ${val}\n`;
            total += val;
        });
        return { lista, total };
    };

    const membros = obterListaCompleta('membro');
    const visitantes = obterListaCompleta('vis');

    let msg = `*📊 RELATÓRIO DE EVENTO - ${nomeIgreja.toUpperCase()}*\n\n`;
    msg += `📅 *DATA:* ${dataFmt}\n`;
    msg += `📍 *LOCAL:* ${local}\n`;
    msg += `📝 *EVENTO:* ${desc.toUpperCase()}\n\n`;
    msg += `--- \n\n`;
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