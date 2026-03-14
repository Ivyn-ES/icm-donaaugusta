// [Acrescente isso ao final do seu js/chamada.js]

async function salvarEventoEspecial() {
    const data_evento = document.getElementById('data_especial').value;
    const local = document.getElementById('local_evento').value.trim();
    const descricao = document.getElementById('desc_evento').value.trim();
    
    if (!data_evento || !local || !descricao) return alert("⚠️ Preencha Data, Local e Descrição.");

    const dados = {
        data_evento, local_evento: local, descricao,
        m_varoes: parseInt(document.getElementById('val_membro_Varões').innerText) || 0,
        m_senhoras: parseInt(document.getElementById('val_membro_Senhoras').innerText) || 0,
        m_jovens: parseInt(document.getElementById('val_membro_Jovens').innerText) || 0,
        m_adolescentes: parseInt(document.getElementById('val_membro_Adolescentes').innerText) || 0,
        m_intermediarios: parseInt(document.getElementById('val_membro_Intermediários').innerText) || 0,
        m_criancas: parseInt(document.getElementById('val_membro_Crianças').innerText) || 0,
        m_colo: parseInt(document.getElementById('val_membro_Crianças de Colo').innerText) || 0,
        v_varoes: parseInt(document.getElementById('val_vis_Varões').innerText) || 0,
        v_senhoras: parseInt(document.getElementById('val_vis_Senhoras').innerText) || 0,
        v_jovens: parseInt(document.getElementById('val_vis_Jovens').innerText) || 0,
        v_adolescentes: parseInt(document.getElementById('val_vis_Adolescentes').innerText) || 0,
        v_intermediarios: parseInt(document.getElementById('val_vis_Intermediários').innerText) || 0,
        v_criancas: parseInt(document.getElementById('val_vis_Crianças').innerText) || 0,
        v_colo: parseInt(document.getElementById('val_vis_Crianças de Colo').innerText) || 0
    };

    const { error } = await _supabase.from('eventos_especiais').upsert([dados]);
    alert(error ? "❌ Erro ao salvar" : "✅ Salvo com sucesso!");
}

function gerarWhatsEspecial() {
    const local = document.getElementById('local_evento').value || "Não informado";
    const desc = document.getElementById('desc_evento').value || "CIAs";
    const data = document.getElementById('data_especial').value.split('-').reverse().join('/');

    let msg = `*📊 RELATÓRIO CIAs - ICM*\n\n📅 *DATA:* ${data}\n📍 *LOCAL:* ${local}\n📝 *GRUPO:* ${desc.toUpperCase()}\n\n`;
    
    // Simplificando a captura para o exemplo
    const soma = (p) => Array.from(document.querySelectorAll(`[id^="val_${p}_"]`)).reduce((a, b) => a + parseInt(b.innerText || 0), 0);
    
    msg += `*👥 MEMBROS:* ${soma('membro')}\n*🌟 VISITANTES:* ${soma('vis')}\n*📉 TOTAL: ${soma('membro') + soma('vis')}*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}