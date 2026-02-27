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
        if (user.nivel !== 'Admin' && user.nivel !== 'Master') {
            consulta = consulta.eq('grupo', user.grupo); 
        }

        const { data, error } = await consulta.order('nome', { ascending: true });
        if (error) throw error;

        corpoTabela.innerHTML = data.map(m => `
            <tr>
                <td>${m.nome} ${m.apelido ? `<br><small>(${m.apelido})</small>` : ''}</td> 
                <td>${m.categoria}</td>
                <td>${m.grupo || 'Sem Grupo'}</td>
                <td>${m.situacao}</td>
                <td>
                    <button onclick="prepararEdicao('${m.id}')" style="background:none; border:none; cursor:pointer;">✏️</button>
                    <button onclick="excluirMembro('${m.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
                </td>
            </tr>`).join('');
    } catch (err) {
        corpoTabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar lista.</td></tr>";
    }
}

async function cadastrarMembro(dados) {
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
        const { data: membros } = await _supabase.from('membros').select('id, nome, apelido, grupo').eq('status_registro', 'Ativo').order('nome');
        
        let jaRegistrados = [];
        let resumoExistente = null;

        if (dataSelecionada && eventoSelecionado) {
            const { data: pres } = await _supabase.from('presencas').select('membro_id, presenca').eq('data_culto', dataSelecionada).eq('tipo_evento', eventoSelecionado);
            jaRegistrados = pres || [];

            const { data: resu } = await _supabase.from('resumo_culto').select('*').eq('data_culto', dataSelecionada).eq('tipo_evento', eventoSelecionado).eq('grupo', user.grupo || 'Geral').maybeSingle();
            resumoExistente = resu;
        }

        // Atualiza campos da Ata
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
        }

        container.innerHTML = membros.map(m => {
            const reg = jaRegistrados.find(r => r.membro_id === m.id);
            const estaPresente = reg ? reg.presenca : false;
            const nomeExibicao = m.apelido ? `<strong>${m.apelido}</strong> <small>(${m.nome})</small>` : m.nome;

            return `
                <div class="card-chamada" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid #ddd; margin-bottom:8px; border-radius:8px; background:${estaPresente ? '#e8f5e9' : '#fff'};">
                    <span>${nomeExibicao} <br><small style="color:#666">${m.grupo}</small></span>
                    <input type="checkbox" class="check-presenca" onchange="atualizarContadores()" data-id="${m.id}" ${estaPresente ? 'checked' : ''} style="width:25px; height:25px;">
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
    const elM = document.getElementById('cont_membros');
    if (!elM) return;

    const membros = document.querySelectorAll('.check-presenca:checked').length;
    const vAd = parseInt(document.getElementById('vis_adultos')?.value) || 0;
    const vCi = parseInt(document.getElementById('vis_cias')?.value) || 0;

    elM.innerText = membros;
    if(document.getElementById('cont_visitantes')) document.getElementById('cont_visitantes').innerText = vAd + vCi;
    if(document.getElementById('cont_total')) document.getElementById('cont_total').innerText = membros + vAd + vCi;
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
            if (select.options[i].value === membro.funcao) {
                select.selectedIndex = i;
                break;
            }
        }
    }
}

// ==========================================
// 6. MÓDULO ADMINISTRATIVO (GRUPOS E USUÁRIOS)
// ==========================================

async function carregarGruposNoSelect() {
    const select = document.getElementById('grupo_vinculado');
    if (!select) return;
    const { data } = await _supabase.from('grupos').select('nome').order('nome');
    select.innerHTML = '<option value="">Selecione um Grupo</option>' + 
        data.map(g => `<option value="${g.nome}">${g.nome}</option>`).join('');
}

async function carregarMembrosParaVinculo() {
    const select = document.getElementById('vinculo_familia');
    if (!select) return;
    const { data } = await _supabase.from('membros').select('id, nome, familia_id').order('nome');
    select.innerHTML = '<option value="">Individual / Novo Responsável</option>' + 
        data.map(m => `<option value="${m.familia_id || m.id}">${m.nome}</option>`).join('');
}

function voltarAoPainelCorrespondente() {
    const u = JSON.parse(localStorage.getItem('usuarioLogado'));
    window.location.href = u?.nivel === 'Livre' ? 'livre.html' : 'dashboard.html';
}

// ==========================================
// 7. MÓDULO DE SENHA
// ==========================================
function toggleSenha() {
    const form = document.getElementById('formSenha');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function salvarNovaSenha() {
    const novaSenha = document.getElementById('inputNovaSenha').value.trim();
    if (novaSenha.length < 4) return alert("⚠️ Mínimo 4 caracteres.");
    
    const user = verificarAcesso();
    const { error } = await _supabase.from('usuarios').update({ senha: novaSenha }).eq('login', user.login);
    if (error) alert("Erro: " + error.message);
    else { alert("✅ Senha alterada!"); toggleSenha(); }
}

// ==========================================
// 8. INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('loginForm');
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            realizarLogin(document.getElementById('usuario').value, document.getElementById('senha').value);
        });
    }
});