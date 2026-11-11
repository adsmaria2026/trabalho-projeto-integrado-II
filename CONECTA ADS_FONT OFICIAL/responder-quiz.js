
const areaPerguntas = document.getElementById("areaPerguntas");
const tituloQuiz = document.getElementById("tituloQuiz");
const mensagemQuiz = document.getElementById("mensagemQuiz");
const resultadoQuiz = document.getElementById("resultadoQuiz");

let dadosQuiz = null;

// Identificar o quiz selecionado
const parametros = new URLSearchParams(window.location.search);
const idQuiz = parametros.get("id_quiz");

const alunoSalvo = JSON.parse(localStorage.getItem("alunoLogado"));
const idEstudante = alunoSalvo ? alunoSalvo.id : null;

// Buscar perguntas no servidor
async function carregarQuiz() {
    try {
        if (!idQuiz) {
            areaPerguntas.textContent = "Quiz não informado.";
            return;
        }

        areaPerguntas.textContent = "Carregando perguntas...";

        const resposta = await fetch(`/api/quiz/${idQuiz}`);
        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.mensagem);
        }

        dadosQuiz = dados;

        tituloQuiz.textContent = dados.quiz.titulo;
        areaPerguntas.innerHTML = "";

        if (dados.perguntas.length === 0) {
            areaPerguntas.textContent =
                "Este quiz ainda não possui perguntas.";
            return;
        }

        dados.perguntas.forEach((pergunta, indice) => {
            const bloco = document.createElement("div");
            bloco.className = "material";

            const enunciado = document.createElement("h3");
            enunciado.textContent =
                `${indice + 1}. ${pergunta.enunciado}`;

            bloco.appendChild(enunciado);

            const alternativas = [
                ["A", pergunta.alternativa_a],
                ["B", pergunta.alternativa_b],
                ["C", pergunta.alternativa_c],
                ["D", pergunta.alternativa_d]
            ];

            alternativas.forEach(([letra, texto]) => {
                const alternativa = document.createElement("button");

                alternativa.type = "button";
                alternativa.className = "alternativa-quiz";
                alternativa.textContent = `${letra}) ${texto}`;
                alternativa.dataset.letra = letra;
                alternativa.dataset.pergunta = pergunta.id_pergunta;

                alternativa.style.display = "block";
                alternativa.style.width = "100%";
                alternativa.style.padding = "14px";
                alternativa.style.margin = "10px 0";
                alternativa.style.textAlign = "left";
                alternativa.style.background = "#ffffff";
                alternativa.style.border = "1px solid #d5d5d5";
                alternativa.style.borderRadius = "8px";
                alternativa.style.cursor = "pointer";
                alternativa.style.fontSize = "15px";
                alternativa.style.color = "#333";

                alternativa.addEventListener("click", () => {
                    // Remover seleção anterior da mesma pergunta
                    bloco.querySelectorAll(".alternativa-quiz")
                        .forEach(botao => {
                            botao.classList.remove("selecionada");
                            botao.style.background = "#ffffff";
                            botao.style.border = "1px solid #d5d5d5";
                            botao.style.color = "#333";
                        });

                    // Marcar alternativa escolhida
                    alternativa.classList.add("selecionada");
                    alternativa.style.background = "#e8f0fe";
                    alternativa.style.border = "2px solid #174ea6";
                    alternativa.style.color = "#174ea6";
                });

                bloco.appendChild(alternativa);
            });

            areaPerguntas.appendChild(bloco);
        });

        const botao = document.createElement("button");
        botao.type = "button";
        botao.textContent = "Finalizar quiz";
        botao.addEventListener("click", finalizarQuiz);

        areaPerguntas.appendChild(botao);

    } catch (erro) {
        console.error(erro);
        areaPerguntas.textContent =
            erro.message || "Erro ao carregar quiz.";
    }
}

// Finalizar e corrigir o quiz
async function finalizarQuiz() {
    if (!idEstudante) {
        mensagemQuiz.textContent =
            "Faça login novamente para responder ao quiz.";
        return;
    }

    const blocos = document.querySelectorAll(
        "#areaPerguntas .material"
    );

    const respostas = [];

    for (const bloco of blocos) {
        const selecionada = bloco.querySelector(
            ".alternativa-quiz.selecionada"
        );

        if (!selecionada) {
            mensagemQuiz.textContent =
                "Responda todas as perguntas antes de finalizar.";
            return;
        }

        respostas.push({
            id_pergunta: Number(selecionada.dataset.pergunta),
            alternativa_escolhida: selecionada.dataset.letra
        });
    }

    try {
        mensagemQuiz.textContent = "Corrigindo suas respostas...";

        const resposta = await fetch("/api/tentativas-quiz", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_estudante: idEstudante,
                id_disciplina: dadosQuiz.quiz.id_disciplina,
                id_quiz: Number(idQuiz),
                respostas
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.mensagem);
        }

        mensagemQuiz.textContent = "Quiz finalizado com sucesso!";

        resultadoQuiz.innerHTML = "";

        // Painel com a pontuação
        const painelResultado = document.createElement("div");
        painelResultado.className = "material";

        painelResultado.innerHTML = `
            <h2>Resultado do Quiz</h2>
            <h3>Você acertou ${resultado.pontuacao} de ${resultado.total_perguntas} questões!</h3>
            <p>Pontuação: ${resultado.pontuacao}/${resultado.total_perguntas}</p>
        `;

        resultadoQuiz.appendChild(painelResultado);

        // Mostrar correção das alternativas
        dadosQuiz.perguntas.forEach((pergunta, indice) => {
            const respostaAluno = respostas.find(
                resposta =>
                    resposta.id_pergunta === pergunta.id_pergunta
            );

            const alternativas = {
                A: pergunta.alternativa_a,
                B: pergunta.alternativa_b,
                C: pergunta.alternativa_c,
                D: pergunta.alternativa_d
            };

            const acertou =
                respostaAluno.alternativa_escolhida ===
                pergunta.resposta_correta;

            const bloco = document.createElement("div");
            bloco.className = "material";

            const titulo = document.createElement("h3");
            titulo.textContent =
                `${indice + 1}. ${pergunta.enunciado}`;

            const situacao = document.createElement("p");
            situacao.textContent = acertou
                ? "✓ Você acertou!"
                : "✗ Você errou!";

            situacao.style.color = acertou ? "#16803c" : "#d93025";
            situacao.style.fontWeight = "bold";

            // Exibir alternativas com as cores da correção
            Object.entries(alternativas).forEach(([letra, texto]) => {
                const opcao = document.createElement("div");
                opcao.textContent = `${letra}) ${texto}`;

                opcao.style.padding = "12px";
                opcao.style.margin = "8px 0";
                opcao.style.borderRadius = "8px";
                opcao.style.border = "1px solid #d5d5d5";

                if (letra === pergunta.resposta_correta) {
                    opcao.style.background = "#d9f2df";
                    opcao.style.border = "1px solid #16803c";
                    opcao.style.color = "#12632f";
                    opcao.style.fontWeight = "bold";
                } else if (
                    letra === respostaAluno.alternativa_escolhida
                ) {
                    opcao.style.background = "#fce1e1";
                    opcao.style.border = "1px solid #d93025";
                    opcao.style.color = "#b3261e";
                }

                bloco.appendChild(opcao);
            });

            const explicacao = document.createElement("p");
            explicacao.textContent =
                `Explicação: ${pergunta.explicacao || "Não há explicação cadastrada para esta questão."}`;

            bloco.appendChild(titulo);
            bloco.appendChild(situacao);
            bloco.appendChild(explicacao);

            resultadoQuiz.appendChild(bloco);
        });

        // Bloquear alterações após finalizar
        areaPerguntas.querySelectorAll("button").forEach(botao => {
            botao.disabled = true;
            botao.style.cursor = "default";
        });

    } catch (erro) {
        console.error(erro);
        mensagemQuiz.textContent =
            erro.message || "Não foi possível finalizar o quiz.";
    }
}

carregarQuiz();
