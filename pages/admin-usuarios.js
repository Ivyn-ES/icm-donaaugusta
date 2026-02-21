<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão de Usuários - ICM</title>
    <link rel="stylesheet" href="../css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <div class="container">
        <header style="text-align: center; margin-bottom: 20px;">
            <h1>🔑 Gestão de Usuários</h1>
            <p>Cadastre os responsáveis pelos grupos</p>
        </header>

        <section class="admin-section">
            <form id="formUsuario">
                <div class="campo">
                    <label for="user_login">Login (Nome de usuário):</label>
                    <input type="text" id="user_login" placeholder="Ex: resp01" required>
                </div>
                
                <div class="linha-dupla">
                    <div class="campo">
                        <label for="user_senha">Senha:</label>
                        <input type="password" id="user_senha" required>
                    </div>
                    <div class="campo">
                        <label for="user_nivel">Nível de Acesso:</label>
                        <select id="user_nivel">
                            <option value="User">Responsável (User)</option>
                            <option value="Admin">Secretário (Admin)</option>
                        </select>
                    </div>
                </div>

                <div class="campo">
                    <label for="user_grupo">Vincular ao Grupo:</label>
                    <select id="user_grupo" required>
                        <option value="">Carregando grupos...</option>
                    </select>
                    <small>Se for Admin, o grupo não restringirá a visão.</small>
                </div>

                <button type="submit" class="btn-salvar" style="width: 100%; margin-top: 15px;">Criar Usuário</button>
            </form>
        </section>

        <hr>

        <section>
            <h3>Usuários Cadastrados</h3>
            <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background: #f0f2f5;">
                        <th>Login</th>
                        <th>Nível</th>
                        <th>Grupo</th>
                        <th>Ação</th>
                    </tr>
                </thead>
                <tbody id="corpoTabelaUsuarios">
                    </tbody>
            </table>
        </section>

        <div style="margin-top: 30px;">
            <a href="dashboard.html" class="btn-voltar" style="display: block; text-align: center; text-decoration: none;">⬅ Voltar ao Painel</a>
        </div>
    </div>

    <script src="../js/script.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const user = verificarAcesso();
            if (user.nivel !== 'Admin' && user.nivel !== 'Master') {
                window.location.href = 'dashboard.html';
            }
            // Carrega os grupos no select e a lista de usuários
            carregarGruposNoSelectPersonalizado('user_grupo');
            renderizarUsuarios();
        });

        const form = document.getElementById('formUsuario');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dados = {
                login: document.getElementById('user_login').value.trim(),
                senha: document.getElementById('user_senha').value,
                nivel: document.getElementById('user_nivel').value,
                grupo_vinculado: document.getElementById('user_grupo').value
            };
            
            const ok = await criarUsuario(dados);
            if (ok) {
                form.reset();
                renderizarUsuarios();
            }
        });

        // Função auxiliar para carregar grupos especificamente nesta página
        async function carregarGruposNoSelectPersonalizado(idSelect) {
            const select = document.getElementById(idSelect);
            const { data } = await _supabase.from('grupos').select('nome').order('nome');
            if (data) {
                select.innerHTML = '<option value="">Selecione o Grupo</option>';
                data.forEach(g => {
                    select.innerHTML += `<option value="${g.nome}">${g.nome}</option>`;
                });
            }
        }
    </script>
</body>
</html>