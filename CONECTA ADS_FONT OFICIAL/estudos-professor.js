
const listaConteudos = document.getElementById("listaConteudosProfessor");

async function carregarConteudosProfessor() {
    try {
        const resposta = await fetch("/api/conteudos-professor");

        if (!resposta.ok) {
            throw new Error("Não foi possível buscar os conteúdos.");
        }

        const conteudos = await resposta.json();

        listaConteudos.innerHTML = "";

        if (conteudos.length === 0) {
            listaConteudos.textContent = "Ainda não existem conteúdos publicados.";
            return;
        }

        conteudos.forEach((conteudo) => {
            const card = document.createElement("article");
            card.className = "material-card";

            const titulo = document.createElement("h3");
            titulo.textContent = conteudo.titulo;

            const disciplina = document.createElement("p");
            disciplina.textContent = "Disciplina: " + conteudo.disciplina;

            const resumo = document.createElement("p");
            resumo.textContent = conteudo.resumo;

            const professor = document.createElement("small");
            professor.textContent = "Publicado por: " + conteudo.professor;

            card.appendChild(titulo);
            card.appendChild(disciplina);
            card.appendChild(resumo);
            card.appendChild(professor);

            listaConteudos.appendChild(card);
        });

    } catch (erro) {
        console.error(erro);
        listaConteudos.textContent = "Erro ao carregar os conteúdos.";
    }
}

carregarConteudosProfessor();
