<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Gerenciar Usuários - ICM</title>
    <link rel="stylesheet" href="../css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <div class="container">
        <h1>👥 Gestão de Acessos</h1>
        
        <section class="admin-section">
            <form id="formUsuario">
                <input type="text" id="novoLogin" placeholder="Login (Ex: marcos_gp01)" required>
                <input type="password" id="novaSenha" placeholder="Senha" required>
                <select id="nivelAcesso">
                    <option value="User">Líder de Grupo (User)</option>
                    <option value="Admin">Administrador (Admin)</option>
                </select>
                <input type="text" id="vincularGrupo" placeholder="Grupo (Ex: 01)">
                <button type="submit">Criar Usuário</button>
            </form>
        </section>

        <table border="1" style="width:100%; margin-top:20px;">
            <thead>
                <tr>
                    <th>Login</th>
                    <th>Nível</th>
                    <th>Grupo</th>
                    <th>Ação</th>
                </tr>
            </thead>
            <tbody id="corpoTabelaUsuarios"></tbody>
        </table>

        <a href="dashboard.html" class="btn-voltar">Voltar</a>
    </div>

    <script src="../js/script.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const user = verificarAcesso();
            if (user.nivel !== 'Admin') {
                alert('Acesso negado!');
                window.location.href = 'dashboard.html';
            }
            // Aqui chamaremos a função de listar usuários que já deixamos pronta no script.js
            if(typeof renderizarUsuarios === 'function') renderizarUsuarios();
        });

        document.getElementById('formUsuario').addEventListener('submit', async (e) => {
            e.preventDefault();
            const dados = {
                login: document.getElementById('novoLogin').value,
                senha: document.getElementById('novaSenha').value,
                permissao: document.getElementById('nivelAcesso').value,
                grupo_vinculado: document.getElementById('vincularGrupo').value
            };
            const ok = await criarUsuario(dados);
            if(ok) location.reload();
        });
    </script>
</body>
</html>