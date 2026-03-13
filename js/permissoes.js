// Lista de colunas exatamente como criamos no Supabase (sem o p_ na frente para facilitar a leitura na tela)
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

// 1. Gera a tabela na tela ao carregar
document.addEventListener('DOMContentLoaded', () => {
    const corpo = document.getElementById('lista-permissoes');
    listaFuncoes.forEach(f => {
        corpo.innerHTML += `
            <tr>
                <td class="func-col">${f.nome}</td>
                <td><input type="checkbox" id="${f.id}"></td>
            </tr>
        `;
    });
    carregarPermissoesDoNivel(); // Carrega os dados do primeiro nível do select
});

// 2. Busca os dados no Supabase para o nível selecionado
async function carregarPermissoesDoNivel() {
    const nivel = document.getElementById('select-nivel').value;
    
    const { data, error } = await _supabase
        .from('niveis_acesso')
        .select('*')
        .eq('nivel_nome', nivel)
        .single();

    if (error) {
        console.error("Erro ao buscar:", error);
        // Se não existir a linha, todos ficam desmarcados
        listaFuncoes.forEach(f => document.getElementById(f.id).checked = false);
        return;
    }

    if (data) {
        listaFuncoes.forEach(f => {
            document.getElementById(f.id).checked = data[f.id] || false;
        });
    }
}

// 3. Salva os novos valores no Supabase
async function salvarPermissoes() {
    const nivel = document.getElementById('select-nivel').value;
    const dadosParaSalvar = { nivel_nome: nivel };

    listaFuncoes.forEach(f => {
        dadosParaSalvar[f.id] = document.getElementById(f.id).checked;
    });

    const { error } = await _supabase
        .from('niveis_acesso')
        .upsert(dadosParaSalvar, { onConflict: 'nivel_nome' });

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        alert("Configurações de " + nivel + " gravadas com sucesso!");
    }
}