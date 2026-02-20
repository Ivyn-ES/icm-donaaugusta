// ==========================================
// 1. CONEXÃO E CHAVES (Configurações de rede)
// ==========================================
const SUPABASE_URL = 'https://pxjczmjhzopfxwlmpjfv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4amN6bWpoem9wZnh3bG1wamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjUzMjYsImV4cCI6MjA4NzEwMTMyNn0.OfekQPuYUwsZu5X9_lPDGBbVTZYBvAQ5KdiFx3TFOCY';

// Verificação de segurança: Só inicializa o Supabase se a biblioteca estiver carregada
let _supabase;
if (typeof supabase !== 'undefined') {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ==========================================
// 2. FUNÇÕES DE BANCO DE DADOS (CRUD)
// ==========================================

// CREATE: Envia um novo membro para a nuvem
async function cadastrarMembro(dadosMembro) {
    try {
        const { data, error } = await _supabase
            .from('membros')
            .insert([{
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

// READ: Busca a lista de membros no banco
async function buscarMembrosBanco() {
    try {
        const { data, error } = await _supabase
            .from('membros')
            .select('*')
            .order('nome_completo', { ascending: true });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar:', error.message);
        return [];
    }
}

// ==========================================
// 3. SISTEMA DE LOGIN E SEGURANÇA
// ==========================================

// Verifica se o usuário está logado
function verificarAcesso() {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuario) {
        // Se não houver usuário, volta para a raiz (index.html)
        window.location.href = '../index.html';
    }
    return usuario;
}

// Lógica do Formulário de Login (index.html)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const userIn = document.getElementById('usuario').value.trim().toLowerCase();
        const passIn = document.getElementById('senha').value.trim();

        // Tabela de usuários locais (temporária)
        const usuariosPadrao = {
            'pastor': { senha: '123', nivel: 'admin' },
            'secretaria': { senha: '123', nivel: 'admin' },
            'grupo1': { senha: '123', nivel: 'responsavel', grupo: '01' }
        };

        if (usuariosPadrao[userIn] && usuariosPadrao[userIn].senha === passIn) {
            // Salva a sessão no navegador
            localStorage.setItem('usuarioLogado', JSON.stringify({
                nome: userIn,
                nivel: usuariosPadrao[userIn].nivel
            }));
            
            // Redireciona para o dashboard que está dentro da pasta pages/
            window.location.href = 'pages/dashboard.html';
        } else {
            alert('❌ Login falhou! Verifique usuário e senha.');
        }
    });
}

// ==========================================
// 4. FUNÇÕES DE EDIÇÃO E EXCLUSÃO
// ==========================================

// DELETE: Remove um membro pelo ID
async function excluirMembro(id) {
    if (confirm("Tem certeza que deseja excluir este membro?")) {
        try {
            const { error } = await _supabase
                .from('membros')
                .delete()
                .eq('id', id); // "eq" significa equal (onde id = id)

            if (error) throw error;
            alert("Membro removido!");
            location.reload(); // Recarrega a página para atualizar a lista
        } catch (error) {
            alert("Erro ao excluir: " + error.message);
        }
    }
}

// UPDATE: Função simples para desativar membro (mudar status)
async function alternarStatusMembro(id, statusAtual) {
    const novoStatus = statusAtual === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
        const { error } = await _supabase
            .from('membros')
            .update({ status_registro: novoStatus })
            .eq('id', id);

        if (error) throw error;
        location.reload();
    } catch (error) {
        alert("Erro ao mudar status: " + error.message);
    }
}