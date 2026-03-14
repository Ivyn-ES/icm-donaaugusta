// ==========================================
// SOLDADO: js/chamada.js
// Gestão de Presença, Auto-completar e Resumo do Culto
// ==========================================

let listaMembrosCompleta = [];

// 1. INICIALIZAÇÃO AO CARREGAR A PÁGINA
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Módulo de Chamada Inicializado");
    if (typeof _supabase === 'undefined') {
        console.error("Erro: Supabase não configurado.");
        return;
    }
    await carregarDadosIniciaisChamada();
});

// 2. BUSCA MEMBROS ATIVOS NO SUPABASE
async function carregarDadosIniciaisChamada() {
    try {
        const { data, error } = await _supabase
            .from('membros')
            .select('id, nome, apelido, categoria, situacao')
            .eq('status_registro', 'Ativo')
            .order('nome');

        if (error) throw error;
        
        listaMembrosCompleta = data;
        renderizarListaConsulta(data);
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
        const container = document.getElementById('listaChamada');
        if (container) container.innerHTML = "<p style='padding:15px; color:red;'>Erro ao carregar lista.</p>";
    }
}

// 3. RENDERIZA LISTA DE APOIO (Apenas para consulta visual)
function renderizarListaConsulta(membros) {
    const container = document.getElementById('listaChamada');
    if (!container) return;

    if (membros.length === 0) {
        container.innerHTML = "<p style='padding:15px;'>Nenhum membro ativo encontrado.</p>";
        return;
    }

    container.innerHTML = membros.map(m => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee; font-size: 0.9rem;">
            <span><strong>${m.nome}</strong> ${m.apelido ? `(${m.apelido})` : ''}</span>
            <span style="color:#666; font-size:0.8rem;">${m.categoria}</span>
        </div>
    `).join('');
}

// 4. LÓGICA DE AUTO-COMPLETAR (Digita apelido -> Preenche Função)
function autoCompletarFuncionario(input) {
    const valor = input.value.toLowerCase();
    const idBase = input.id; // Ex: dirigente, pregador...
    const inputFuncao = document.getElementById(`funcao_${idBase}`);

    if (valor.length < 2) {
        if (inputFuncao) inputFuncao.value = "";
        return;
    }

    // Busca por apelido ou nome
    const achado = listaMembrosCompleta.find(m => 
        (m.apelido && m.apelido.toLowerCase().includes(valor)) || 
        m.nome.toLowerCase().includes(valor)
    );

    if (achado && inputFuncao) {
        inputFuncao.value = achado.categoria; // Preenche ex: Diácono, Varão, etc.
    }
}

// 5. ENVIO DO RESUMO FORMATADO PARA WHATSAPP
function enviarResumoWhatsapp() {
    // A. Data Formatada (Ex: 12/Mar)
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const d = new Date();
    const dataFmt = `${d.getDate()}/${meses[d.getMonth()]}`;

    // B. Captura os valores numéricos
    const m_adulto = parseInt(document.getElementById('m_adulto')?.value) || 0;
    const m_cias = parseInt(document.getElementById('m_cias')?.value) || 0;
    const v_adulto = parseInt(document.getElementById('v_adulto')?.value) || 0;
    const v_cias = parseInt(document.getElementById('v_cias')?.value) || 0;
    
    // C. Cálculo da Porcentagem %
    // Considera apenas quem é "Membro" na base de dados
    const totalMembrosBase = listaMembrosCompleta.filter(m => m.situacao === 'Membro').length;
    const presentesMembros = m_adulto + m_cias;
    const perc = totalMembrosBase > 0 ? Math.round((presentesMembros / totalMembrosBase) * 100) : 0;

    // D. Escolha do Círculo (Verde se >= 50%, Vermelho se < 50%)
    const statusIcone = perc >= 50 ? "🟢" : "🔴";

    // E. Responsáveis (Evita repetir nomes em funções diferentes)
    const responsaveisRaw = [
        { label: "🎤 Dirigente", nome: document.getElementById('dirigente')?.value.trim() },
        { label: "🎤 Pregador", nome: document.getElementById('pregador')?.value.trim() },
        { label: "🎶 Louvor", nome: document.getElementById('louvor')?.value.trim() },
        { label: "🚪 Portão", nome: document.getElementById('portao')?.value.trim() }
    ];

    let nomesVistos = new Set();
    let listaResponsaveis = "";

    responsaveisRaw.forEach(r => {
        if (r.nome && !nomesVistos.has(r.nome)) {
            listaResponsaveis += `${r.label}: ${r.nome}\n`;
            nomesVistos.add(r.nome);
        }
    });

    const texto = document.getElementById('texto_biblico')?.value.trim();
    const obs = document.getElementById('obs_culto')?.value.trim();

    // F. Montagem da Mensagem
    let msg = `ICM - Dona Augusta\n`;
    msg += `📊 *Resumo do Culto - ${dataFmt}*\n\n`;
    
    msg += `*Participantes:*\n`;
    msg += `- Membros (Adulto/CIAs): ${m_adulto}/${m_cias} - ${statusIcone} ${perc}%\n`;
    msg += `- Visitantes (Adulto/CIAs): ${v_adulto}/${v_cias}\n`;
    msg += `🌟 *Total Vidas: ${m_adulto + m_cias + v_adulto + v_cias}*\n\n`;

    msg += `*Responsáveis:*\n`;
    msg += listaResponsaveis;
    if (texto) msg += `📖 Texto: ${texto}\n`;
    if (obs) msg += `\n*Obs.:* ${obs}`;

    // G. Envio
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}