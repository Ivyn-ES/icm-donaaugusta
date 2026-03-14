// ==========================================
// CENTRAL DE UTILIDADES - js/utils.js
// ==========================================

const Utils = {
    // Função universal para abrir WhatsApp
    enviarWhatsApp(mensagem) {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank');
    },

    // Função para formatar data ISO (2026-03-14) para BR (14/03/2026)
    formatarDataBR(dataISO) {
        if(!dataISO) return "";
        return dataISO.split('-').reverse().join('/');
    }
};