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

    // Nível Livre
    if (usuario.nivel === 'Livre') {
        const proibidas = ['dashboard.html', 'cadastro-membro.html', 'admin-usuarios.html', 'admin-grupos.html', 'chamada.html', 'lista-membros.html'];
        if (proibidas.some(p => urlAtual.includes(p))) {
            window.location.href = 'livre.html';
            return usuario;
        }
    }

    // Nível User (Líder)
    if (usuario.nivel === 'User') {
        const adminPaginas = ['admin-usuarios.html', 'admin-grupos.html'];
        if (adminPaginas.some(p => urlAtual.includes(p))) {
            window.location.href = 'dashboard.html';
            return usuario;
        }
    }
    return usuario;
}

// Função para ocultar botões baseado no nível de acesso
function ajustarInterfacePorPerfil() {
    const user = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!user) return;

    // IMPORTANTE: Use o nome da coluna exatamente como está no seu banco/localStorage
    const nivel = user.permissao || user.nivel; 

    const btnChamada = document.getElementById('btnChamada');
    const btnCadastro = document.getElementById('idBtnCadastro');
    const btnLista = document.getElementById('btnLista');
    const btnGrupos = document.getElementById('btnGrupos');
    const btnUsuarios = document.getElementById('btnUsuarios');

    // Resetamos para o padrão (escondendo os de admin por segurança)
    if (btnGrupos) btnGrupos.style.display = 'none';
    if (btnUsuarios) btnUsuarios.style.display = 'none';

    // 1. ADMIN / MASTER: Vê tudo
    if (nivel === 'Admin' || nivel === 'Master') {
        if (btnGrupos) btnGrupos.style.display = 'block';
        if (btnUsuarios) btnUsuarios.style.display = 'block';
        if (btnChamada) btnChamada.style.display = 'block';
        if (btnCadastro) btnCadastro.style.display = 'block';
        if (btnLista) btnLista.style.display = 'block';
    }

    // 2. USER (Responsável de Grupo): Não faz chamada nem cadastro
    if (nivel === 'User') {
        if (btnChamada) btnChamada.style.display = 'none';
        if (btnCadastro) btnCadastro.style.display = 'none';
        if (btnLista) btnLista.style.display = 'block';
    }

    // 3. APOIO: Só faz chamada
    if (nivel === 'Apoio') {
        if (btnChamada) btnChamada.style.display = 'block';
        if (btnCadastro) btnCadastro.style.display = 'none';
        if (btnLista) btnLista.style.display = 'none';
    }
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

        // SALVAMENTO PADRONIZADO (Nivel e Permissao agora são iguais)
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
        alert('⚠️ Erro ao conectar. Verifique sua internet.');
    }
}

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = '../index.html';
}

// ==========================================
// 3. MÓDULO DE MEMBROS (CADASTRO, LISTA, EDIÇÃO)
// ==========================================

async function renderizarListaMembros() {
    const corpoTabela = document.getElementById('corpoTabelaMembros');
    if (!corpoTabela) return;

    const user = verificarAcesso();
    try {
        let consulta = _supabase.from('membros').select('*');
        
        // REGRA: Se não for Admin/Master, vê apenas o seu grupo
        if (user.nivel !== 'Admin' && user.nivel !== 'Master') {
            consulta = consulta.eq('grupo', user.grupo); 
        }

        const { data, error } = await consulta.order('nome', { ascending: true });
        if (error) throw error;

        corpoTabela.innerHTML = data.map(m => {
            // TRAVA VISUAL: Apenas Admin/Master vê botões de editar e excluir
            const ehAdmin = (user.nivel === 'Admin' || user.nivel === 'Master');
            
            return `
            <tr>
                <td>${m.nome} ${m.apelido ? `<br><small>(${m.apelido})</small>` : ''}</td> 
                <td>${m.categoria}</td>
                <td>${m.grupo || 'Sem Grupo'}</td>
                <td>${m.situacao}</td>
                <td style="text-align:center;">
                    ${ehAdmin ? `
                        <button onclick="prepararEdicao('${m.id}')" style="background:none; border:none; cursor:pointer;" title="Editar">✏️</button>
                        <button onclick="excluirMembro('${m.id}')" style="background:none; border:none; cursor:pointer;" title="Excluir">🗑️</button>
                    ` : '<span title="Acesso restrito">🔒</span>'}
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        corpoTabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar lista.</td></tr>";
    }
}

async function cadastrarMembro(dados) {
    const user = verificarAcesso();
    // SEGURANÇA: Bloqueia tentativa de cadastro via console/comando por User/Apoio
    if (user.nivel === 'User' || user.nivel === 'Apoio') {
        alert("⚠️ Você não tem permissão para cadastrar membros.");
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
        return true;
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
        return false;
    }
}

async function atualizarMembro(id, dados) {
    const user = verificarAcesso();
    // SEGURANÇA: Bloqueia tentativa de atualização por perfis restritos
    if (user.nivel !== 'Admin' && user.nivel !== 'Master') {
        alert("⚠️ Apenas o Secretário (Admin) pode alterar dados de membros.");
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
            dia: parseInt(dados.niver_dia),
            mes: dados.niver_mes,
            familia_id: dados.familia_vinculo
        }).eq('id', id);
        if (error) throw error;
        return true;
    } catch (err) {
        alert("Erro ao atualizar: " + err.message);
        return false;
    }
}

async function prepararEdicao(id) {
    localStorage.setItem('idMembroEdicao', id);
    window.location.href = 'cadastro-membro.html';
}

async function excluirMembro(id) {
    const user = verificarAcesso();
    if (user.nivel !== 'Admin' && user.nivel !== 'Master') {
        return alert("⚠️ Você não tem permissão para excluir membros.");
    }

    if (!confirm("Deseja realmente excluir este membro?")) return;
    await _supabase.from('membros').delete().eq('id', id);
    renderizarListaMembros();
}

// ==========================================
// 4. MÓDULO DE CHAMADA E ATA (PRESENÇA)
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
            .eq('status_registro', 'Ativo')
            .order('nome');
        
        if (errM) throw errM;

        let jaRegistrados = [];
        let resumoExistente = null;

        if (dataSelecionada && eventoSelecionado) {
            const { data: pres } = await _supabase.from('presencas')
                .select('membro_id, presenca')
                .eq('data_culto', dataSelecionada)
                .eq('tipo_evento', eventoSelecionado);
            jaRegistrados = pres || [];

            const { data: resu } = await _supabase.from('resumo_culto')
                .select('*')
                .eq('data_culto', dataSelecionada)
                .eq('tipo_evento', eventoSelecionado)
                .eq('grupo', user.grupo || 'Geral')
                .maybeSingle();
            resumoExistente = resu;
        }

        if (resumoExistente) {
            if(document.getElementById('vis_adultos')) document.getElementById('vis_adultos').value = resumoExistente.vis_adultos || 0;
            if(document.getElementById('vis_cias')) document.getElementById('vis_cias').value = resumoExistente.vis_cias || 0;
            if(document.getElementById('pregador_nome')) document.getElementById('pregador_nome').value = resumoExistente.pregador_nome || "";
            if(document.getElementById('pregador_funcao')) document.getElementById('pregador_funcao').value = resumoExistente.pregador_funcao || "Pastor";
            if(document.getElementById('texto_biblico')) document.getElementById('texto_biblico').value = resumoExistente.texto_biblico || "";
            if(document.getElementById('louvor_nome')) document.getElementById('louvor_nome').value = resumoExistente.louvor_nome || "";
            if(document.getElementById('louvor_funcao')) document.getElementById('louvor_funcao').value = resumoExistente.louvor_funcao || "Membro";
            if(document.getElementById('portao_nome')) document.getElementById('portao_nome').value = resumoExistente.portao_nome || "";
            if(document.getElementById('portao_funcao')) document.getElementById('portao_funcao').value = resumoExistente.portao_funcao || "Obreiro";
        }

        container.innerHTML = membros.map(m => {
            const reg = jaRegistrados.find(r => r.membro_id === m.id);
            const estaPresente = reg ? reg.presenca : false;
            const partesNome = m.nome.trim().split(" ");
            const nomeCurto = partesNome.length > 1 ? `${partesNome[0]} ${partesNome[1]}` : partesNome[0];
            
            // Compara em minúsculo para evitar erro de Membro/membro
            const sit = (m.situacao || "").toLowerCase();
            const eVisitante = sit.includes('visitante');

            const nomeExibicao = m.apelido ? `<strong>${m.apelido}</strong> <br><small style="color:#666">(${nomeCurto})</small>` : `<strong>${nomeCurto}</strong>`;

            return `
                <div class="card-chamada" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid #ddd; margin-bottom:8px; border-radius:8px; background:${estaPresente ? '#e8f5e9' : '#fff'};">
                    <span>${nomeExibicao} <br><small style="color:#888; font-size: 0.8em;">${m.grupo}${eVisitante ? ' <span style="color:#d32f2f">(Vis)</span>' : ''}</small></span>
                    <input type="checkbox" class="check-presenca" 
                        onchange="atualizarContadores()" 
                        data-id="${m.id}" 
                        data-categoria="${m.categoria || 'Adulto'}" 
                        data-situacao="${m.situacao || 'Membro'}" 
                        ${estaPresente ? 'checked' : ''} 
                        style="width:28px; height:28px; cursor:pointer;">
                </div>`;
        }).join('');

        atualizarContadores();
    } catch (err) { 
        console.error("Erro fatal:", err);
    }
}

async function salvarChamada() {
    const btn = document.getElementById('btnFinalizar');
    const dataCulto = document.getElementById('data_chamada').value;
    const tipoEvento = document.getElementById('tipo_evento').value;
    const user = verificarAcesso();
    if (!dataCulto) return alert("⚠️ Selecione a data!");
    btn.disabled = true;

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
        portao_funcao: document.getElementById('portao_funcao').value
    };

    try {
        await _supabase.from('presencas').upsert(presencasMembros, { onConflict: 'membro_id, data_culto, tipo_evento' });
        await _supabase.from('resumo_culto').upsert([dadosAta], { onConflict: 'data_culto, tipo_evento, grupo' });
        alert(`✅ Salvo com sucesso!`);
        window.location.href = 'dashboard.html';
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
        btn.disabled = false;
    }
}

// ==========================================
// 5. UTILITÁRIOS E AUTOMAÇÃO (PLACAR E SUGESTÕES)
// ==========================================

function atualizarContadores() {
    let membrosAd = 0;
    let membrosCi = 0;
    let visListaAd = 0;
    let visListaCi = 0;

    document.querySelectorAll('.check-presenca:checked').forEach(cb => {
        // Normalização: tudo para minúsculo e sem acento
        let cat = (cb.getAttribute('data-categoria') || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        let sit = (cb.getAttribute('data-situacao') || "").toLowerCase();

        const eCia = (cat.includes('crianca') || cat.includes('intermediario') || cat.includes('adolescente'));

        // Lógica de separação Membro vs Visitante
        if (sit.includes('visitante')) {
            if (eCia) visListaCi++; else visListaAd++;
        } else {
            // Se não for visitante, assume-se que é Membro
            if (eCia) membrosCi++; else membrosAd++;
        }
    });

    const visDigitadoAd = parseInt(document.getElementById('vis_adultos')?.value) || 0;
    const visDigitadoCi = parseInt(document.getElementById('vis_cias')?.value) || 0;

    const totalVisAd = visListaAd + visDigitadoAd;
    const totalVisCi = visListaCi + visDigitadoCi;

    if(document.getElementById('cont_membros_adultos')) document.getElementById('cont_membros_adultos').innerText = membrosAd;
    if(document.getElementById('cont_membros_cias')) document.getElementById('cont_membros_cias').innerText = membrosCi;
    if(document.getElementById('cont_vis_adultos_display')) document.getElementById('cont_vis_adultos_display').innerText = totalVisAd;
    if(document.getElementById('cont_vis_cias_display')) document.getElementById('cont_vis_cias_display').innerText = totalVisCi;

    const totalGeral = membrosAd + membrosCi + totalVisAd + totalVisCi;
    if(document.getElementById('cont_total')) document.getElementById('cont_total').innerText = totalGeral;
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
// 6. MÓDULO ADMINISTRATIVO (TABELAS E SELECTS)
// ==========================================

// --- TABELAS ---

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
                    <button onclick="deletarGrupo('${g.id}')" style="border:none; background:none; cursor:pointer;">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (err) { 
        console.error("Erro nos grupos:", err);
        corpo.innerHTML = "<tr><td colspan='2'>Erro ao carregar dados.</td></tr>";
    }
}

async function renderizarUsuarios() {
    const corpo = document.getElementById('corpoTabelaUsuarios');
    if (!corpo) return;
    try {
        const { data, error } = await _supabase.from('usuarios').select('*').order('login');
        if (error) throw error;
        corpo.innerHTML = data.map(u => `
            <tr>
                <td>${u.login}</td>
                <td>${u.permissao}</td>
                <td>${u.grupo_vinculado || 'Geral'}</td>
                <td style="text-align:center;">
                    <button onclick="deletarUsuario('${u.id}')" style="border:none; background:none; cursor:pointer;">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (err) { 
        console.error("Erro nos usuários:", err);
        corpo.innerHTML = "<tr><td colspan='4'>Erro ao carregar dados.</td></tr>";
    }
}

// --- SELECTS E NAVEGAÇÃO ---

async function carregarGruposNoSelect() {
    const select = document.getElementById('grupo_vinculado');
    if (!select) return;
    const { data } = await _supabase.from('grupos').select('nome').order('nome');
    if (data) {
        select.innerHTML = '<option value="">Selecione um Grupo</option>' + 
            data.map(g => `<option value="${g.nome}">${g.nome}</option>`).join('');
    }
}

async function carregarMembrosParaVinculo() {
    const select = document.getElementById('vinculo_familia');
    if (!select) return;
    const { data } = await _supabase.from('membros').select('id, nome, familia_id').order('nome');
    if (data) {
        select.innerHTML = '<option value="">Individual / Novo Responsável</option>' + 
            data.map(m => `<option value="${m.familia_id || m.id}">${m.nome}</option>`).join('');
    }
}

function voltarAoPainelCorrespondente() {
    const u = JSON.parse(localStorage.getItem('usuarioLogado'));
    window.location.href = u?.nivel === 'Livre' ? 'livre.html' : 'dashboard.html';
}

// --- AÇÕES DE EXCLUSÃO ---

async function deletarGrupo(id) {
    if (confirm("Deseja excluir este grupo?")) {
        const { error } = await _supabase.from('grupos').delete().eq('id', id);
        if (!error) renderizarGrupos();
    }
}

async function deletarUsuario(id) {
    if (confirm("Deseja excluir este usuário?")) {
        const { error } = await _supabase.from('usuarios').delete().eq('id', id);
        if (!error) renderizarUsuarios();
    }
}

// ==========================================
// 8. INICIALIZAÇÃO AUTOMÁTICA POR PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const url = window.location.href;

    // --- PROTEÇÃO GLOBAL DE INTERFACE ---
    // Executa em todas as páginas para esconder botões proibidos
    if (typeof ajustarInterfacePorPerfil === "function") {
        ajustarInterfacePorPerfil();
    }

    // 1. GATILHO: LOGIN
    const formLogin = document.getElementById('loginForm');
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            realizarLogin(document.getElementById('usuario').value, document.getElementById('senha').value);
        });
    }

    // 2. GATILHO: GERENCIAR USUÁRIOS (admin-usuarios.html)
    if (url.includes('admin-usuarios.html')) {
        if (typeof renderizarUsuarios === "function") renderizarUsuarios();
        if (typeof carregarGruposNoSelect === "function") carregarGruposNoSelect();
    }

    // 3. GATILHO: GERENCIAR GRUPOS (admin-grupos.html)
    if (url.includes('admin-grupos.html')) {
        if (typeof renderizarGrupos === "function") renderizarGrupos();
    }

    // 4. GATILHO: LISTA DE MEMBROS
    if (url.includes('lista-membros.html')) {
        if (typeof renderizarListaMembros === "function") renderizarListaMembros();
    }
    
    // 5. GATILHO: TELA DE CHAMADA
    if (url.includes('chamada.html')) {
        const user = verificarAcesso();
        // Bloqueio: User (Responsável) não pode entrar na chamada
        if (user && user.nivel === 'User') {
            alert("Acesso restrito: Responsáveis de grupo não realizam chamadas.");
            window.location.href = 'dashboard.html';
        } else {
            if (typeof carregarSugestoesMembros === "function") carregarSugestoesMembros();
        }
    }

    // 6. GATILHO: CADASTRO DE MEMBROS
    if (url.includes('cadastro-membro.html')) {
        const user = verificarAcesso();
        // Bloqueio: Apenas Admin/Master pode cadastrar ou editar
        if (user && user.nivel !== 'Admin' && user.nivel !== 'Master') {
            alert("Acesso negado: Apenas o Secretário pode gerenciar cadastros.");
            window.location.href = 'dashboard.html';
        } else {
            if (typeof carregarMembrosParaVinculo === "function") carregarMembrosParaVinculo();
        }
    }
});

// ==========================================
// 9. MÓDULO DE RELATÓRIOS E ACOMPANHAMENTO
// ==========================================

async function gerarRelatorio() {
    const dataFiltro = document.getElementById('filtroData').value;
    const corpoRelatorio = document.getElementById('corpoRelatorio');
    const resumo = document.getElementById('resumoCards');

    if (!dataFiltro) return alert("Por favor, selecione uma data.");

    try {
        const user = verificarAcesso();
        
        // 1. Buscar todos os membros (filtrando por grupo se for User)
        let queryMembros = _supabase.from('membros').select('id, nome, grupo, situacao');
        if (user.nivel === 'User') {
            queryMembros = queryMembros.eq('grupo', user.grupo);
        }
        const { data: membros, error: errM } = await queryMembros;

        // 2. Buscar as presenças registradas naquela data
        const { data: presencas, error: errP } = await _supabase
            .from('chamadas') // Certifique-se que o nome da sua tabela de chamada é esse
            .select('membro_id')
            .eq('data_culto', dataFiltro);

        if (errM || errP) throw (errM || errP);

        // 3. Cruzar dados: Quem está na lista de membros mas NÃO está na lista de presenças?
        const idsPresentes = presencas.map(p => p.membro_id);
        
        let presentes = 0;
        let ausentes = 0;

        corpoRelatorio.innerHTML = membros.map(m => {
            const estaPresente = idsPresentes.includes(m.id);
            if (estaPresente) presentes++; else ausentes++;

            return `
                <tr style="border-left: 5px solid ${estaPresente ? '#2ed573' : '#ff4757'}">
                    <td>${m.nome}</td>
                    <td>${estaPresente ? '✅ Presente' : '⚠️ Não compareceu'}</td>
                    <td>
                        ${!estaPresente ? `<button class="btn-whatsapp" onclick="contatarMembro('${m.nome}')">📱 Cuidar</button>` : '---'}
                    </td>
                </tr>
            `;
        }).join('');

        // 4. Atualizar os Cards de Resumo
        resumo.innerHTML = `
            <div class="card-resumo"><h3>${presentes}</h3><p>Presentes</p></div>
            <div class="card-resumo" style="color: #ff4757"><h3>${ausentes}</h3><p>Ausentes</p></div>
        `;

    } catch (err) {
        console.error("Erro no relatório:", err);
        alert("Erro ao gerar relatório.");
    }
}

function contatarMembro(nome) {
    const mensagem = encodeURIComponent(`Paz do Senhor, irmão ${nome}! Sentimos sua falta no culto. Está tudo bem?`);
    window.open(`https://wa.me/?text=${mensagem}`, '_blank');
}