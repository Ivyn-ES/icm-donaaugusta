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

    if (nivel !== 'admin' && nivel !== 'master' && nivel !== 'coordenadora') {
        alert("❌ Sem permissão para cadastrar membros.");
        return false;
    }

    try {
        const { error } = await _supabase.from('membros').insert([{
            nome: dados.nome, 
            apelido: dados.apelido, 
            funcao: dados.funcao,
            situacao: dados.situacao, 
            categoria: dados.categoria, 
            sexo: dados.sexo,
            grupo: dados.grupo, 
            dia: parseInt(dados.niver_dia) || 0, 
            mes: dados.niver_mes,
            familia_id: dados.familia_vinculo || crypto.randomUUID(), 
            status_registro: 'Ativo'
        }]);

        if (error) throw error;
        return true; // Sucesso (O alert já está no HTML)
    } catch (err) { 
        console.error("Erro no cadastro:", err);
        alert("Erro ao cadastrar: " + err.message); 
        return false; 
    }
}

// NOVA FUNÇÃO: Atualizar membro existente
async function atualizarMembro(id, dados) {
    const user = verificarAcesso();
    const nivel = (user?.permissao || user?.nivel || "").toLowerCase();

    if (nivel !== 'admin' && nivel !== 'master' && nivel !== 'coordenadora') {
        alert("❌ Sem permissão para editar.");
        return false;
    }

    try {
        const { error } = await _supabase.from('membros').update({
            nome: dados.nome,
            apelido: dados.apelido,
            funcao: dados.funcao,
            situacao: dados.situacao,
            categoria: dados.categoria,
            sexo: dados.sexo,
            grupo: dados.grupo,
            dia: parseInt(dados.niver_dia) || 0,
            mes: dados.niver_mes,
            familia_id: dados.familia_vinculo || crypto.randomUUID()
        }).eq('id', id);

        if (error) throw error;
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
    btn.disabled = true;

    const presencasMembros = Array.from(document.querySelectorAll('.check-presenca')).map(cb => ({
        membro_id: cb.getAttribute('data-id'), data_culto: dataCulto, tipo_evento: tipoEvento, presenca: cb.checked
    }));

    const dadosAta = {
        data_culto: dataCulto, tipo_evento: tipoEvento, grupo: user.grupo || 'Geral',
        vis_adultos: parseInt(document.getElementById('vis_adultos').value) || 0,
        vis_cias: parseInt(document.getElementById('vis_cias').value) || 0,
        pregador_nome: document.getElementById('pregador_nome').value, pregador_funcao: document.getElementById('pregador_funcao').value,
        texto_biblico: document.getElementById('texto_biblico').value, louvor_nome: document.getElementById('louvor_nome').value,
        louvor_funcao: document.getElementById('louvor_funcao').value, portao_nome: document.getElementById('portao_nome').value,
        portao_funcao: document.getElementById('portao_funcao').value,
        observacoes: document.getElementById('observacoes_culto')?.value || ""
    };

    try {
        await _supabase.from('presencas').upsert(presencasMembros, { onConflict: 'membro_id, data_culto, tipo_evento' });
        await _supabase.from('resumo_culto').upsert([dadosAta], { onConflict: 'data_culto, tipo_evento, grupo' });
        alert(`✅ Salvo com sucesso!`);
        window.location.href = 'dashboard.html';
    } catch (err) { alert("Erro: " + err.message); btn.disabled = false; }
}

// ==========================================
// 5. MÓDULO DE AUTOMAÇÃO E WHATSAPP (Finalizado)
// ==========================================

function gerarResumoWhatsApp() {
    // 1. Dados da Igreja e do Evento
    const nomeIgreja = "ICM - Dona Augusta";
    const tipoEvento = document.getElementById('tipo_evento')?.value || "Evento";
    const dataCulto = document.getElementById('data_chamada')?.value || "";

    // 2. Dados de Público
    const membrosAd = document.getElementById('cont_membros_adultos')?.innerText || 0;
    const membrosCi = document.getElementById('cont_membros_cias')?.innerText || 0;
    const totalVisAd = document.getElementById('cont_vis_adultos_display')?.innerText || 0;
    const totalVisCi = document.getElementById('cont_vis_cias_display')?.innerText || 0;
    const totalGeral = document.getElementById('cont_total')?.innerText || 0;

    // 3. Dados da Escala
    const pregador = document.getElementById('pregador_nome')?.value.trim() || "";
    const louvor = document.getElementById('louvor_nome')?.value.trim() || "";
    const portao = document.getElementById('portao_nome')?.value.trim() || "Não informado";
    const texto = document.getElementById('texto_biblico')?.value.trim() || "Não informado";
    const obs = document.getElementById('observacoes_culto')?.value.trim() || "";

    // 4. Lógica de Dirigente vs Pregador/Louvor
    let blocoEscala = "";
    if (pregador === louvor && pregador !== "") {
        blocoEscala = `👤 *Dirigente:* ${pregador}\n`;
    } else {
        if (pregador) blocoEscala += `🎤 *Pregador:* ${pregador}\n`;
        if (louvor)   blocoEscala += `🎶 *Louvor:* ${louvor}\n`;
    }
    blocoEscala += `🚪 *Portão:* ${portao}\n`;

    // 5. Montagem da Mensagem Personalizada
    let mensagem = `*⛪ ${nomeIgreja}*\n`;
    mensagem += `*📊 RESUMO: ${tipoEvento.toUpperCase()} - ${dataCulto}*\n\n`;
    
    mensagem += `*PÚBLICO:*\n`;
    mensagem += `• Membros (Ad/Cia): ${membrosAd} / ${membrosCi}\n`;
    mensagem += `• Visitantes (Ad/Cia): ${totalVisAd} / ${totalVisCi}\n`;
    mensagem += `*⭐ TOTAL GERAL: ${totalGeral}*\n\n`;
    
    mensagem += `*ESCALA:*\n${blocoEscala}`;
    mensagem += `📖 *Texto:* ${texto}\n`;
    
    if (obs) {
        mensagem += `\n📝 *Obs:* ${obs}\n`;
    }

    mensagem += `\n_Gerado via Sistema de Gestão ICM_`;

    // 6. Enviar
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank');
}

// ==========================================
// 6. PLACAR E SUGESTÕES (Ajustado: Case Insensitive)
// ==========================================

function atualizarContadores() {
    let mAd = 0, mCi = 0, vLAd = 0, vLCi = 0;
    document.querySelectorAll('.check-presenca:checked').forEach(cb => {
        // Normaliza para ignorar acentos e maiúsculas
        let cat = (cb.getAttribute('data-categoria') || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        let sit = (cb.getAttribute('data-situacao') || "").toLowerCase();
        
        // Verifica categorias de crianças/jovens
        const eCia = (cat.includes('crianca') || cat.includes('intermediario') || cat.includes('adolescente'));
        
        if (sit.includes('visitante')) { 
            if (eCia) vLCi++; else vLAd++; 
        } else { 
            if (eCia) mCi++; else mAd++; 
        }
    });

    const vDAd = parseInt(document.getElementById('vis_adultos')?.value) || 0;
    const vDCi = parseInt(document.getElementById('vis_cias')?.value) || 0;

    if(document.getElementById('cont_membros_adultos')) document.getElementById('cont_membros_adultos').innerText = mAd;
    if(document.getElementById('cont_membros_cias')) document.getElementById('cont_membros_cias').innerText = mCi;
    if(document.getElementById('cont_vis_adultos_display')) document.getElementById('cont_vis_adultos_display').innerText = vLAd + vDAd;
    if(document.getElementById('cont_vis_cias_display')) document.getElementById('cont_vis_cias_display').innerText = vLCi + vDCi;
    if(document.getElementById('cont_total')) document.getElementById('cont_total').innerText = mAd + mCi + vLAd + vDAd + vLCi + vDCi;
}

async function carregarSugestoesMembros() {
    const listagem = document.getElementById('listaMembrosSugestao');
    if (!listagem) return;
    try {
        // Busca apenas quem está com "Ativo" (A maiúsculo conforme seu banco)
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

async function carregarGruposNoSelect() {
    const selectUsuarios = document.getElementById('grupo_vinculado'); // Select na tela de Usuários
    const selectMembros = document.getElementById('grupo');           // Select na tela de Membros
    
    if (!selectUsuarios && !selectMembros) return;

    try {
        const { data, error } = await _supabase.from('grupos').select('nome').order('nome');
        if (error || !data) return;

        const optionsHtml = data.map(g => `<option value="${g.nome}">${g.nome}</option>`).join('');

        if (selectUsuarios) {
            selectUsuarios.innerHTML = '<option value="">Todos (Admin)</option>' + optionsHtml;
        }
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