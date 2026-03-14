// ==========================================
// SOLDADO: js/permissoes.js
// Responsável pela configuração do Painel de Permissões
// ==========================================

const listaFuncoes = [
    { id: 'p_dashboard', nome: 'Acesso ao Dashboard' },
    { id: 'p_chamada', nome: 'Fazer Chamada' },
    { id: 'p_cias', nome: 'CIAs (Eventos)' },
    { id: 'p_historico', nome: 'Histórico de Eventos' },
    { id: 'p_cadastro', nome: 'Cadastrar Membros' },
    { id: 'p_membros', nome: 'Lista de Membros' },
    { id: 'p_presenca', nome: 'Lista de Presença' },
    { id: 'p_frequencia', nome: 'Relatório Frequência' },
    { id: 'p_niver', nome: 'Aniversariantes' },
    { id: 'p_igrejas', nome: 'Cadastrar Igrejas' },
    { id: 'p_grupos', nome: 'Criar Grupos' },
    { id: 'p_usuarios', nome: 'Gestão de Usuários' },
    { id: 'p_permissoes', nome: 'Painel Permissões' }
];

// 1. Gera a tabela na tela ao carregar (COM PROTEÇÃO)
document.addEventListener('DOMContentLoaded', () => {
    const corpo = document.getElementById('lista-permissoes');
    
    // SE NÃO ESTIVER NA PÁGINA DE PERMISSÕES, ELE PARA AQUI E NÃO DÁ ERRO
    if (!corpo) {
        console.log("ℹ️ Página atual não requer configuração de níveis de acesso.");
        return; 
    }

    // Limpa o carregando antes de preencher
    corpo.innerHTML = "";

    listaFuncoes.forEach(f => {
        corpo.innerHTML += `
            <tr>
                <td class="func-col" style="padding: 10px; border-bottom: 1px solid #eee;">${f.nome}</td>
                <td style="text-align: center; border-bottom: 1px solid #eee;">
                    <input type="checkbox" id="${f.id}" style="width: 20px; height: 20px; cursor: pointer;">
                </td>
            </tr>
        `;
    });

    // Só tenta carregar do banco se o select existir
    if (document.getElementById('select-nivel')) {
        carregarPermissoesDoNivel();
    }
});

// 2. Busca os dados no Supabase para o nível selecionado
async function carregarPermissoesDoNivel() {
    const select = document.getElementById('select-nivel');
    if (!select) return;

    const nivel = select.value;
    
    try {
        const { data, error } = await _supabase
            .from('niveis_acesso')
            .select('*')
            .eq('nivel_nome', nivel)
            .single();

        if (error) {
            console.warn("Aviso: Nível não configurado no banco, resetando checkboxes.");
            listaFuncoes.forEach(f => {
                const check = document.getElementById(f.id);
                if (check) check.checked = false;
            });
            return;
        }

        if (data) {
            listaFuncoes.forEach(f => {
                const check = document.getElementById(f.id);
                if (check) check.checked = data[f.id] || false;
            });
        }
    } catch (err) {
        console.error("Erro ao carregar permissões:", err);
    }
}

// 3. Salva os novos valores no Supabase
async function salvarPermissoes() {
    const select = document.getElementById('select-nivel');
    if (!select) return;

    const nivel = select.value;
    const dadosParaSalvar = { nivel_nome: nivel };

    listaFuncoes.forEach(f => {
        const check = document.getElementById(f.id);
        if (check) {
            dadosParaSalvar[f.id] = check.checked;
        }
    });

    try {
        const { error } = await _supabase
            .from('niveis_acesso')
            .upsert(dadosParaSalvar, { onConflict: 'nivel_nome' });

        if (error) throw error;
        alert("✅ Configurações de " + nivel + " gravadas com sucesso!");
    } catch (error) {
        alert("❌ Erro ao salvar: " + error.message);
    }
}