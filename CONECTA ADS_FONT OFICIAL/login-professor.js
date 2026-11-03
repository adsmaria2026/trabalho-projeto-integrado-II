
const formulario = document.getElementById("formLoginProfessor");

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const mensagem = document.getElementById("mensagem");

    try {
        const resposta = await fetch("/api/login-professor", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, senha })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            mensagem.textContent = dados.mensagem;
            return;
        }

        localStorage.setItem(
            "professorLogado",
            JSON.stringify(dados.professor)
        );

        mensagem.textContent = dados.mensagem;

        window.location.href = "painel-professor.html";

    } catch (erro) {
        console.error(erro);
        mensagem.textContent = "Erro ao conectar com o servidor.";
    }
});
