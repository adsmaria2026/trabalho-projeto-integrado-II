
const formulario = document.getElementById("formConteudo");
const mensagem = document.getElementById("mensagem");
const botaoPublicar = formulario.querySelector('button[type="submit"]');

// Verificar se existe um professor conectado
const professorSalvo = localStorage.getItem("professorLogado");

if (!professorSalvo) {
    window.location.href = "login-professor.html";
}

const professor = JSON.parse(professorSalvo);

// Publicar conteúdo
formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Impedir envios duplicados
    if (botaoPublicar.disabled) {
        return;
    }

    const disciplina = document.getElementById("disciplina").value;
    const titulo = document.getElementById("titulo").value.trim();
    const resumo = document.getElementById("resumo").value.trim();

    try {
        // Desativar botão durante o envio
        botaoPublicar.disabled = true;
        botaoPublicar.textContent = "Publicando...";

        mensagem.textContent = "Enviando conteúdo...";

        const resposta = await fetch("/api/conteudos-professor", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_professor: professor.id,
                disciplina,
                titulo,
                resumo
            })
        });

        const dados = await resposta.json();

        mensagem.textContent = dados.mensagem;

        if (resposta.ok) {
            formulario.reset();
        }

    } catch (erro) {
        console.error(erro);
        mensagem.textContent = "Erro ao conectar com o servidor.";

    } finally {
        // Reativar botão após finalizar
        botaoPublicar.disabled = false;
        botaoPublicar.textContent = "Publicar conteúdo";
    }
});

// Sair da área do professor
document.getElementById("sair").addEventListener("click", () => {
    localStorage.removeItem("professorLogado");
});
