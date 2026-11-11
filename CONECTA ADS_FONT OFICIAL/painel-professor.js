
const formulario = document.getElementById("formConteudo");
const mensagem = document.getElementById("mensagem");
const botaoPublicar = formulario.querySelector('button[type="submit"]');

// Elementos do quiz
const botaoAdicionar = document.getElementById("adicionarPergunta");
const listaPerguntas = document.getElementById("listaPerguntas");
const formQuiz = document.getElementById("formQuiz");
const mensagemQuiz = document.getElementById("mensagemQuiz");

let contadorPerguntas = 0;

// Verificar professor conectado
const professorSalvo = localStorage.getItem("professorLogado");

if (!professorSalvo) {
    window.location.href = "login-professor.html";
}

const professor = JSON.parse(professorSalvo);

// Publicar conteúdo de estudo
formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (botaoPublicar.disabled) return;

    const disciplina = document.getElementById("disciplina").value;
    const titulo = document.getElementById("titulo").value.trim();
    const resumo = document.getElementById("resumo").value.trim();

    try {
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
        botaoPublicar.disabled = false;
        botaoPublicar.textContent = "Publicar conteúdo";
    }
});

// Sair da área do professor
document.getElementById("sair").addEventListener("click", () => {
    localStorage.removeItem("professorLogado");
    window.location.href = "index.html";
});

// Atualizar numeração das perguntas
function atualizarNumeracao() {
    const blocos = document.querySelectorAll(".pergunta-quiz");

    blocos.forEach((bloco, indice) => {
        bloco.querySelector(".numero-pergunta").textContent =
            `Pergunta ${indice + 1}`;
    });

    contadorPerguntas = blocos.length;
}

// Adicionar pergunta
botaoAdicionar.addEventListener("click", () => {
    contadorPerguntas++;

    const pergunta = document.createElement("div");
    pergunta.className = "pergunta-quiz";

    pergunta.innerHTML = `
        <div class="cabecalho-pergunta">
            <h3 class="numero-pergunta">Pergunta ${contadorPerguntas}</h3>
            <button type="button" class="remover-pergunta">
                Remover pergunta
            </button>
        </div>

        <label>Enunciado da pergunta</label>
        <textarea class="enunciado" rows="3"
            placeholder="Digite a pergunta..." required></textarea>

        <div class="alternativas-grid">
            <div class="campo-alternativa">
                <label>Alternativa A</label>
                <input type="text" class="alternativa-a"
                    placeholder="Digite a alternativa A" required>
            </div>

            <div class="campo-alternativa">
                <label>Alternativa B</label>
                <input type="text" class="alternativa-b"
                    placeholder="Digite a alternativa B" required>
            </div>

            <div class="campo-alternativa">
                <label>Alternativa C</label>
                <input type="text" class="alternativa-c"
                    placeholder="Digite a alternativa C" required>
            </div>

            <div class="campo-alternativa">
                <label>Alternativa D</label>
                <input type="text" class="alternativa-d"
                    placeholder="Digite a alternativa D" required>
            </div>
        </div>

        <label>Resposta correta</label>
        <select class="resposta-correta" required>
            <option value="">Selecione a resposta correta</option>
            <option value="A">Alternativa A</option>
            <option value="B">Alternativa B</option>
            <option value="C">Alternativa C</option>
            <option value="D">Alternativa D</option>
        </select>

        <label>Explicação da resposta</label>
        <textarea class="explicacao" rows="2"
            placeholder="Explique por que essa alternativa está correta..."></textarea>
    `;

    listaPerguntas.appendChild(pergunta);

    // Remover pergunta
    pergunta.querySelector(".remover-pergunta").addEventListener("click", () => {
        pergunta.remove();
        atualizarNumeracao();
    });
});

// Publicar quiz
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

    for (const bloco of blocosPerguntas) {
        perguntas.push({
            enunciado: bloco.querySelector(".enunciado").value.trim(),
            alternativa_a: bloco.querySelector(".alternativa-a").value.trim(),
            alternativa_b: bloco.querySelector(".alternativa-b").value.trim(),
            alternativa_c: bloco.querySelector(".alternativa-c").value.trim(),
            alternativa_d: bloco.querySelector(".alternativa-d").value.trim(),
            resposta_correta: bloco.querySelector(".resposta-correta").value,
            explicacao: bloco.querySelector(".explicacao").value.trim()
        });
    }

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
