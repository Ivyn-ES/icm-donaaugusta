// ==========================================
// SOLDADO: js/relatorios.js
// Lógica de Frequência e Cálculo de Ausências
// ==========================================

async function gerarNovoRelatorioFrequencia() {
    const corpo = document.getElementById('corpoRelatorio');
    const dataRef = document.getElementById('filtroData').value;
    const filtroVinculo = document.getElementById('filtroVinculo').value;

    if (!dataRef) {
        alert("Selecione uma data de referência.");
        return;
    }

    corpo.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px;">🔍 Cruzando dados do banco...</td></tr>';

    try {
        // 1. Busca todos os membros ativos
        let queryMembros = _supabase.from('membros').select('id, nome, situacao').eq('status_registro', 'Ativo');
        
        if (filtroVinculo !== 'todos') {
            queryMembros = queryMembros.eq('situacao', filtroVinculo);
        }

        const { data: membros, error: errM } = await queryMembros.order('nome');
        if (errM) throw errM;

        // 2. Busca TODAS as presenças até a data selecionada
        const { data: presencas, error: errP } = await _supabase
            .from('presencas')
            .select('membro_id, data_culto, status')
            .lte('data_culto', dataRef)
            .order('data_culto', { ascending: false });

        if (errP) throw errP;

        // 3. Processamento de dados
        const html = membros.map(membro => {
            // Encontra a última presença deste membro
            const historicoMembro = presencas.filter(p => p.membro_id === membro.id);
            const ultimaPresenca = historicoMembro[0]; // Está ordenado por data desc
            
            // Verifica status especificamente no dia selecionado
            const statusNoDia = historicoMembro.find(p => p.data_culto === dataRef);
            
            let dataFormatada = "---";
            let diasAusente = "Nuca constou";
            let classeStatus = "";
            let textoStatus = statusNoDia ? statusNoDia.status : "Faltou";

            if (ultimaPresenca) {
                const dataUltima = new Date(ultimaPresenca.data_culto);
                const hoje = new Date(dataRef);
                const diffTime = Math.abs(hoje - dataUltima);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                dataFormatada = dataUltima.toLocaleDateString('pt-BR');
                diasAusente = diffDays === 0 ? "Hoje" : `${diffDays} dias`;
                
                if (diffDays > 7) {
                    diasAusente = `<span class="alerta-ausencia">${diasAusente}</span>`;
                }
            }

            const statusFinal = statusNoDia 
                ? `<span class="status-presente">✅ ${statusNoDia.status}</span>` 
                : `<span style="color:#888;">❌ Faltou</span>`;

            return `
                <tr>
                    <td><strong>${membro.nome}</strong><br><small>${membro.situacao}</small></td>
                    <td>${dataFormatada}</td>
                    <td>${diasAusente}</td>
                    <td>${statusFinal}</td>
                </tr>
            `;
        }).join('');

        corpo.innerHTML = html || '<tr><td colspan="4" style="text-align:center;">Nenhum registro encontrado.</td></tr>';

    } catch (error) {
        console.error("Erro Relatório:", error);
        corpo.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Erro ao processar dados.</td></tr>';
    }
}