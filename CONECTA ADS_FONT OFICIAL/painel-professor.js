
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
    window.location.href = "index.html";
});
// Adicionar uma nova pergunta
botaoAdicionar.addEventListener("click", () => {
    contadorPerguntas++;

    const pergunta = document.createElement("div");

    pergunta.className = "pergunta-quiz";

    pergunta.innerHTML = `
        <hr>
        <h3>Pergunta ${contadorPerguntas}</h3>

        <label>Enunciado da pergunta</label>
        <textarea class="enunciado" rows="3" required></textarea>

        <label>Alternativa A</label>
        <input type="text" class="alternativa-a" required>

        <label>Alternativa B</label>
        <input type="text" class="alternativa-b" required>

        <label>Alternativa C</label>
        <input type="text" class="alternativa-c" required>

        <label>Alternativa D</label>
        <input type="text" class="alternativa-d" required>

        <label>Resposta correta</label>
        <select class="resposta-correta" required>
            <option value="">Selecione a resposta correta</option>
            <option value="A">Alternativa A</option>
            <option value="B">Alternativa B</option>
            <option value="C">Alternativa C</option>
            <option value="D">Alternativa D</option>
        </select>

        <label>Explicação da resposta</label>
        <textarea class="explicacao" rows="2"></textarea>
    `;

    listaPerguntas.appendChild(pergunta);
});
// Publicar quiz no banco de dados
formQuiz.addEventListener("submit", async (event) => {
    event.preventDefault();

    const disciplina = document.getElementById("disciplinaQuiz").value;
    const titulo = document.getElementById("tituloQuiz").value.trim();

    const blocosPerguntas = document.querySelectorAll(".pergunta-quiz");

    if (blocosPerguntas.length === 0) {
        mensagemQuiz.textContent = "Adicione pelo menos uma pergunta.";
        return;
    }

    const perguntas = [];

    blocosPerguntas.forEach((bloco) => {
        perguntas.push({
            enunciado: bloco.querySelector(".enunciado").value,
            alternativa_a: bloco.querySelector(".alternativa-a").value,
            alternativa_b: bloco.querySelector(".alternativa-b").value,
            alternativa_c: bloco.querySelector(".alternativa-c").value,
            alternativa_d: bloco.querySelector(".alternativa-d").value,
            resposta_correta: bloco.querySelector(".resposta-correta").value,
            explicacao: bloco.querySelector(".explicacao").value
        });
    });

    const botaoPublicarQuiz = document.getElementById("publicarQuiz");

    try {
        botaoPublicarQuiz.disabled = true;
        botaoPublicarQuiz.textContent = "Publicando...";
        mensagemQuiz.textContent = "Enviando quiz...";

        const resposta = await fetch("/api/quiz", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
          body: JSON.stringify({
    id_disciplina: disciplina,
    id_professor: professor.id,
    titulo,
    perguntas
})
        });

        const dados = await resposta.json();

        mensagemQuiz.textContent = dados.mensagem;

        if (resposta.ok) {
            formQuiz.reset();
            listaPerguntas.innerHTML = "";
            contadorPerguntas = 0;
        }

    } catch (erro) {
        console.error("Erro ao publicar quiz:", erro);
        mensagemQuiz.textContent = "Erro ao conectar com o servidor.";

    } finally {
        botaoPublicarQuiz.disabled = false;
        botaoPublicarQuiz.textContent = "Publicar quiz";
    }
});