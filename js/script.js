// ==========================================
// 1. CONEXÃO E CHAVES
// ==========================================
const SUPABASE_URL = 'https://pxjczmjhzopfxwlmpjfv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4amN6bWpoem9wZnh3bG1wamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjUzMjYsImV4cCI6MjA4NzEwMTMyNn0.OfekQPuYUwsZu5X9_lPDGBbVTZYBvAQ5KdiFx3TFOCY';

let _supabase;
if (typeof supabase !== 'undefined') {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ==========================================
// 2. SEGURANÇA E ACESSO
// ==========================================

// VERIFICAÇÃO: Impede acesso de usuários não logados
function verificarAcesso() {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuario) {
        // Se estiver dentro de /pages/, volta um nível para o index
        window.location.href = '../index.html';
        return null;
    }
    return usuario;
}

// LOGOUT: Limpa a sessão e encerra o sistema
function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = '../index.html';
}

// LOGIN DINÂMICO: Busca credenciais na tabela 'usuarios' do Supabase
async function realizarLogin(usuarioDigitado, senhaDigitada) {
    try {
        // .ilike faz a busca ignorar se o usuário digitou maiúsculo ou minúsculo
        const { data, error } = await _supabase
            .from('usuarios')
            .select('*')
            .ilike('login', usuarioDigitado) 
            .eq('senha', senhaDigitada)
            .single();

        if (error || !data) {
            console.error("Erro Supabase:", error?.message);
            alert('❌ Login falhou! Verifique usuário e senha.');
            return;
        }

        // SALVAMENTO: Guarda nome, nível (Admin/Master/User) e o Grupo vinculado
        localStorage.setItem('usuarioLogado', JSON.stringify({
            nome: data.login,
            nivel: data.permissao,
            grupo: data.grupo_vinculado 
        }));
        
        // REDIRECIONAMENTO: Envia para o Dashboard após sucesso
        window.location.href = 'pages/dashboard.html';

    } catch (err) {
        console.error("Erro inesperado no sistema:", err);
        alert('⚠️ Ocorreu um erro ao tentar conectar.');
    }
}

// ==========================================
// 3. MÓDULO DE MEMBROS (Com Filtro de Grupo)
// ==========================================

async function buscarMembrosBanco() {
    try {
        const user = verificarAcesso();
        let query = _supabase.from('membros').select('*');

        // SE NÃO FOR ADMIN/MASTER, FILTRA PELO GRUPO DO USUÁRIO
        if (user && user.nivel === 'User' && user.grupo) {
            query = query.eq('grupo', user.grupo);
        }

        const { data, error } = await query.order('nome_completo', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar membros:', error.message);
        return [];
    }
}

async function cadastrarMembro(dadosMembro) {
    try {
        const { error } = await _supabase.from('membros').insert([{
            nome_completo: dadosMembro.nome,
            situacao: dadosMembro.situacao,
            categoria: dadosMembro.categoria,
            sexo: dadosMembro.sexo,
            grupo: dadosMembro.grupo,
            aniversario_dia: parseInt(dadosMembro.dia),
            aniversario_mes: dadosMembro.mes,
            status_registro: 'Ativo'
        }]);
        if (error) throw error;
        alert('✅ Sucesso ao cadastrar!');
        return true;
    } catch (error) {
        alert('❌ Erro: ' + error.message);
        return false;
    }
}

async function excluirMembro(id) {
    if (confirm("Deseja realmente EXCLUIR? Isso apagará todo o histórico.")) {
        try {
            const { error } = await _supabase.from('membros').delete().eq('id', id);
            if (error) throw error;
            location.reload();
        } catch (error) {
            alert("Erro: " + error.message);
        }
    }
}

async function alternarStatusMembro(id, statusAtual) {
    const novoStatus = statusAtual === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
        const { error } = await _supabase.from('membros').update({ status_registro: novoStatus }).eq('id', id);
        if (error) throw error;
        location.reload();
    } catch (error) {
        alert("Erro: " + error.message);
    }
}

// ==========================================
// 3. MÓDULO DE MEMBROS (Busca e Exibição)
// ==========================================

async function renderizarListaMembros() {
    const corpoTabela = document.getElementById('corpoTabelaMembros');
    if (!corpoTabela) return;

    const user = JSON.parse(localStorage.getItem('icm_user'));
    
    try {
        // Buscamos todos os campos
        let consulta = _supabase.from('membros').select('*');

        // Se não for Admin, filtra pela coluna 'grupo'
        if (user.nivel !== 'Admin' && user.nivel !== 'Master' && user.grupo_vinculado) {
            // Aqui comparamos o grupo do usuário com a coluna 'grupo' do membro
            consulta = consulta.eq('grupo', user.grupo_vinculado);
        }

        const { data, error } = await consulta.order('nome', { ascending: true });

        if (error) throw error;

        corpoTabela.innerHTML = "";
        data.forEach(m => {
            corpoTabela.innerHTML += `
                <tr>
                    <td>${m.nome}</td>
                    <td>${m.categoria}</td>
                    <td>${m.grupo || 'Sem Grupo'}</td>
                    <td>${m.situacao}</td>
                    <td><button onclick="verDetalhes('${m.id}')">Ver</button></td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Erro ao carregar lista:", err.message);
        corpoTabela.innerHTML = "<tr><td colspan='5'>Erro: " + err.message + "</td></tr>";
    }
}

// ==========================================
// 4. MÓDULO DE USUÁRIOS (Continuação)
// ==========================================

// Função para criar um novo usuário de acesso
async function criarUsuario(dados) {
    try {
        const { error } = await _supabase
            .from('usuarios')
            .insert([dados]);

        if (error) throw error;
        
        alert(`✅ Usuário "${dados.login}" criado com sucesso!`);
        return true;
    } catch (err) {
        console.error("Erro ao criar usuário:", err.message);
        alert("Erro ao criar usuário. Verifique se o login já existe.");
        return false;
    }
}

// Função para listar os usuários na tabela administrativa
async function renderizarUsuarios() {
    const corpoTabela = document.getElementById('corpoTabelaUsuarios');
    if (!corpoTabela) return;

    try {
        const { data, error } = await _supabase
            .from('usuarios')
            .select('*')
            .order('login', { ascending: true });

        if (error) throw error;

        corpoTabela.innerHTML = "";
        data.forEach(u => {
            // Não permitimos excluir o admin principal por aqui por segurança
            const podeExcluir = u.login !== 'admin'; 
            
            corpoTabela.innerHTML += `
                <tr>
                    <td style="padding: 8px;">${u.login}</td>
                    <td>${u.nivel}</td>
                    <td>${u.grupo_vinculado || 'Todos'}</td>
                    <td style="text-align: center;">
                        ${podeExcluir ? `<button onclick="removerUsuario('${u.id}')" style="background:#ff4757; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Excluir</button>` : '-'}
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Erro ao listar usuários:", err.message);
    }
}

// Função para remover um usuário
async function removerUsuario(id) {
    if (!confirm("Deseja realmente remover este acesso?")) return;

    try {
        const { error } = await _supabase.from('usuarios').delete().eq('id', id);
        if (error) throw error;
        renderizarUsuarios();
    } catch (err) {
        alert("Erro ao remover usuário.");
    }
}

// ==========================================
// 5. MÓDULO DE PRESENÇA (CHAMADA)
// ==========================================

// Gera a lista de membros com botões de presença
async function renderizarListaChamada() {
    const listaContainer = document.getElementById('listaChamada');
    if (!listaContainer) return;

    const user = JSON.parse(localStorage.getItem('icm_user'));
    
    try {
        let consulta = _supabase.from('membros').select('id, nome, grupo');

        if (user.nivel !== 'Admin' && user.nivel !== 'Master' && user.grupo_vinculado) {
            consulta = consulta.eq('grupo', user.grupo_vinculado);
        }

        const { data, error } = await consulta.order('nome');

        if (error) throw error;

        listaContainer.innerHTML = "";
        data.forEach(m => {
            listaContainer.innerHTML += `
                <div class="card-chamada" style="display: flex; align-items: center; justify-content: space-between; padding: 15px; margin-bottom:10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">
                    <span style="font-weight: bold;">${m.nome} (${m.grupo})</span>
                    <input type="checkbox" class="check-presenca" data-id="${m.id}" style="width: 25px; height: 25px;">
                </div>
            `;
        });
    } catch (err) {
        console.error("Erro na chamada:", err.message);
    }
}

// Salva as presenças marcadas no banco
async function salvarChamada() {
    const btn = document.getElementById('btnFinalizar');
    const dataCulto = document.getElementById('data_chamada').value;
    const checkboxes = document.querySelectorAll('.check-presenca');
    const presencas = [];

    btn.disabled = true;
    btn.innerText = "Salvando...";

    checkboxes.forEach(cb => {
        if (cb.checked) {
            presencas.push({
                membro_id: cb.getAttribute('data-id'),
                data_presenca: dataCulto,
                presente: true
            });
        }
    });

    if (presencas.length === 0) {
        if (!confirm("Ninguém marcado como presente. Deseja salvar assim mesmo?")) {
            btn.disabled = false;
            btn.innerText = "Finalizar Chamada";
            return;
        }
    }

    try {
        const { error } = await _supabase.from('presencas').insert(presencas);
        if (error) throw error;

        alert("✅ Chamada realizada com sucesso!");
        window.location.href = 'dashboard.html';
    } catch (err) {
        alert("Erro ao salvar chamada. Verifique a tabela 'presencas'.");
        console.error(err);
        btn.disabled = false;
        btn.innerText = "Finalizar Chamada";
    }
}

// ==========================================
// 6. INICIALIZAÇÃO (Ouvintes de Eventos)
// ==========================================

// Este evento dispara assim que o HTML termina de carregar
document.addEventListener('DOMContentLoaded', function() {
    
    // Conecta o formulário de login à função realizarLogin
    const formLogin = document.getElementById('loginForm');
    if (formLogin) {
        formLogin.addEventListener('submit', function(e) {
            e.preventDefault();
            const userIn = document.getElementById('usuario').value.trim();
            const passIn = document.getElementById('senha').value.trim();
            
            // Chama a função que criamos no Módulo 2
            realizarLogin(userIn, passIn);
        });
    }

    // Se estiver na página de Grupos, carrega a lista automaticamente
    if (document.getElementById('corpoTabelaGrupos')) {
        renderizarGrupos();
    }

    // Se estiver na página de Membros, carrega a lista automaticamente
    if (document.getElementById('corpoTabelaMembros')) {
        renderizarListaMembros();
    }
});

async function carregarGruposNoSelect() {
    const select = document.getElementById('grupo_vinculado');
    if (!select) return;

    const { data, error } = await _supabase
        .from('grupos')
        .select('nome')
        .order('nome', { ascending: true });

    if (!error && data) {
        select.innerHTML = '<option value="">Selecione um Grupo</option>';
        data.forEach(g => {
            select.innerHTML += `<option value="${g.nome}">${g.nome}</option>`;
        });
    }
}