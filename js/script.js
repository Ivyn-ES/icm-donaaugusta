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
// 4. MÓDULO DE CHAMADA (PRESENÇA)
// ==========================================
async function renderizarListaChamada() {
    const container = document.getElementById('listaChamada');
    const dataSelecionada = document.getElementById('data_chamada')?.value;
    const eventoSelecionado = document.getElementById('tipo_evento')?.value;
    if (!container) return;

    try {
        const user = verificarAcesso();
        const { data: membros, error: errM } = await _supabase.from('membros')
            .select('id, nome, apelido, grupo, categoria, situacao') 
            .eq('status_registro', 'Ativo').order('nome');
        
        if (errM) throw errM;

        let jaRegistrados = [];
        let resumoExistente = null;

        if (dataSelecionada && eventoSelecionado) {
            const { data: pres } = await _supabase.from('presencas')
                .select('membro_id, presenca').eq('data_culto', dataSelecionada).eq('tipo_evento', eventoSelecionado);
            jaRegistrados = pres || [];

            const { data: resu } = await _supabase.from('resumo_culto')
                .select('*').eq('data_culto', dataSelecionada).eq('tipo_evento', eventoSelecionado)
                .eq('grupo', user.grupo || 'Geral').maybeSingle();
            resumoExistente = resu;
        }

        if (resumoExistente) {
            document.getElementById('vis_adultos').value = resumoExistente.vis_adultos || 0;
            document.getElementById('vis_cias').value = resumoExistente.vis_cias || 0;
            document.getElementById('pregador_nome').value = resumoExistente.pregador_nome || "";
            document.getElementById('pregador_funcao').value = resumoExistente.pregador_funcao || "Pastor";
            document.getElementById('texto_biblico').value = resumoExistente.texto_biblico || "";
            document.getElementById('louvor_nome').value = resumoExistente.louvor_nome || "";
            document.getElementById('louvor_funcao').value = resumoExistente.louvor_funcao || "Membro";
            document.getElementById('portao_nome').value = resumoExistente.portao_nome || "";
            document.getElementById('portao_funcao').value = resumoExistente.portao_funcao || "Obreiro";
            if (document.getElementById('observacoes_culto')) {
                document.getElementById('observacoes_culto').value = resumoExistente.observacoes || "";
            }
        }

        container.innerHTML = membros.map(m => {
            const reg = jaRegistrados.find(r => r.membro_id === m.id);
            const estaPresente = reg ? reg.presenca : false;
            const partesNome = m.nome.trim().split(" ");
            const nomeCurto = partesNome.length > 1 ? `${partesNome[0]} ${partesNome[1]}` : partesNome[0];
            const sit = (m.situacao || "").toLowerCase();
            const eVisitante = sit.includes('visitante');
            const nomeExibicao = m.apelido ? `<strong>${m.apelido}</strong> <br><small>(${nomeCurto})</small>` : `<strong>${nomeCurto}</strong>`;

            return `
                <div class="card-chamada" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid #ddd; margin-bottom:8px; border-radius:8px; background:${estaPresente ? '#e8f5e9' : '#fff'};">
                    <span class="dados-membro">${nomeExibicao} <br><small>${m.grupo}${eVisitante ? ' (Vis)' : ''}</small></span>
                    <input type="checkbox" class="check-presenca" onchange="atualizarContadores()" data-id="${m.id}" data-categoria="${m.categoria || 'Adulto'}" data-situacao="${m.situacao || 'Membro'}" ${estaPresente ? 'checked' : ''} style="width:28px; height:28px;">
                </div>`;
        }).join('');
        atualizarContadores();
    } catch (err) { console.error(err); }
}

function filtrarListaMembros() {
    const termo = document.getElementById('inputBusca')?.value.toLowerCase().trim() || "";
    const cards = document.querySelectorAll('.card-chamada');
    cards.forEach(card => {
        const texto = card.innerText.toLowerCase();
        card.style.display = texto.includes(termo) ? "flex" : "none";
    });
}

async function salvarChamada() {
    const btn = document.getElementById('btnFinalizar');
    const dataCulto = document.getElementById('data_chamada').value;
    const tipoEvento = document.getElementById('tipo_evento').value;
    const user = verificarAcesso();
    if (!dataCulto) return alert("Selecione a data!");
    
    const textoOriginal = btn.innerText;
    btn.disabled = true;
    btn.innerText = "⌛ Salvando...";

    const presencasMembros = Array.from(document.querySelectorAll('.check-presenca')).map(cb => ({
        membro_id: cb.getAttribute('data-id'), 
        data_culto: dataCulto, 
        tipo_evento: tipoEvento, 
        presenca: cb.checked
    }));

    const dadosAta = {
        data_culto: dataCulto, tipo_evento: tipoEvento, grupo: user.grupo || 'Geral',
        vis_adultos: parseInt(document.getElementById('vis_adultos').value) || 0,
        vis_cias: parseInt(document.getElementById('vis_cias').value) || 0,
        pregador_nome: document.getElementById('pregador_nome').value, 
        pregador_funcao: document.getElementById('pregador_funcao').value,
        texto_biblico: document.getElementById('texto_biblico').value, 
        louvor_nome: document.getElementById('louvor_nome').value,
        louvor_funcao: document.getElementById('louvor_funcao').value, 
        portao_nome: document.getElementById('portao_nome').value,
        portao_funcao: document.getElementById('portao_funcao').value,
        observacoes: document.getElementById('observacoes_culto')?.value || ""
    };

    try {
        await _supabase.from('presencas').upsert(presencasMembros, { onConflict: 'membro_id, data_culto, tipo_evento' });
        await _supabase.from('resumo_culto').upsert([dadosAta], { onConflict: 'data_culto, tipo_evento, grupo' });
        alert(`✅ Dados salvos!`);
        btn.innerText = "✅ Atualizado";
        setTimeout(() => { btn.disabled = false; btn.innerText = textoOriginal; }, 3000);
    } catch (err) { alert(err.message); btn.disabled = false; btn.innerText = textoOriginal; }
}

// ==========================================
// 5. MÓDULO DE AUTOMAÇÃO E WHATSAPP
// ==========================================
function formatarDataBR(dataString) {
    if (!dataString) return "";
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const partes = dataString.split("-");
    return `${partes[2]}/${meses[parseInt(partes[1]) - 1]}`;
}

function encurtarNome(nomeCompleto) {
    if (!nomeCompleto) return "";
    const partes = nomeCompleto.trim().split(" ");
    if (partes.length <= 1) return partes[0];
    const primeiroNome = partes[0];
    let ultimoSobrenome = partes[partes.length - 1];
    if (["de", "da", "do", "dos", "das"].includes(ultimoSobrenome.toLowerCase()) && partes.length > 2) {
        ultimoSobrenome = partes[partes.length - 2];
    }
    return `${primeiroNome} ${ultimoSobrenome[0]}.`;
}

// NOVA FUNÇÃO: AUTO SELECIONAR FUNÇÃO (PASTOR, OBREIRO, ETC)
function autoSelecionarFuncao(input, idSelectFuncao) {
    const nomeDigitado = input.value.trim();
    if (!window.membrosCache || nomeDigitado === "") return;

    const membro = window.membrosCache.find(m => 
        m.nome.toLowerCase() === nomeDigitado.toLowerCase()
    );

    if (membro) {
        const select = document.getElementById(idSelectFuncao);
        if (select) {
            const opcoes = Array.from(select.options).map(opt => opt.value);
            if (opcoes.includes(membro.funcao)) {
                select.value = membro.funcao;
            } else {
                select.value = "Membro";
            }
        }
    }
}

async function gerarResumoWhatsApp() {
    const nomeIgreja = "ICM - Dona Augusta";
    const tipoEvento = document.getElementById('tipo_evento')?.value || "Evento";
    const dataRaw = document.getElementById('data_chamada')?.value || "";
    const dataFormatada = formatarDataBR(dataRaw);

    const membrosAd = parseInt(document.getElementById('cont_membros_adultos')?.innerText) || 0;
    const membrosCi = parseInt(document.getElementById('cont_membros_cias')?.innerText) || 0;
    const totalVisAd = document.getElementById('cont_vis_adultos_display')?.innerText || 0;
    const totalVisCi = document.getElementById('cont_vis_cias_display')?.innerText || 0;
    const totalGeral = document.getElementById('cont_total')?.innerText || 0;

    let porcentagemTexto = "";
    try {
        const { count, error } = await _supabase.from('membros').select('*', { count: 'exact', head: true }).eq('status_registro', 'Ativo');
        if (!error && count > 0) {
            const totalPres = membrosAd + membrosCi;
            const percentual = Math.round((totalPres / count) * 100);
            let icone = (percentual < 50) ? "🔴" : "🟢";
            porcentagemTexto = ` - ${icone} *${percentual}%*`;
        }
    } catch (err) { console.error(err); }

    const pregadorRaw = document.getElementById('pregador_nome')?.value.trim() || "";
    const louvorRaw   = document.getElementById('louvor_nome')?.value.trim() || "";
    const portaoRaw   = document.getElementById('portao_nome')?.value.trim() || "Não informado";
    
    const pregador = encurtarNome(pregadorRaw);
    const louvor   = encurtarNome(louvorRaw);
    const portao   = encurtarNome(portaoRaw);
    
    const texto = document.getElementById('texto_biblico')?.value.trim() || "Não informado";
    const obs = document.getElementById('observacoes_culto')?.value.trim() || "";

    let blocoEscala = "";
    if (pregadorRaw !== "" && (louvorRaw === "" || pregadorRaw === louvorRaw)) {
        blocoEscala = `👤 *Dirigente:* ${pregador}\n`;
    } else {
        if (pregadorRaw !== "") blocoEscala += `🎤 *Pregador:* ${pregador}\n`;
        if (louvorRaw !== "")   blocoEscala += `🎶 *Louvor:* ${louvor}\n`;
    }
    blocoEscala += `🚪 *Portão:* ${portao}\n`;

    let mensagem = `*${nomeIgreja}*\n*📊 RESUMO ${tipoEvento.toUpperCase()} - ${dataFormatada}*\n\n`;
    mensagem += `*PÚBLICO:*\n• Membros (Adulto/CIAs): ${membrosAd} / ${membrosCi}${porcentagemTexto}\n`;
    mensagem += `• Visitantes (Adulto/CIAs): ${totalVisAd} / ${totalVisCi}\n`;
    mensagem += `*⭐ TOTAL GERAL: ${totalGeral}*\n\n`;
    mensagem += `*ESCALA:*\n${blocoEscala}📖 *Texto:* ${texto}\n`;
    if (obs) mensagem += `\n📝 *Obs:* ${obs}\n`;
    mensagem += `\n_Gerado Sistema Local ICM-Dona Augusta_`;

    window.location.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
}

// ==========================================
// 6. PLACAR E CONTADORES
// ==========================================
function ajustarVisitante(id, delta) {
    const campo = document.getElementById(id);
    if (!campo) return;
    let novoValor = (parseInt(campo.value) || 0) + delta;
    campo.value = novoValor < 0 ? 0 : novoValor;
    atualizarContadores();
}

function atualizarContadores() {
    let mAd = 0, mCi = 0, vLAd = 0, vLCi = 0;
    document.querySelectorAll('.check-presenca:checked').forEach(cb => {
        let cat = (cb.getAttribute('data-categoria') || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        let sit = (cb.getAttribute('data-situacao') || "").toLowerCase();
        const eCia = (cat.includes('crianca') || cat.includes('intermediario') || cat.includes('adolescente'));
        if (sit.includes('visitante')) { if (eCia) vLCi++; else vLAd++; } 
        else { if (eCia) mCi++; else mAd++; }
    });

    const vDAd = parseInt(document.getElementById('vis_adultos')?.value) || 0;
    const vDCi = parseInt(document.getElementById('vis_cias')?.value) || 0;

    if(document.getElementById('cont_membros_adultos')) document.getElementById('cont_membros_adultos').innerText = mAd;
    if(document.getElementById('cont_membros_cias')) document.getElementById('cont_membros_cias').innerText = mCi;
    if(document.getElementById('cont_vis_adultos_display')) document.getElementById('cont_vis_adultos_display').innerText = vLAd + vDAd;
    if(document.getElementById('cont_vis_cias_display')) document.getElementById('cont_vis_cias_display').innerText = vLCi + vDCi;
    
    const total = mAd + mCi + vLAd + vDAd + vLCi + vDCi;
    if(document.getElementById('cont_total')) document.getElementById('cont_total').innerText = total;
}

// Antes ficava no modulo 8 antes

async function carregarSugestoesMembros() {
    const listagem = document.getElementById('listaMembrosSugestao');
    if (!listagem) return;

    try {
        // Mudamos de 'cargo' para 'funcao' na consulta
        const { data, error } = await _supabase
            .from('membros')
            .select('nome, funcao') 
            .eq('status_registro', 'Ativo');

        if (error) throw error;

        // Criamos as opções usando a propriedade 'funcao'
        listagem.innerHTML = data.map(m => 
            `<option value="${m.nome}">${m.nome} (${m.funcao || 'Membro'})</option>`
        ).join('');
        
        window.membrosCache = data;

        console.log("DEBUG: Nomes carregados no cache: ", window.membrosCache.length);
        alert("O sistema carregou " + data.length + " nomes."); // Isso vai forçar um aviso na tela do seu celular

    } catch (err) {
        console.error("Erro ao carregar sugestões:", err);
    }
}

function autoSelecionarFuncao(inputElement, selectId) {
    const nomeDigitado = inputElement.value;
    const selectDestino = document.getElementById(selectId);
    
    if (!window.membrosCache || !selectDestino) return;

    // Procura o membro no cache
    const membroEncontrado = window.membrosCache.find(m => m.nome === nomeDigitado);

    if (membroEncontrado) {
        const funcaoDoBanco = membroEncontrado.funcao; // Aqui também mudamos para funcao
        
        // Percorre as opções do select (Pastor, Diácono, etc) para marcar a correta
        for (let i = 0; i < selectDestino.options.length; i++) {
            if (selectDestino.options[i].value === funcaoDoBanco) {
                selectDestino.selectedIndex = i;
                break;
            }
        }
    }
}

// ==========================================
// 7. MÓDULO ADMINISTRATIVO
// ==========================================
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
                    <button onclick="deletarGrupo('${g.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
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
                    <button onclick="deletarUsuario('${u.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
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
// 8. INTERFACE E PERMISSÕES
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

    if (nivel === 'admin' || nivel === 'master' || nivel === 'pastor') { 
        Object.values(b).forEach(el => { if(el) el.style.display = 'flex'; });
    } 
    else if (nivel === 'coordenadora') {
        if (b.lista) b.lista.style.display = 'flex';
        if (b.aniversariantes) b.aniversariantes.style.display = 'flex';
        [b.chamada, b.cadastro, b.grupos, b.usuarios, b.relatorios].forEach(el => { if(el) el.style.display = 'none'; });
    }
    else if (nivel === 'apoio') {
        if (b.chamada) b.chamada.style.display = 'flex';
        [b.cadastro, b.lista, b.relatorios, b.grupos, b.usuarios, b.aniversariantes].forEach(el => { if(el) el.style.display = 'none'; });
    }
    else if (nivel === 'user') {
        if (b.lista) b.lista.style.display = 'flex';
        if (b.relatorios) b.relatorios.style.display = 'flex';
        [b.chamada, b.cadastro, b.grupos, b.usuarios, b.aniversariantes].forEach(el => { if(el) el.style.display = 'none'; });
    }
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

async function gerarRelatorioAniversariantes() {
    const mesFiltro = document.getElementById('filtroMesAniversario')?.value;
    const corpoAniv = document.getElementById('corpoRelatorioAniversariantes');
    if (!mesFiltro || !corpoAniv) return;
    try {
        const { data, error } = await _supabase.from('membros').select('nome, apelido, dia, mes, grupo')
            .eq('sexo', 'Feminino').eq('mes', mesFiltro).eq('status_registro', 'Ativo').order('dia', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) {
            corpoAniv.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhuma irmã aniversariante em ${mesFiltro}.</td></tr>`;
            return;
        }
        corpoAniv.innerHTML = data.map(m => `
            <tr>
                <td style="font-weight:bold; color:#d81b60;">${m.dia}</td>
                <td>${m.nome} ${m.apelido ? `<br><small>(${m.apelido})</small>` : ''}</td>
                <td>Grupo ${m.grupo}</td>
                <td style="text-align:center;">
                    <button onclick="enviarParabensIrma('${m.nome}')" style="background:#25d366; color:white; border:none; border-radius:5px; padding:6px 10px; cursor:pointer;">🌹📱</button>
                </td>
            </tr>`).join('');
    } catch (err) { corpoAniv.innerHTML = `<tr><td colspan="4">Erro ao carregar dados.</td></tr>`; }
}

// ==========================================
// 10. INICIALIZAÇÃO AUTOMÁTICA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const url = window.location.href;
    ajustarInterfacePorPerfil();
    const formLogin = document.getElementById('loginForm');
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            realizarLogin(document.getElementById('usuario').value, document.getElementById('senha').value);
        });
    }
    if (url.includes('admin-usuarios.html')) { renderizarUsuarios(); carregarGruposNoSelect(); }
    if (url.includes('admin-grupos.html')) { renderizarGrupos(); }
    if (url.includes('lista-membros.html')) { renderizarListaMembros(); }
    if (url.includes('chamada.html')) { carregarSugestoesMembros(); renderizarListaChamada(); }
    if (url.includes('cadastro-membro.html')) { carregarGruposNoSelect(); carregarMembrosParaVinculo(); }
});

// ==========================================
// 11. EVENTOS ESPECIAIS
// ==========================================
async function salvarEventoEspecial() {
    const data_evento = document.getElementById('data_especial').value;
    const descricao = document.getElementById('desc_evento').value.trim();
    if (!data_evento || !descricao) return alert("⚠️ Preencha os campos.");
    const dados = {
        data_evento, descricao,
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
    try {
        const { error } = await _supabase.from('eventos_especiais').insert([dados]);
        if (error) throw error;
        alert("✅ Evento salvo!");
    } catch (err) { alert("❌ Erro ao salvar."); }
}

function gerarWhatsEspecial() {
    const nomeIgreja = "ICM - Dona Augusta";
    const desc = document.getElementById('desc_evento').value || "Evento Especial";
    const dataRaw = document.getElementById('data_especial').value;
    const dataFmt = typeof formatarDataBR === "function" ? formatarDataBR(dataRaw) : dataRaw;
    const obterListaCompleta = (prefixo) => {
        const cats = ["Varões", "Senhoras", "Jovens", "Adolescentes", "Intermediários", "Crianças", "Crianças de Colo"];
        let lista = ""; let total = 0;
        cats.forEach(c => {
            const val = parseInt(document.getElementById(`val_${prefixo}_${c}`).innerText) || 0;
            lista += `   • ${c}: ${val}\n`;
            total += val;
        });
        return { lista, total };
    };
    const membros = obterListaCompleta('membro');
    const visitantes = obterListaCompleta('vis');
    let msg = `*${nomeIgreja}*\n*📌 ${desc.toUpperCase()} - ${dataFmt}*\n\n*👥 MEMBROS:* (${membros.total})\n${membros.lista}\n*🌟 VISITANTES:* (${visitantes.total})\n${visitantes.lista}\n*⭐ TOTAL: ${membros.total + visitantes.total}*\n\n_Gerado Sistema Local ICM-Dona Augusta_`;
    window.location.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
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