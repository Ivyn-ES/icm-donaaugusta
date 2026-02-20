// ==========================================
// 1. CONEXÃO COM O BANCO (SUPABASE)
// ==========================================
const SUPABASE_URL = 'https://pxjczmjhzopfxwlmpjfv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4amN6bWpoem9wZnh3bG1wamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjUzMjYsImV4cCI6MjA4NzEwMTMyNn0.OfekQPuYUwsZu5X9_lPDGBbVTZYBvAQ5KdiFx3TFOCY';

// Inicialização do cliente
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. FUNÇÕES DE BANCO DE DADOS
// ==========================================

// Função para Cadastrar Membro
async function cadastrarMembro(dadosMembro) {
    try {
        const { data, error } = await _supabase
            .from('membros')
            .insert([
                {
                    nome_completo: dadosMembro.nome,
                    situacao: dadosMembro.situacao,
                    categoria: dadosMembro.categoria,
                    sexo: dadosMembro.sexo,
                    grupo: dadosMembro.grupo,
                    aniversario_dia: parseInt(dadosMembro.dia),
                    aniversario_mes: dadosMembro.mes,
                    status_registro: 'Ativo'
                }
            ]);

        if (error) throw error;
        alert('✅ ' + dadosMembro.nome + ' cadastrado com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro no Supabase:', error);
        alert('❌ Erro ao salvar: ' + error.message);
        return false;
    }
}

// ==========================================
// 3. SISTEMA DE LOGIN E SEGURANÇA
// ==========================================

// Função para verificar se está logado (usar no topo das páginas internas)
function verificarAcesso() {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuario) {
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

        // Usuários fixos (temporário até migrarmos para o banco)
        const usuariosPadrao = {
            'pastor': { senha: '123', nivel: 'admin' },
            'secretaria': { senha: '123', nivel: 'admin' },
            'grupo1': { senha: '123', nivel: 'responsavel', grupo: '01' },
            'grupo2': { senha: '123', nivel: 'responsavel', grupo: '02' }
        };

        if (usuariosPadrao[userIn] && usuariosPadrao[userIn].senha === passIn) {
            localStorage.setItem('usuarioLogado', JSON.stringify({
                nome: userIn,
                nivel: usuariosPadrao[userIn].nivel,
                grupo: usuariosPadrao[userIn].grupo || null
            }));
            
            // Redirecionamento
            if (usuariosPadrao[userIn].nivel === 'admin') {
                window.location.href = 'pages/dashboard.html';
            } else {
                window.location.href = 'pages/mensagens.html';
            }
        } else {
            alert('❌ Usuário ou senha incorretos!');
        }
    });
}