// [Acrescente isso ao final do seu js/membros.js]

async function gerarRelatorioAniversariantes() {
    const corpoTabela = document.getElementById('corpoTabelaAniversarios');
    const msgVazia = document.getElementById('msgVazia');
    const selectMes = document.getElementById('filtroMes');
    const filtroSexo = document.getElementById('filtroSexo')?.value;

    if (!corpoTabela) return;

    corpoTabela.innerHTML = '<tr><td colspan="3" style="text-align:center;">Buscando...</td></tr>';
    if(msgVazia) msgVazia.style.display = 'none';

    const mesEscrito = selectMes.options[selectMes.selectedIndex].text;

    try {
        let query = _supabase.from('membros').select('nome, sexo, dia, mes').eq('status_registro', 'Ativo').eq('mes', mesEscrito);
        if (filtroSexo && filtroSexo !== 'Todos') query = query.eq('sexo', filtroSexo);

        const { data, error } = await query;
        if (error) throw error;

        const listaLimpa = data.filter(m => m.dia && m.dia.toString().trim() !== "");

        if (listaLimpa.length === 0) {
            corpoTabela.innerHTML = '';
            if(msgVazia) msgVazia.style.display = 'block';
            return;
        }

        listaLimpa.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));
        corpoTabela.innerHTML = listaLimpa.map(m => `
            <tr>
                <td style="text-align: center;">${m.dia}</td>
                <td>${m.nome}</td>
                <td style="text-align: center;">${m.sexo === 'Masculino' ? '👔' : '💐'}</td>
            </tr>`).join('');

    } catch (err) {
        corpoTabela.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center;">Erro ao carregar.</td></tr>';
    }
}

function enviarAniversariantesZap() {
    const mesNome = document.getElementById('filtroMes')?.options[document.getElementById('filtroMes').selectedIndex].text;
    const linhas = document.querySelectorAll('#corpoTabelaAniversarios tr');
    if (linhas.length === 0 || linhas[0].innerText.includes('Buscando')) return alert("Lista vazia!");

    let texto = `*🎂 ANIVERSARIANTES DE ${mesNome.toUpperCase()}*\n\n`;
    linhas.forEach(linha => {
        const cols = linha.querySelectorAll('td');
        if (cols.length >= 3) texto += `*Dia ${cols[0].innerText}* - ${cols[1].innerText} ${cols[2].innerText}\n`;
    });
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto + "\n_A Paz do Senhor Jesus!_")}`, '_blank');
}