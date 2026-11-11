
const formPublicacao = document.getElementById("formPublicacao");
const listaPublicacoes = document.getElementById("listaPublicacoes");
const mensagemPublicacao = document.getElementById("mensagemPublicacao");

// Identificar aluno conectado
function obterAluno() {
    const alunoSalvo = localStorage.getItem("alunoLogado");

    if (!alunoSalvo) {
        window.location.href = "index.html";
        return null;
    }

    return JSON.parse(alunoSalvo);
}

// Formatar data
function formatarData(data) {
    return new Date(data).toLocaleString("pt-BR");
}

// Carregar publicações
async function carregarPublicacoes() {
    try {
        const resposta = await fetch("/api/forum/publicacoes");

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar as publicações.");
        }

        const publicacoes = await resposta.json();

        listaPublicacoes.innerHTML = "";

        if (publicacoes.length === 0) {
            listaPublicacoes.innerHTML =
                '<p class="vazio-forum">Ainda não existem publicações. Seja o primeiro a participar!</p>';
            return;
        }

        publicacoes.forEach(publicacao => {
            const card = document.createElement("article");
            card.className = "forum-card publicacao";

            const titulo = document.createElement("h3");
            titulo.textContent = publicacao.titulo;

            const informacoes = document.createElement("p");
            informacoes.className = "publicacao-info";
            informacoes.textContent =
                `Publicado por ${publicacao.autor} • ${formatarData(publicacao.data_publicacao)}`;

            const conteudo = document.createElement("p");
            conteudo.className = "publicacao-conteudo";
            conteudo.textContent = publicacao.conteudo;

            const areaComentarios = document.createElement("div");
            areaComentarios.className = "area-comentarios";

            const tituloComentarios = document.createElement("h4");
            tituloComentarios.textContent = "Comentários";

            const listaComentarios = document.createElement("div");

            const formularioComentario = document.createElement("form");

            const campoComentario = document.createElement("textarea");
            campoComentario.placeholder = "Escreva um comentário...";
            campoComentario.required = true;
            campoComentario.rows = 2;

            const botaoComentario = document.createElement("button");
            botaoComentario.type = "submit";
            botaoComentario.textContent = "Comentar";

            formularioComentario.appendChild(campoComentario);
            formularioComentario.appendChild(botaoComentario);

            formularioComentario.addEventListener("submit", async (evento) => {
                evento.preventDefault();

                const aluno = obterAluno();
                if (!aluno) return;

                try {
                    const resposta = await fetch(
                        `/api/forum/publicacoes/${publicacao.id_publicacao}/comentarios`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                id_estudante: aluno.id,
                                comentario: campoComentario.value.trim()
                            })
                        }
                    );

                    const dados = await resposta.json();

                    if (!resposta.ok) {
                        throw new Error(dados.erro || "Não foi possível comentar.");
                    }

                    campoComentario.value = "";
                    await carregarComentarios(
                        publicacao.id_publicacao,
                        listaComentarios
                    );

                } catch (erro) {
                    alert(erro.message);
                }
            });

            areaComentarios.appendChild(tituloComentarios);
            areaComentarios.appendChild(listaComentarios);
            areaComentarios.appendChild(formularioComentario);

            card.appendChild(titulo);
            card.appendChild(informacoes);
            card.appendChild(conteudo);
            card.appendChild(areaComentarios);

            listaPublicacoes.appendChild(card);

            carregarComentarios(
                publicacao.id_publicacao,
                listaComentarios
            );
        });

    } catch (erro) {
        listaPublicacoes.innerHTML =
            '<p class="vazio-forum">Erro ao carregar as publicações.</p>';

        console.error(erro);
    }
}

// Carregar comentários de uma publicação
async function carregarComentarios(idPublicacao, elemento) {
    try {
        const resposta = await fetch(
            `/api/forum/publicacoes/${idPublicacao}/comentarios`
        );

        if (!resposta.ok) {
            throw new Error("Erro ao carregar comentários.");
        }

        const comentarios = await resposta.json();

        elemento.innerHTML = "";

        if (comentarios.length === 0) {
            elemento.textContent = "Nenhum comentário ainda.";
            return;
        }

        comentarios.forEach(comentario => {
            const card = document.createElement("div");
            card.className = "comentario";

            const texto = document.createElement("p");
            texto.textContent = comentario.comentario;

            const autor = document.createElement("small");
            autor.textContent =
                `${comentario.autor} • ${formatarData(comentario.data_comentario)}`;

            card.appendChild(texto);
            card.appendChild(autor);

            elemento.appendChild(card);
        });

    } catch (erro) {
        elemento.textContent = "Não foi possível carregar os comentários.";
        console.error(erro);
    }
}

// Publicar nova publicação
formPublicacao.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const aluno = obterAluno();
    if (!aluno) return;

    const titulo = document.getElementById("titulo").value.trim();
    const conteudo = document.getElementById("conteudo").value.trim();

    if (!titulo || !conteudo) {
        mensagemPublicacao.textContent = "Preencha todos os campos.";
        return;
    }

    try {
        const resposta = await fetch("/api/forum/publicacoes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_estudante: aluno.id,
                titulo,
                conteudo
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível publicar.");
        }

        mensagemPublicacao.textContent = dados.mensagem;
        mensagemPublicacao.style.color = "green";

        formPublicacao.reset();

        await carregarPublicacoes();

    } catch (erro) {
        mensagemPublicacao.textContent = erro.message;
        mensagemPublicacao.style.color = "red";
    }
});

// Sair da conta
document.getElementById("sair").addEventListener("click", (evento) => {
    evento.preventDefault();

    localStorage.removeItem("alunoLogado");
    window.location.href = "index.html";
});

// Iniciar fórum
obterAluno();
carregarPublicacoes();
