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

    if (usuario.nivel === 'Livre') {
        const proibidas = ['dashboard.html', 'cadastro-membro.html', 'admin-usuarios.html', 'admin-grupos.html', 'chamada.html', 'lista-membros.html', 'relatorio-presenca.html'];
        if (proibidas.some(p => urlAtual.includes(p))) {
            window.location.href = 'livre.html';
            return usuario;
        }
    }

    if (usuario.nivel === 'User' || usuario.nivel === 'Apoio') {
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
            nome: data.login,
            login: data.login,
            nivel: data.permissao,
            permissao: data.permissao,
            grupo: data.grupo_vinculado
        }));

        if (data.permissao === 'Livre') {
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
    try {
        let consulta = _supabase.from('membros').select('*');
        if (user.nivel !== 'Admin' && user.nivel !== 'Master') {
            consulta = consulta.eq('grupo', user.grupo); 
        }

        const { data, error } = await consulta.order('nome', { ascending: true });
        if (error) throw error;

        corpoTabela.innerHTML = data.map(m => {
            const ehAdmin = (user.nivel === 'Admin' || user.nivel === 'Master');
            return `
            <tr>
                <td>${m.nome} ${m.apelido ? `<br><small>(${m.apelido})</small>` : ''}</td> 
                <td>${m.categoria}</td>
                <td>${m.grupo || 'Sem Grupo'}</td>
                <td>${m.situacao}</td>
                <td style="text-align:center;">
                    ${ehAdmin ? `
                        <button onclick="prepararEdicao('${m.id}')" style="background:none; border:none; cursor:pointer;">✏️</button>
                        <button onclick="excluirMembro('${m.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
                    ` : '🔒'}
                </td>
            </tr>`;
        }).join('');
    } catch (err) { corpoTabela.innerHTML = "<tr><td>Erro ao carregar.</td></tr>"; }
}

async function cadastrarMembro(dados) {
    const user = verificarAcesso();
    if (user.nivel !== 'Admin' && user.nivel !== 'Master') return alert("Sem permissão");
    try {
        const { error } = await _supabase.from('membros').insert([{
            nome: dados.nome, apelido: dados.apelido, funcao: dados.funcao,
            situacao: dados.situacao, categoria: dados.categoria, sexo: dados.sexo,
            grupo: dados.grupo, dia: parseInt(dados.niver_dia) || 0, mes: dados.niver_mes,
            familia_id: dados.familia_vinculo || crypto.randomUUID(), status_registro: 'Ativo'
        }]);
        if (error) throw error;
        return true;
    } catch (err) { alert("Erro: " + err.message); return false; }
}

function prepararEdicao(id) {
    localStorage.setItem('idMembroEdicao', id);
    window.location.href = 'cadastro-membro.html';
}

async function excluirMembro(id) {
    if (!confirm("Excluir membro?")) return;
    await _supabase.from('membros').delete().eq('id', id);
    renderizarListaMembros();
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
// 5. MÓDULO DE AUTOMAÇÃO E WHATSAPP (Ajustado)
// ==========================================

function gerarResumoWhatsApp() {
    const membrosAd = document.getElementById('cont_membros_adultos')?.innerText || 0;
    const membrosCi = document.getElementById('cont_membros_cias')?.innerText || 0;
    const totalVisAd = document.getElementById('cont_vis_adultos_display')?.innerText || 0;
    const totalVisCi = document.getElementById('cont_vis_cias_display')?.innerText || 0;
    const totalGeral = document.getElementById('cont_total')?.innerText || 0;

    const pregador = document.getElementById('pregador_nome')?.value.trim() || "";
    const louvor = document.getElementById('louvor_nome')?.value.trim() || "";
    const portao = document.getElementById('portao_nome')?.value.trim() || "Não informado";
    const texto = document.getElementById('texto_biblico')?.value.trim() || "Não informado";
    const dataCulto = document.getElementById('data_chamada')?.value || "";
    const obs = document.getElementById('observacoes_culto')?.value.trim() || "";

    let blocoEscala = "";
    if (pregador === louvor && pregador !== "") {
        blocoEscala = `👤 *Dirigente:* ${pregador}\n`;
    } else {
        if (pregador) blocoEscala += `🎤 *Pregador:* ${pregador}\n`;
        if (louvor)   blocoEscala += `🎶 *Louvor:* ${louvor}\n`;
    }
    blocoEscala += `🚪 *Portão:* ${portao}\n`;

    let mensagem = `*📊 RESUMO DO CULTO - ${dataCulto}*\n\n`;
    mensagem += `*PÚBLICO:*\n`;
    mensagem += `• Membros (Ad/Cia): ${membrosAd} / ${membrosCi}\n`;
    mensagem += `• Visitantes (Ad/Cia): ${totalVisAd} / ${totalVisCi}\n`;
    mensagem += `*⭐ TOTAL GERAL: ${totalGeral}*\n\n`;
    mensagem += `*ESCALA:*\n${blocoEscala}`;
    mensagem += `📖 *Texto:* ${texto}\n`;
    if (obs) mensagem += `\n📝 *Obs:* ${obs}\n`;
    mensagem += `\n_Gerado via Sistema ICM_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank');
}

// ==========================================
// 6. PLACAR E SUGESTÕES
// ==========================================

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
    if(document.getElementById('cont_total')) document.getElementById('cont_total').innerText = mAd + mCi + vLAd + vDAd + vLCi + vDCi;
}

async function carregarSugestoesMembros() {
    const listagem = document.getElementById('listaMembrosSugestao');
    if (!listagem) return;
    try {
        const { data } = await _supabase.from('membros').select('nome, funcao').eq('status_registro', 'Ativo');
        listagem.innerHTML = data.map(m => `<option value="${m.nome}">${m.nome} (${m.funcao || 'Membro'})</option>`).join('');
        window.membrosCache = data;
    } catch (err) { console.error(err); }
}

function autoSelecionarFuncao(inputElement, selectId) {
    const nome = inputElement.value;
    const select = document.getElementById(selectId);
    if (!window.membrosCache || !select) return;
    const membro = window.membrosCache.find(m => m.nome === nome);
    if (membro && membro.funcao) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === membro.funcao) { select.selectedIndex = i; break; }
        }
    }
}

// ==========================================
// 7. MÓDULO ADMINISTRATIVO
// ==========================================

async function renderizarGrupos() {
    const corpo = document.getElementById('corpoTabelaGrupos');
    if (!corpo) return;
    const { data } = await _supabase.from('grupos').select('*').order('nome');
    corpo.innerHTML = data.map(g => `<tr><td>${g.nome}</td><td><button onclick="deletarGrupo('${g.id}')">🗑️</button></td></tr>`).join('');
}

async function renderizarUsuarios() {
    const corpo = document.getElementById('corpoTabelaUsuarios');
    if (!corpo) return;
    const { data } = await _supabase.from('usuarios').select('*').order('login');
    corpo.innerHTML = data.map(u => `<tr><td>${u.login}</td><td>${u.permissao}</td><td>${u.grupo_vinculado}</td><td><button onclick="deletarUsuario('${u.id}')">🗑️</button></td></tr>`).join('');
}

async function carregarGruposNoSelect() {
    const select = document.getElementById('grupo_vinculado');
    if (!select) return;
    const { data } = await _supabase.from('grupos').select('nome');
    if (data) select.innerHTML = '<option value="">Selecione</option>' + data.map(g => `<option value="${g.nome}">${g.nome}</option>`).join('');
}

// ==========================================
// 8. INTERFACE E PERMISSÕES
// ==========================================

function ajustarInterfacePorPerfil() {
    const user = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!user) return;
    const nivel = user.permissao || user.nivel; 
    const b = {
        chamada: document.getElementById('btnChamada'),
        cadastro: document.getElementById('idBtnCadastro'),
        lista: document.getElementById('btnLista'),
        grupos: document.getElementById('btnGrupos'),
        usuarios: document.getElementById('btnUsuarios'),
        relatorios: document.getElementById('btnRelatorios')
    };

    if (nivel === 'Admin' || nivel === 'Master') {
        Object.values(b).forEach(el => { if(el) el.style.display = 'flex'; });
    } else if (nivel === 'User') {
        if (b.lista) b.lista.style.display = 'flex';
        if (b.relatorios) b.relatorios.style.display = 'flex';
        [b.chamada, b.cadastro, b.grupos, b.usuarios].forEach(el => { if(el) el.style.display = 'none'; });
    } else if (nivel === 'Apoio') {
        if (b.chamada) b.chamada.style.display = 'flex';
        [b.cadastro, b.lista, b.relatorios, b.grupos, b.usuarios].forEach(el => { if(el) el.style.display = 'none'; });
    }
}

// ==========================================
// 9. RELATÓRIOS E ACOMPANHAMENTO
// ==========================================

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

// ==========================================
// 10. INICIALIZAÇÃO AUTOMÁTICA
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const url = window.location.href;
    ajustarInterfacePorPerfil();

    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            realizarLogin(document.getElementById('usuario').value, document.getElementById('senha').value);
        });
    }

    if (url.includes('admin-usuarios.html')) { renderizarUsuarios(); carregarGruposNoSelect(); }
    if (url.includes('admin-grupos.html')) { renderizarGrupos(); }
    if (url.includes('lista-membros.html')) { renderizarListaMembros(); }
    if (url.includes('chamada.html')) { carregarSugestoesMembros(); }
});