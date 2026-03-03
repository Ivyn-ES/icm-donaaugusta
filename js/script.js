// ==========================================
// 1. CONFIGURAÇÃO E CONEXÃO
// ==========================================
const SUPABASE_URL = 'https://pxjczmjhzopfxwlmpjfv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4amN6bWpoem9wZnh3bG1wamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjUzMjYsImV4cCI6MjA4NzEwMTMyNn0.OfekQPuYUwsZu5X9_lPDGBbVTZYBvAQ5KdiFx3TFOCY';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. SEGURANÇA E ACESSO (Ajustado: Lowercase)
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
    // Normaliza o nível para minúsculo para evitar erros de comparação
    const nivel = (usuario.nivel || "").toLowerCase();

    // Nível Livre
    if (nivel === 'livre') {
        const proibidas = ['dashboard.html', 'cadastro-membro.html', 'admin-usuarios.html', 'admin-grupos.html', 'chamada.html', 'lista-membros.html', 'relatorio-presenca.html', 'relatorio-aniversariantes.html'];
        if (proibidas.some(p => urlAtual.includes(p))) {
            window.location.href = 'livre.html';
            return usuario;
        }
    }

    // Níveis User, Apoio ou Coordenadora (Acesso restrito a Admins)
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

        // SALVAMENTO PADRONIZADO EM MINÚSCULAS
        localStorage.setItem('usuarioLogado', JSON.stringify({
            nome: data.login.toLowerCase(),
            login: data.login.toLowerCase(),
            nivel: data.permissao.toLowerCase(),
            permissao: data.permissao.toLowerCase(),
            grupo: data.grupo_vinculado
        }));

        // Redirecionamento baseado no nível (em minúsculo)
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
// 3. MÓDULO DE MEMBROS (Ajustado: Edição, Vínculo e Permissões)
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
        
        if (!ehPrivilegiado) {
            consulta = consulta.eq('grupo', user.grupo); 
        }

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
                        <button onclick="prepararEdicao('${m.id}')" style="background:none; border:none; cursor:pointer;" title="Editar">✏️</button>
                        <button onclick="excluirMembro('${m.id}')" style="background:none; border:none; cursor:pointer;" title="Excluir">🗑️</button>
                    ` : (ehPrivilegiado ? '👁️' : '🔒')}
                </td>
            </tr>`).join('');
            
    } catch (err) { 
        console.error("Erro ao renderizar lista:", err);
        corpoTabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar os dados.</td></tr>"; 
    }
}

async function cadastrarMembro(dados) {
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();

    // Mantendo sua regra de permissão
    if (nivel !== 'admin' && nivel !== 'master' && nivel !== 'coordenadora' && nivel !== 'pastor') {
        alert("❌ Sem permissão para cadastrar membros.");
        return false;
    }

    try {
        const { error } = await _supabase.from('membros').insert([{
            nome: dados.nome, 
            apelido: dados.apelido, 
            telefone: dados.telefone, // NOVO CAMPO
            funcao: dados.funcao,
            situacao: dados.situacao, 
            categoria: dados.categoria, 
            sexo: dados.sexo,
            eh_idoso: dados.eh_idoso,   // NOVO CAMPO (Boolean)
            grupo: dados.grupo, 
            dia: parseInt(dados.niver_dia) || 0, 
            mes: dados.niver_mes,
            // Mantém sua lógica: se não vier ID de família, gera um novo UUID
            familia_id: dados.familia_vinculo || crypto.randomUUID(), 
            status_registro: 'Ativo'
        }]);

        if (error) throw error;
        
        alert("✅ Membro cadastrado com sucesso!");
        return true; 
    } catch (err) { 
        console.error("Erro no cadastro:", err);
        alert("Erro ao cadastrar: " + err.message); 
        return false; 
    }
}

// NOVA FUNÇÃO: Atualizar membro existente (Versão Final)
async function atualizarMembro(id, dados) {
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();

    // Mantendo seu padrão de permissões
    if (nivel !== 'admin' && nivel !== 'master' && nivel !== 'coordenadora' && nivel !== 'pastor') {
        alert("❌ Sem permissão para editar.");
        return false;
    }

    try {
        const { error } = await _supabase.from('membros').update({
            nome: dados.nome,
            apelido: dados.apelido,
            telefone: dados.telefone, // NOVO CAMPO
            funcao: dados.funcao,
            situacao: dados.situacao,
            categoria: dados.categoria,
            sexo: dados.sexo,
            eh_idoso: dados.eh_idoso,   // NOVO CAMPO
            grupo: dados.grupo,
            dia: parseInt(dados.niver_dia) || 0,
            mes: dados.niver_mes,
            // Mantém a lógica de família existente ou gera novo ID
            familia_id: dados.familia_vinculo || crypto.randomUUID()
        }).eq('id', id);

        if (error) throw error;
        
        alert("✅ Dados atualizados com sucesso!");
        return true;
    } catch (err) {
        console.error("Erro ao atualizar:", err);
        alert("Erro ao atualizar: " + err.message);
        return false;
    }
}

// CORREÇÃO: Carregar membros para o campo de vínculo familiar
async function carregarMembrosParaVinculo() {
    const selectFamilia = document.getElementById('vinculo_familia');
    if (!selectFamilia) return;

    try {
        const { data, error } = await _supabase
            .from('membros')
            .select('nome, familia_id')
            .eq('status_registro', 'Ativo')
            .order('nome', { ascending: true });

        if (error) throw error;

        let html = '<option value="">Ninguém (Membro Individual / Novo Responsável)</option>';
        if (data && data.length > 0) {
            // Remove duplicados de familia_id para não repetir nomes da mesma família se preferir, 
            // mas aqui listamos todos para facilitar achar pelo nome.
            html += data.map(m => `<option value="${m.familia_id}">${m.nome}</option>`).join('');
        }
        selectFamilia.innerHTML = html;
    } catch (err) {
        console.error("Erro ao carregar vínculos:", err);
    }
}

function prepararEdicao(id) {
    localStorage.setItem('idMembroEdicao', id);
    window.location.href = 'cadastro-membro.html';
}

async function excluirMembro(id) {
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();

    if (nivel !== 'admin' && nivel !== 'master') {
        alert("❌ Apenas administradores podem excluir membros.");
        return;
    }

    if (!confirm("Deseja realmente excluir este membro?")) return;

    try {
        const { error } = await _supabase.from('membros').delete().eq('id', id);
        if (error) throw error;
        alert("✅ Membro removido!");
        renderizarListaMembros();
    } catch (err) {
        alert("Erro ao excluir: " + err.message);
    }
}

// ==========================================
// 4. MÓDULO DE CHAMADA (PRESENÇA) - Ajustado para não fechar
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
                    <span>${nomeExibicao} <br><small>${m.grupo}${eVisitante ? ' (Vis)' : ''}</small></span>
                    <input type="checkbox" class="check-presenca" onchange="atualizarContadores()" data-id="${m.id}" data-categoria="${m.categoria || 'Adulto'}" data-situacao="${m.situacao || 'Membro'}" ${estaPresente ? 'checked' : ''} style="width:28px; height:28px;">
                </div>`;
        }).join('');
        atualizarContadores();
    } catch (err) { console.error(err); }
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
        data_culto: dataCulto, 
        tipo_evento: tipoEvento, 
        grupo: user.grupo || 'Geral',
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
        const { error: errP } = await _supabase.from('presencas').upsert(presencasMembros, { onConflict: 'membro_id, data_culto, tipo_evento' });
        if (errP) throw errP;

        const { error: errR } = await _supabase.from('resumo_culto').upsert([dadosAta], { onConflict: 'data_culto, tipo_evento, grupo' });
        if (errR) throw errR;

        alert(`✅ Dados salvos com sucesso no sistema!`);
        
        // Mantém na tela e altera o texto do botão temporariamente
        btn.innerText = "✅ Atualizado";
        setTimeout(() => { 
            btn.disabled = false;
            btn.innerText = textoOriginal; 
        }, 3000);

    } catch (err) { 
        alert("Erro ao salvar: " + err.message); 
        btn.disabled = false; 
        btn.innerText = textoOriginal;
    }
}

// ==========================================
// 5. MÓDULO DE AUTOMAÇÃO E WHATSAPP
// ==========================================

function formatarDataBR(dataString) {
    if (!dataString) return "";
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const partes = dataString.split("-");
    if (partes.length < 3) return dataString;
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
        // Busca total de ativos
        const { count, error } = await _supabase
            .from('membros')
            .select('*', { count: 'exact', head: true })
            .eq('status_registro', 'Ativo');

        if (!error && count > 0) {
            const totalPres = membrosAd + membrosCi;
            const percentual = Math.round((totalPres / count) * 100);
            
            // Forçamos a definição do ícone aqui
            let icone = (percentual < 50) ? "🔴" : "🟢";
            
            // Montamos a string garantindo que o ícone venha ANTES do asterisco
            porcentagemTexto = " - " + icone + " *" + percentual + "%*";
        }
    } catch (err) {
        console.error("Erro na %:", err);
    }

    const pregadorRaw = document.getElementById('pregador_nome')?.value.trim() || "";
    const louvorRaw   = document.getElementById('louvor_nome')?.value.trim() || "";
    const portaoRaw   = document.getElementById('portao_nome')?.value.trim() || "Não informado";
    
    const pregador = encurtarNome(pregadorRaw);
    const louvor   = encurtarNome(louvorRaw);
    const portao   = encurtarNome(portaoRaw);
    
    const texto = document.getElementById('texto_biblico')?.value.trim() || "Não informado";
    const obs = document.getElementById('observacoes_culto')?.value.trim() || "";

    let blocoEscala = "";
    if (pregadorRaw === louvorRaw && pregadorRaw !== "") {
        blocoEscala = `👤 *Dirigente:* ${pregador}\n`;
    } else {
        if (pregador) blocoEscala += `🎤 *Pregador:* ${pregador}\n`;
        if (louvor)   blocoEscala += `🎶 *Louvor:* ${louvor}\n`;
    }
    blocoEscala += `🚪 *Portão:* ${portao}\n`;

    let mensagem = `*${nomeIgreja}*\n`;
    mensagem += `*📊 RESUMO ${tipoEvento.toUpperCase()} - ${dataFormatada}*\n\n`;
    // Aqui injetamos a porcentagemTexto que já contém o círculo
    mensagem += `*PÚBLICO:*\n• Membros (Adulto/CIAs): ${membrosAd} / ${membrosCi}${porcentagemTexto}\n`;
    mensagem += `• Visitantes (Adulto/CIAs): ${totalVisAd} / ${totalVisCi}\n`;
    mensagem += `*⭐ TOTAL GERAL: ${totalGeral}*\n\n`;
    mensagem += `*ESCALA:*\n${blocoEscala}📖 *Texto:* ${texto}\n`;
    
    if (obs) mensagem += `\n📝 *Obs:* ${obs}\n`;
    mensagem += `\n_Gerado Sistema Local ICM-Dona Augusta_`;

    // Usando api.whatsapp.com para melhor compatibilidade com emojis no mobile
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
    window.location.href = url;
}

// ==========================================
// 6. PLACAR E CONTADORES (Ajustado: Botões de + e - e Case Insensitive)
// ==========================================

// Função para os botões de + e - (Resolve o problema do celular)
function ajustarVisitante(id, delta) {
    const campo = document.getElementById(id);
    if (!campo) return;
    
    let valorAtual = parseInt(campo.value) || 0;
    let novoValor = valorAtual + delta;
    if (novoValor < 0) novoValor = 0;
    
    campo.value = novoValor;
    atualizarContadores(); // Sincroniza o placar imediatamente
}

function atualizarContadores() {
    let mAd = 0, mCi = 0, vLAd = 0, vLCi = 0;
    
    document.querySelectorAll('.check-presenca:checked').forEach(cb => {
        let cat = (cb.getAttribute('data-categoria') || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        let sit = (cb.getAttribute('data-situacao') || "").toLowerCase();
        
        const eCia = (cat.includes('crianca') || cat.includes('intermediario') || cat.includes('adolescente'));
        
        if (sit.includes('visitante')) { 
            if (eCia) vLCi++; else vLAd++; 
        } else { 
            if (eCia) mCi++; else mAd++; 
        }
    });

    // Visitantes Digitados (via botões + e -)
    const vDAd = parseInt(document.getElementById('vis_adultos')?.value) || 0;
    const vDCi = parseInt(document.getElementById('vis_cias')?.value) || 0;

    // Atualiza o Display do Placar
    if(document.getElementById('cont_membros_adultos')) document.getElementById('cont_membros_adultos').innerText = mAd;
    if(document.getElementById('cont_membros_cias')) document.getElementById('cont_membros_cias').innerText = mCi;
    if(document.getElementById('cont_vis_adultos_display')) document.getElementById('cont_vis_adultos_display').innerText = vLAd + vDAd;
    if(document.getElementById('cont_vis_cias_display')) document.getElementById('cont_vis_cias_display').innerText = vLCi + vDCi;
    
    const total = mAd + mCi + vLAd + vDAd + vLCi + vDCi;
    if(document.getElementById('cont_total')) document.getElementById('cont_total').innerText = total;
}

async function carregarSugestoesMembros() {
    const listagem = document.getElementById('listaMembrosSugestao');
    if (!listagem) return;
    try {
        const { data } = await _supabase.from('membros').select('nome, funcao').eq('status_registro', 'Ativo');
        if (data) {
            listagem.innerHTML = data.map(m => `<option value="${m.nome}">${m.nome} (${m.funcao || 'Membro'})</option>`).join('');
            window.membrosCache = data;
        }
    } catch (err) { console.error("Erro ao carregar sugestões:", err); }
}

// ==========================================
// 7. MÓDULO ADMINISTRATIVO (Ajustado: Seletor Inteligente e Segurança)
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

// AJUSTADO: Agora oculta o "Todos" na tela de cadastro de membros
async function carregarGruposNoSelect() {
    const selectUsuarios = document.getElementById('grupo_vinculado'); // Select na tela de Criar Usuários
    const selectMembros = document.getElementById('grupo');           // Select na tela de Cadastro de Membros
    
    if (!selectUsuarios && !selectMembros) return;

    try {
        const { data, error } = await _supabase.from('grupos').select('nome').order('nome');
        if (error || !data) return;

        const optionsHtml = data.map(g => `<option value="${g.nome}">${g.nome}</option>`).join('');

        // Para usuários (Configurações): Permite "Todos" para quem é Admin Geral
        if (selectUsuarios) {
            selectUsuarios.innerHTML = '<option value="">Todos (Admin)</option>' + optionsHtml;
        }
        
        // Para membros (Cadastro): Apenas grupos reais, sem a opção "Todos"
        if (selectMembros) {
            selectMembros.innerHTML = '<option value="">Selecione o Grupo</option>' + optionsHtml;
        }
    } catch (err) { console.error("Erro ao carregar grupos:", err); }
}

async function criarUsuario(dados) {
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();

    if (nivel !== 'admin' && nivel !== 'master') {
        alert("❌ Sem permissão para criar usuários.");
        return false;
    }

    try {
        const { error } = await _supabase.from('usuarios').insert([dados]);
        if (error) throw error;
        alert("✅ Usuário criado com sucesso!");
        return true;
    } catch (err) {
        console.error(err);
        alert("❌ Erro ao criar usuário.");
        return false;
    }
}

async function criarGrupo(nome) {
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();

    if (nivel !== 'admin' && nivel !== 'master') {
        alert("❌ Sem permissão para criar grupos.");
        return false;
    }

    try {
        const { error } = await _supabase.from('grupos').insert([{ nome }]);
        if (error) throw error;
        alert("✅ Grupo adicionado!");
        return true;
    } catch (err) {
        alert("Erro ao adicionar grupo.");
        return false;
    }
}

// ==========================================
// 8. INTERFACE E PERMISSÕES (Ajustado: Lowercase)
// ==========================================

function ajustarInterfacePorPerfil() {
    const user = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!user) return;
    
    // Normalizamos o nível para minúsculo para garantir a comparação
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

    // 1. ADMIN / MASTER: Vê tudo
    if (nivel === 'admin' || nivel === 'master') {
        Object.values(b).forEach(el => { if(el) el.style.display = 'flex'; });
    } 
    // 2. COORDENADORA: Foco nas irmãs (Lista e Aniversariantes)
    else if (nivel === 'coordenadora') {
        if (b.lista) b.lista.style.display = 'flex';
        if (b.aniversariantes) b.aniversariantes.style.display = 'flex';
        // Esconde o restante
        [b.chamada, b.cadastro, b.grupos, b.usuarios, b.relatorios].forEach(el => { if(el) el.style.display = 'none'; });
    }
    // 3. APOIO: Apenas chamada
    else if (nivel === 'apoio') {
        if (b.chamada) b.chamada.style.display = 'flex';
        [b.cadastro, b.lista, b.relatorios, b.grupos, b.usuarios, b.aniversariantes].forEach(el => { if(el) el.style.display = 'none'; });
    }
    // 4. USER (Líder de Grupo): Lista e Relatórios
    else if (nivel === 'user') {
        if (b.lista) b.lista.style.display = 'flex';
        if (b.relatorios) b.relatorios.style.display = 'flex';
        [b.chamada, b.cadastro, b.grupos, b.usuarios, b.aniversariantes].forEach(el => { if(el) el.style.display = 'none'; });
    }
    // 5. LIVRE: Esconde tudo (Segurança extra)
    else if (nivel === 'livre') {
        Object.values(b).forEach(el => { if(el) el.style.display = 'none'; });
    }
}

// ==========================================
// 9. RELATÓRIOS E ACOMPANHAMENTO (Ajustado: Padrão Capitalizado)
// ==========================================

// --- PARTE 1: RELATÓRIO DE PRESENÇA ---
async function gerarRelatorio() {
    const dataFiltro = document.getElementById('filtroData').value;
    const corpoRelatorio = document.getElementById('corpoRelatorio');
    const resumo = document.getElementById('resumoCards');
    if (!dataFiltro || !corpoRelatorio) return;

    try {
        const user = verificarAcesso();
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

function contatarMembro(nome) {
    const msg = encodeURIComponent(`Paz do Senhor, irmão ${nome}! Sentimos sua falta. Está tudo bem?`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
}

// --- PARTE 2: RELATÓRIO DE ANIVERSARIANTES (Ajustado: Feminino / Ativo) ---
async function gerarRelatorioAniversariantes() {
    const mesFiltro = document.getElementById('filtroMesAniversario')?.value;
    const corpoAniv = document.getElementById('corpoRelatorioAniversariantes');
    if (!mesFiltro || !corpoAniv) return;

    try {
        // RESPEITANDO O PADRÃO: Primeira letra Maiúscula nos dados
        const { data, error } = await _supabase
            .from('membros')
            .select('nome, apelido, dia, mes, grupo')
            .eq('sexo', 'Feminino')        // Dado no banco: "Feminino"
            .eq('mes', mesFiltro)          // O value do select deve ser "Janeiro", "Fevereiro"...
            .eq('status_registro', 'Ativo') // Dado no banco: "Ativo"
            .order('dia', { ascending: true });

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
                    <button onclick="enviarParabensIrma('${m.nome}')" style="background:#25d366; color:white; border:none; border-radius:5px; padding:6px 10px; cursor:pointer;" title="Enviar Parabéns">🌹📱</button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Erro ao carregar aniversariantes:", err);
        corpoAniv.innerHTML = `<tr><td colspan="4">Erro ao carregar dados.</td></tr>`;
    }
}

function enviarParabensIrma(nome) {
    const msg = encodeURIComponent(`Paz do Senhor, irmã ${nome}! 🌹\n\nEm nome da Coordenação da ICM - Dona Augusta, passamos para desejar um feliz aniversário! Que o Senhor Jesus continue te abençoando ricamente. 🎂✨`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
}

// ==========================================
// 10. INICIALIZAÇÃO AUTOMÁTICA (Finalizado)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const url = window.location.href;
    
    // Ajusta o que cada perfil pode ver no menu/dashboard
    ajustarInterfacePorPerfil();

    // Lógica do formulário de Login
    const formLogin = document.getElementById('loginForm');
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            realizarLogin(document.getElementById('usuario').value, document.getElementById('senha').value);
        });
    }

    // Carregamento específico por página (URL)
    if (url.includes('admin-usuarios.html')) { 
        renderizarUsuarios(); 
        carregarGruposNoSelect(); 
    }
    
    if (url.includes('admin-grupos.html')) { 
        renderizarGrupos(); 
    }
    
    if (url.includes('lista-membros.html')) { 
        renderizarListaMembros(); 
    }
    
    if (url.includes('chamada.html')) { 
        carregarSugestoesMembros(); 
    }

    if (url.includes('cadastro-membro.html')) {
        carregarGruposNoSelect();
        carregarMembrosParaVinculo(); // Para famílias/responsáveis
    }

    // NOVA PÁGINA: Relatório de Aniversariantes (Coordenadora)
    if (url.includes('relatorio-aniversariantes.html')) {
        // Se quiser que carregue algo ao abrir, pode colocar aqui
        console.log("Módulo de Aniversariantes carregado.");
    }
});

// ==========================================
// 11. MÓDULO DE EVENTOS ESPECIAIS E CIAs
// ==========================================

async function salvarEventoEspecial() {
    const data_evento = document.getElementById('data_especial').value;
    const descricao = document.getElementById('desc_evento').value.trim();

    if (!data_evento || !descricao) {
        alert("⚠️ Por favor, preencha a data e a descrição do evento.");
        return;
    }

    // Capturando os valores de Membros e Visitantes
    // Nota: Os IDs devem ser exatamente iguais aos gerados no HTML
    const dados = {
        data_evento,
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

    try {
        const { error } = await _supabase.from('eventos_especiais').insert([dados]);
        if (error) throw error;
        alert("✅ Evento salvo com sucesso!");
    } catch (err) {
        console.error(err);
        alert("❌ Erro ao salvar evento especial.");
    }
}

function gerarWhatsEspecial() {
    const nomeIgreja = "ICM - Dona Augusta";
    const desc = document.getElementById('desc_evento').value || "Evento Especial";
    const dataRaw = document.getElementById('data_especial').value;
    const dataFmt = typeof formatarDataBR === "function" ? formatarDataBR(dataRaw) : dataRaw;

    // Função interna para montar a lista COMPLETA (incluindo zeros)
    const obterListaCompleta = (prefixo) => {
        const cats = ["Varões", "Senhoras", "Jovens", "Adolescentes", "Intermediários", "Crianças", "Crianças de Colo"];
        let lista = "";
        let total = 0;
        cats.forEach(c => {
            const val = parseInt(document.getElementById(`val_${prefixo}_${c}`).innerText) || 0;
            lista += `   • ${c}: ${val}\n`;
            total += val;
        });
        return { lista, total };
    };

    const membros = obterListaCompleta('membro');
    const visitantes = obterListaCompleta('vis');
    const totalGeral = membros.total + visitantes.total;

    let msg = `*${nomeIgreja}*\n`;
    msg += `*📌 ${desc.toUpperCase()} - ${dataFmt}*\n\n`;
    
    msg += `*👥 MEMBROS:* (Total: ${membros.total})\n${membros.lista}\n`;
    msg += `*🌟 VISITANTES:* (Total: ${visitantes.total})\n${visitantes.lista}\n`;
    
    msg += `*⭐ TOTAL GERAL: ${totalGeral}*\n\n`;
    msg += `_Gerado Sistema Local ICM-Dona Augusta_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.location.href = url;
}

// ==========================================
// 12. MÓDULO DE ACOMPANHAMENTO E CUIDADO (PASTOREIO)
// ==========================================

async function carregarListaCuidado() {
    const listaCorpo = document.getElementById('corpoCuidado');
    const secaoCuidado = document.getElementById('secaoCuidado');
    if (!listaCorpo) return;

    // 0. Verificação de Perfil (Somente Pastor e Admin acessam a lógica)
    const user = JSON.parse(localStorage.getItem('user_icm'));
    if (!user || (user.nivel !== 'Pastor' && user.nivel !== 'Admin')) {
        if (secaoCuidado) secaoCuidado.style.display = 'none';
        return;
    }

    listaCorpo.innerHTML = "<tr><td colspan='3' style='text-align:center;'>Analisando frequências...</td></tr>";

    try {
        // 1. Busca todos os membros ativos
        const { data: membros, error: errM } = await _supabase
            .from('membros')
            .select('id, nome, categoria, telefone, ultimo_cuidado');

        // 2. Busca a última presença de cada um na tabela de frequencia_membros (individual)
        // Nota: Certifique-se que o nome da tabela no Supabase é 'frequencia_membros' ou ajuste abaixo
        const { data: presencas, error: errP } = await _supabase
            .from('frequencia_membros') 
            .select('membro_id, data_presenca')
            .order('data_presenca', { ascending: false });

        if (errM) throw errM;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Zera as horas para cálculo de dias exatos
        let html = "";
        let encontrouAusentes = false;

        membros.forEach(m => {
            // Filtra a última presença deste membro específico
            const ultimaPresencaObj = presencas ? presencas.find(p => p.membro_id === m.id) : null;
            
            // Define data de referência inicial (se nunca veio, usamos uma data bem antiga)
            let dataRef = ultimaPresencaObj ? new Date(ultimaPresencaObj.data_presenca) : new Date(2000, 0, 1);
            
            // Se ele teve um cuidado registrado (Botão Resolvido), comparamos qual data é mais recente
            if (m.ultimo_cuidado) {
                const dataCuidado = new Date(m.ultimo_cuidado);
                if (dataCuidado > dataRef) dataRef = dataCuidado;
            }

            // Cálculo da diferença em dias
            const diffTime = Math.abs(hoje - dataRef);
            const diffDias = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            // REGRAS DE CATEGORIA: 30 dias para Idosos, 7 dias para os demais
            // O .toLowerCase() e .includes() evita erros se escrever "idoso" ou "Idosa"
            const cat = m.categoria ? m.categoria.toLowerCase() : "";
            const limite = (cat.includes('idoso') || cat.includes('idosa')) ? 30 : 7;

            if (diffDias > limite) {
                encontrouAusentes = true;
                html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">
                        <strong>${m.nome}</strong><br>
                        <span class="classe-texto">${m.categoria || 'Membro'}</span>
                    </td>
                    <td style="padding: 10px;">
                        <span class="badge-alerta">${diffDias} dias</span>
                    </td>
                    <td style="padding: 10px; display: flex; gap: 8px;">
                        <button onclick="enviarWhatsCuidado('${m.telefone}', '${m.nome}')" class="btn-acao-mini" style="background:#25d366" title="Enviar Mensagem">💬</button>
                        <button onclick="marcarComoResolvido('${m.id}')" class="btn-acao-mini" style="background:#3498db" title="Marcar como Resolvido">✅</button>
                    </td>
                </tr>`;
            }
        });

        if (secaoCuidado) secaoCuidado.style.display = 'block';
        listaCorpo.innerHTML = html || "<tr><td colspan='3' style='text-align:center; padding: 15px;'>✅ Todos os membros estão em dia!</td></tr>";

    } catch (error) {
        console.error("Erro no Módulo 12:", error);
        listaCorpo.innerHTML = "<tr><td colspan='3' style='text-align:center; color: red;'>Erro ao processar dados.</td></tr>";
    }
}

async function marcarComoResolvido(idMembro) {
    if (!confirm("Confirmar que este membro foi assistido/visitado?")) return;

    // Pega a data de hoje no formato YYYY-MM-DD
    const hoje = new Date().toISOString().split('T')[0];

    try {
        const { error } = await _supabase
            .from('membros')
            .update({ ultimo_cuidado: hoje })
            .eq('id', idMembro);

        if (error) throw error;

        alert("📖 Cuidado registrado! O nome sairá da lista temporariamente.");
        carregarListaCuidado(); // Recarrega a lista para remover o irmão atendido
    } catch (err) {
        console.error(err);
        alert("Erro ao salvar o atendimento.");
    }
}

function enviarWhatsCuidado(tel, nome) {
    if (!tel) {
        alert("Este membro não possui telefone cadastrado.");
        return;
    }
    // Remove qualquer caractere que não seja número (evita erros no link)
    const telLimpo = tel.replace(/\D/g, '');
    const msg = `A paz do Senhor, irmão(ã) ${nome}! Sentimos sua falta nos últimos dias. Está tudo bem? Como podemos orar por você?`;
    
    window.open(`https://api.whatsapp.com/send?phone=55${telLimpo}&text=${encodeURIComponent(msg)}`, '_blank');
}