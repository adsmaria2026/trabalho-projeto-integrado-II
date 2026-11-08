
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
dadosQuiz = dados;
console.log("Dados do quiz:", dadosQuiz);
console.log("ID do aluno:", idEstudante);
console.log("ID do quiz:", idQuiz);
        if (!resposta.ok) {
            throw new Error(dados.mensagem);
        }

        tituloQuiz.textContent = dados.quiz.titulo;
        areaPerguntas.innerHTML = "";

        if (dados.perguntas.length === 0) {
            areaPerguntas.textContent = "Este quiz ainda não possui perguntas.";
            return;
        }

        dados.perguntas.forEach((pergunta, indice) => {
            const bloco = document.createElement("div");
            bloco.className = "material";

            const enunciado = document.createElement("h3");
            enunciado.textContent = `${indice + 1}. ${pergunta.enunciado}`;
            bloco.appendChild(enunciado);

            const alternativas = [
                ["A", pergunta.alternativa_a],
                ["B", pergunta.alternativa_b],
                ["C", pergunta.alternativa_c],
                ["D", pergunta.alternativa_d]
            ];

            alternativas.forEach(([letra, texto]) => {
                const label = document.createElement("label");
                label.style.display = "block";
                label.style.margin = "12px 0";

                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = `pergunta-${pergunta.id_pergunta}`;
                radio.value = letra;
                radio.required = true;

                label.appendChild(radio);
                label.appendChild(
                    document.createTextNode(` ${letra}) ${texto}`)
                );

                bloco.appendChild(label);
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
        areaPerguntas.textContent = erro.message || "Erro ao carregar quiz.";
    }
}

// Verificar se todas as perguntas foram respondidas
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
            'input[type="radio"]:checked'
        );

        if (!selecionada) {
            mensagemQuiz.textContent =
                "Responda todas as perguntas antes de finalizar.";
            return;
        }

        const idPergunta = selecionada.name.replace(
            "pergunta-",
            ""
        );

        respostas.push({
            id_pergunta: Number(idPergunta),
            alternativa_escolhida: selecionada.value
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

        resultadoQuiz.innerHTML = `
            <div class="material">
                <h2>Resultado do Quiz</h2>
                <h3>Você acertou ${resultado.pontuacao} de ${resultado.total_perguntas} questões!</h3>
                <p>Pontuação: ${resultado.pontuacao}/${resultado.total_perguntas}</p>
            </div>
        `;

        areaPerguntas.querySelectorAll("input").forEach(input => {
            input.disabled = true;
        });

        areaPerguntas.querySelector("button").disabled = true;

    } catch (erro) {
        console.error(erro);
        mensagemQuiz.textContent =
            erro.message || "Não foi possível finalizar o quiz.";
    }
}
carregarQuiz();
