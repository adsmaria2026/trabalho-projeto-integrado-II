
const formulario = document.getElementById("formConteudo");
const mensagem = document.getElementById("mensagem");

// Verificar se existe um professor conectado
const professorSalvo = localStorage.getItem("professorLogado");

if (!professorSalvo) {
    window.location.href = "login-professor.html";
}

const professor = JSON.parse(professorSalvo);

// Publicar conteúdo
formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const disciplina = document.getElementById("disciplina").value;
    const titulo = document.getElementById("titulo").value.trim();
    const resumo = document.getElementById("resumo").value.trim();

    try {
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
    }
});

// Sair da área do professor
document.getElementById("sair").addEventListener("click", () => {
    localStorage.removeItem("professorLogado");
});
