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
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    // 1. Verifica se está logado
    if (!usuario) {
        if (!window.location.href.includes('index.html')) {
            window.location.href = '../index.html';
        }
        return null;
    }

    // 2. Trava de Segurança por Nível (Blindagem)
    const urlAtual = window.location.href;

    // Se o usuário for nível "Livre", ele SÓ pode acessar livre.html ou mensagens.html
    if (usuario.nivel === 'Livre') {
        const paginasProibidas = ['dashboard.html', 'cadastro-membro.html', 'admin-usuarios.html', 'admin-grupos.html', 'chamada.html', 'lista-membros.html'];
        
        if (paginasProibidas.some(p => urlAtual.includes(p))) {
            alert('🚫 Seu acesso é restrito à área de consulta.');
            window.location.href = 'livre.html';
            return usuario;
        }
    }

    // Se o usuário for "User" (Líder), ele não pode acessar as telas de Admin/Master
    if (usuario.nivel === 'User') {
        const paginasAdmin = ['admin-usuarios.html', 'admin-grupos.html'];
        if (paginasAdmin.some(p => urlAtual.includes(p))) {
            alert('🚫 Acesso restrito a Administradores.');
            window.location.href = 'dashboard.html';
            return usuario;
        }
    }

    return usuario;
}

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = '../index.html';
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

        // Salva os dados no navegador para persistência
        localStorage.setItem('usuarioLogado', JSON.stringify({
            nome: data.login,
            nivel: data.permissao,// Usando a coluna 'permissao' do seu banco
            grupo: data.grupo_vinculado // Usando 'grupo_vinculado' do seu banco
        }));

        // Redirecionamento Inteligente por Nível
        console.log(`Logado como ${data.permissao}. Redirecionando...`);
        
        if (data.permissao === 'Livre') {
            window.location.href = 'pages/livre.html';
        } else {
            // Master, Admin e User (Líder) vão para o Dashboard
            window.location.href = 'pages/dashboard.html';
        }

    } catch (err) {
        console.error('Erro de Login:', err);
        alert('⚠️ Erro ao conectar ao sistema. Tente novamente.');
    }
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
        
        // CORREÇÃO: Usando 'user.grupo' (que definimos no login)
        if (user.nivel !== 'Admin' && user.nivel !== 'Master') {
            consulta = consulta.eq('grupo', user.grupo); 
        }

        const { data, error } = await consulta.order('nome', { ascending: true });
        if (error) throw error;

        corpoTabela.innerHTML = "";
        // Função renderizarListaMembros:
        data.forEach(m => {
            corpoTabela.innerHTML += `
                <tr>
                    <td>${m.nome}</td> 
                    <td>${m.categoria}</td>
                    <td>${m.grupo || 'Sem Grupo'}</td>
                    <td>${m.situacao}</td>
                    <td>
                        <button onclick="prepararEdicao('${m.id}')" style="background:none; border:none; color:blue; cursor:pointer; margin-right:10px;">✏️</button>
                        <button onclick="excluirMembro('${m.id}')" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
                    </td>
                </tr>`;
        });
    } catch (err) {
        console.error(err);
        corpoTabela.innerHTML = "<tr><td colspan='5'>Erro ao carregar lista.</td></tr>";
    }
}

// NOVA FUNÇÃO: Busca os parentes para o select de vínculo
async function carregarMembrosParaVinculo() {
    const select = document.getElementById('vinculo_familia');
    if (!select) return;

    try {
        const { data, error } = await _supabase
            .from('membros')
            .select('id, nome, familia_id')
            .order('nome', { ascending: true });

        if (error) throw error;

        select.innerHTML = '<option value="">Ninguém (Membro Individual / Novo Responsável)</option>';
        data.forEach(m => {
            const option = document.createElement('option');
            // Se já tem familia_id, usa ele. Se não, usa o ID dele para iniciar um grupo.
            option.value = m.familia_id || m.id; 
            option.text = m.nome;
            select.appendChild(option);
        });
    } catch (err) {
        console.error("Erro ao carregar vínculos:", err);
    }
}

async function cadastrarMembro(dados) {
    try {
        let familiaParaSalvar = dados.familia_vinculo;
        
        
        if (!familiaParaSalvar) {
            familiaParaSalvar = crypto.randomUUID(); 
        }

        const { error } = await _supabase.from('membros').insert([{
            nome: dados.nome,
            situacao: dados.situacao,
            categoria: dados.categoria,
            sexo: dados.sexo,
            grupo: dados.grupo,
            dia: parseInt(dados.niver_dia) || 0, // CORREÇÃO: Sua tabela usa 'dia'
            mes: dados.niver_mes,               // Sua tabela usa 'mes'
            familia_id: familiaParaSalvar,
            status_registro: 'Ativo'
        }]);

        if (error) throw error;
        return true;
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
        return false;
    }
}

async function excluirMembro(id) {
    if (!confirm("Deseja realmente excluir este membro?")) return;
    const { error } = await _supabase.from('membros').delete().eq('id', id);
    if (error) alert("Erro ao excluir: " + error.message);
    renderizarListaMembros();
}

// ==========================================
// 4. MÓDULO DE GRUPOS E USUÁRIOS (ADMIN)
// ==========================================

async function criarGrupo(nomeDoGrupo) {
    const { error } = await _supabase.from('grupos').insert([{ nome: nomeDoGrupo }]);
    if (error) { alert("Erro: " + error.message); return false; }
    alert("✅ Grupo adicionado!");
    return true;
}

async function renderizarGrupos() {
    const corpo = document.getElementById('corpoTabelaGrupos');
    if (!corpo) return;
    const { data } = await _supabase.from('grupos').select('*').order('nome');
    corpo.innerHTML = data.map(g => `
        <tr>
            <td style="padding:10px;">${g.nome}</td>
            <td style="text-align:center;"><button onclick="deletarGrupo('${g.id}')">🗑️</button></td>
        </tr>`).join('');
}

async function carregarGruposNoSelect() {
    const select = document.getElementById('grupo_vinculado');
    if (!select) return;
    const { data } = await _supabase.from('grupos').select('nome').order('nome');
    select.innerHTML = '<option value="">Selecione um Grupo</option>' + 
        data.map(g => `<option value="${g.nome}">${g.nome}</option>`).join('');
}

async function criarUsuario(dados) {
    const { error } = await _supabase.from('usuarios').insert([dados]);
    if (error) { alert("Erro: " + error.message); return false; }
    alert("✅ Usuário criado!");
    return true;
}

async function renderizarUsuarios() {
    const corpo = document.getElementById('corpoTabelaUsuarios');
    if (!corpo) return;
    const { data } = await _supabase.from('usuarios').select('*').order('login');
    corpo.innerHTML = data.map(u => `
        <tr>
            <td>${u.login}</td>
            <td>${u.permissao}</td>
            <td>${u.grupo_vinculado || 'Geral'}</td>
            <td style="text-align:center;"><button onclick="deletarUsuario('${u.id}')">🗑️</button></td>
        </tr>`).join('');
}

// ==========================================
// 5. MÓDULO DE CHAMADA E ATA (PRESENÇA) - ATUALIZADO
// ==========================================

async function renderizarListaChamada() {
    const container = document.getElementById('listaChamada');
    const dataSelecionada = document.getElementById('data_chamada').value;
    const eventoSelecionado = document.getElementById('tipo_evento').value;

    if (!container) return;

    try {
        const user = verificarAcesso();

        // 1. BUSCA MEMBROS ATIVOS
        const { data: membros, error: errMembros } = await _supabase.from('membros')
            .select('id, nome, apelido, grupo')
            .eq('status_registro', 'Ativo')
            .order('nome');

        if (errMembros) throw errMembros;

        // 2. BUSCA PRESENÇAS E ATA EXISTENTES
        let jaRegistrados = [];
        let resumoExistente = null;

        if (dataSelecionada && eventoSelecionado) {
            // Busca presenças individuais
            const { data: pres } = await _supabase.from('presencas')
                .select('membro_id, presenca')
                .eq('data_culto', dataSelecionada)
                .eq('tipo_evento', eventoSelecionado);
            jaRegistrados = pres || [];

            // Busca os dados da Ata (Resumo do Culto)
            const { data: resu } = await _supabase.from('resumo_culto')
                .select('*')
                .eq('data_culto', dataSelecionada)
                .eq('tipo_evento', eventoSelecionado)
                .eq('grupo', user.grupo || 'Geral')
                .maybeSingle();
            resumoExistente = resu;
        }

        // 3. ATUALIZA OS CAMPOS DA ATA NA TELA (Visitantes e Escalas)
        document.getElementById('vis_adultos').value = resumoExistente?.vis_adultos || 0;
        document.getElementById('vis_cias').value = resumoExistente?.vis_cias || 0;
        document.getElementById('pregador_nome').value = resumoExistente?.pregador_nome || "";
        document.getElementById('pregador_funcao').value = resumoExistente?.pregador_funcao || "Pastor";
        document.getElementById('texto_biblico').value = resumoExistente?.texto_biblico || "";
        document.getElementById('louvor_nome').value = resumoExistente?.louvor_nome || "";
        document.getElementById('louvor_funcao').value = resumoExistente?.louvor_funcao || "Membro";
        document.getElementById('portao_nome').value = resumoExistente?.portao_nome || "";
        document.getElementById('portao_funcao').value = resumoExistente?.portao_funcao || "Obreiro";

// 4. GERA A LISTA DE MEMBROS (COM GATILHO PARA O CONTADOR)
container.innerHTML = membros.map(m => {
    const registro = jaRegistrados.find(r => r.membro_id === m.id);
    const estaPresente = registro ? registro.presenca : false;

    const nomeExibicao = m.apelido ? `<strong>${m.apelido}</strong> <small>(${m.nome})</small>` : m.nome;

    return `
        <div class="card-chamada" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid #ddd; margin-bottom:8px; border-radius:8px; background:${estaPresente ? '#e8f5e9' : '#fff'};">
            <span>${nomeExibicao} <br><small style="color:#666">${m.grupo}</small></span>
            <input type="checkbox" 
                class="check-presenca" 
                onchange="atualizarContadores()" 
                data-id="${m.id}" 
                ${estaPresente ? 'checked' : ''} 
                style="width:25px; height:25px; cursor:pointer;">
        </div>`;
}).join('');

// Linha extra: Logo após gerar a lista, chamamos o contador para atualizar o placar inicial
atualizarContadores(); 

} catch (err) {
    console.error("Erro ao renderizar chamada:", err);
}

async function salvarChamada() {
    const btn = document.getElementById('btnFinalizar');
    const dataCulto = document.getElementById('data_chamada').value;
    const tipoEvento = document.getElementById('tipo_evento').value;
    const user = verificarAcesso();

    if (!dataCulto) return alert("⚠️ Selecione a data!");

    btn.disabled = true;
    btn.innerText = "Salvando...";

    // 1. DADOS DOS MEMBROS (Pega todos para atualizar quem foi desmarcado)
    const todosOsChecks = document.querySelectorAll('.check-presenca');
    const presencasMembros = Array.from(todosOsChecks).map(cb => ({
        membro_id: cb.getAttribute('data-id'),
        data_culto: dataCulto,
        tipo_evento: tipoEvento,
        presenca: cb.checked
    }));

    // 2. DADOS DO RESUMO/ATA
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
        // Salva frequencia individual
        const { error: err1 } = await _supabase
            .from('presencas')
            .upsert(presencasMembros, { onConflict: 'membro_id, data_culto, tipo_evento' });
        if (err1) throw err1;

        // Salva a Ata do Culto
        const { error: err2 } = await _supabase
            .from('resumo_culto')
            .upsert([dadosAta], { onConflict: 'data_culto, tipo_evento, grupo' });
        if (err2) throw err2;

        alert(`✅ Chamada e Ata de ${tipoEvento} salvas com sucesso!`);
        window.location.href = 'dashboard.html';

    } catch (err) {
        console.error(err);
        alert("❌ Erro ao salvar: " + err.message);
        btn.disabled = false;
        btn.innerText = "Finalizar Chamada";
    }
}

// ==========================================
// 6. MÓDULO DE MENSAGENS E SENHA
// ==========================================

async function mudarSenha(nova) {
    const user = verificarAcesso();
    const { error } = await _supabase.from('usuarios').update({ senha: nova }).eq('login', user.nome);
    if (error) { alert("Erro: " + error.message); return false; }
    alert("✅ Senha alterada!");
    return true;
}

// ==========================================
// 7. INICIALIZAÇÃO AUTOMÁTICA
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
// Novas funções (Não sabia que nome dar)
// Abre e fecha o formulário de senha na tela
function toggleSenha() {
    const form = document.getElementById('formSenha');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        // Limpa o campo de senha ao fechar ou abrir
        document.getElementById('inputNovaSenha').value = '';
    }
}

// Salva a nova senha no banco
async function salvarNovaSenha() {
    const input = document.getElementById('inputNovaSenha');
    const novaSenha = input.value.trim();
    
    if (novaSenha.length < 4) {
        alert("⚠️ A senha deve ter no mínimo 4 caracteres.");
        return;
    }

    const confirmacao = confirm("Deseja realmente alterar sua senha?");
    if (!confirmacao) return;

    // Chame a função que já temos no script.js
    const sucesso = await mudarSenha(novaSenha);
    
    if (sucesso) {
        toggleSenha(); // Fecha o formulário
        // Não redirecionamos, apenas avisamos que deu certo
    }
}

//detalhes que não vi
function voltarAoPainelCorrespondente() {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    if (!usuario) {
        window.location.href = '../index.html';
        return;
    }

    // Se for nível Livre, volta para livre.html. Se não, vai para o dashboard.
    if (usuario.nivel === 'Livre') {
        window.location.href = 'livre.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

// 1. Busca os dados do membro e leva para a página de cadastro
async function prepararEdicao(id) {
    // Salva o ID que queremos editar no navegador para não perder ao trocar de página
    localStorage.setItem('idMembroEdicao', id);
    // Redireciona para a página de cadastro (que agora servirá para editar também)
    window.location.href = 'cadastro-membro.html';
}

// 2. Função que salva a alteração no Supabase
async function atualizarMembro(id, dados) {
    try {
        const { error } = await _supabase
            .from('membros')
            .update({
                nome: dados.nome,
                situacao: dados.situacao,
                categoria: dados.categoria,
                sexo: dados.sexo,
                grupo: dados.grupo,
                dia: parseInt(dados.niver_dia),
                mes: dados.niver_mes,
                familia_id: dados.familia_vinculo // Permite mudar o vínculo familiar se precisar
            })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        alert("Erro ao atualizar: " + err.message);
        return false;
    }
}

// ==========================================
// 8. MÓDULO DE UTILITÁRIOS (SUGESTÕES)
// ==========================================

async function carregarSugestoesMembros() {
    const listagem = document.getElementById('listaMembrosSugestao');
    if (!listagem) return;

    try {
        // Agora buscamos NOME e CARGO (cargo é onde está Pastor, Diácono, etc)
        const { data, error } = await _supabase
            .from('membros')
            .select('nome, cargo')
            .eq('status_registro', 'Ativo');

        if (error) throw error;

        // Criamos as opções do datalist
        listagem.innerHTML = data.map(m => 
            `<option value="${m.nome}">${m.nome} (${m.cargo})</option>`
        ).join('');
        
        // Memória temporária para a função de auto-seleção funcionar
        window.membrosCache = data;

    } catch (err) {
        console.error("Erro ao carregar sugestões:", err);
    }
}

// Nova função para mudar o cargo automaticamente
function autoSelecionarFuncao(inputElement, selectId) {
    const nomeDigitado = inputElement.value;
    const selectCargo = document.getElementById(selectId);
    
    if (!window.membrosCache || !selectCargo) return;

    // Procura o membro no cache
    const membroEncontrado = window.membrosCache.find(m => m.nome === nomeDigitado);

    if (membroEncontrado) {
        const cargoDoBanco = membroEncontrado.cargo; 
        
        // Tenta encontrar o cargo no select e selecionar
        for (let i = 0; i < selectCargo.options.length; i++) {
            if (selectCargo.options[i].value === cargoDoBanco) {
                selectCargo.selectedIndex = i;
                break;
            }
        }
    }
}

// CONTADOR 
function atualizarContadores() {
    // 1. Conta quantos checkboxes de membros estão marcados
    const membrosPresentes = document.querySelectorAll('.check-presenca:checked').length;
    
    // 2. Soma os visitantes (Adultos + CIAs)
    const visAdultos = parseInt(document.getElementById('vis_adultos').value) || 0;
    const visCias = parseInt(document.getElementById('vis_cias').value) || 0;
    const totalVisitantes = visAdultos + visCias;

    // 3. Atualiza na tela
    document.getElementById('cont_membros').innerText = membrosPresentes;
    document.getElementById('cont_visitantes').innerText = totalVisitantes;
    document.getElementById('cont_total').innerText = membrosPresentes + totalVisitantes;
}