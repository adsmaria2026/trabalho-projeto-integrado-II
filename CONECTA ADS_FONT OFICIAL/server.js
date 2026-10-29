
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Abrir o cadastro ao acessar a página inicial
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/cadastro.html");
});

app.use(express.static(__dirname));

 // Criar conexão com o MySQL
async function conectarBanco() {
    return mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: {
            rejectUnauthorized: false
        },
        connectTimeout: 20000
    });
}

// Teste do servidor
app.get("/teste", (req, res) => {
    res.send("Servidor funcionando!");
});

// Teste da conexão com o MySQL
app.get("/api/status", async (req, res) => {
    let conexao;

    try {
        conexao = await conectarBanco();
        await conexao.ping();

        res.json({
            mensagem: "Conecta ADS conectado ao MySQL!"
        });
    } catch (erro) {
        console.error(erro.code || erro.message);

        res.status(500).json({
            mensagem: "Erro ao conectar ao MySQL."
        });
    } finally {
        if (conexao) await conexao.end();
    }
});

// Cadastro de aluno
app.post("/api/cadastro", async (req, res) => {
    const { nome, ra, senha } = req.body;

    if (!nome || !ra || !senha) {
        return res.status(400).json({
            mensagem: "Preencha todos os campos."
        });
    }

    let conexao;

    try {
        const senhaHash = await bcrypt.hash(senha, 10);
        conexao = await conectarBanco();

        await conexao.execute(
            `INSERT INTO estudantes
             (nome_completo, ra, senha_hash)
             VALUES (?, ?, ?)`,
            [nome.trim(), ra.trim(), senhaHash]
        );

        res.status(201).json({
            mensagem: "Cadastro realizado com sucesso!"
        });
    } catch (erro) {
        console.error(erro.code || erro.message);

        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "Este RA já está cadastrado."
            });
        }

        res.status(500).json({
            mensagem: "Não foi possível realizar o cadastro."
        });
    } finally {
        if (conexao) await conexao.end();
    }
});

// Login do aluno
app.post("/api/login", async (req, res) => {
    const { ra, senha } = req.body;

    if (!ra || !senha) {
        return res.status(400).json({
            mensagem: "Preencha o RA e a senha."
        });
    }

    let conexao;

    try {
        conexao = await conectarBanco();

        const [alunos] = await conexao.execute(
            `SELECT id_estudante, nome_completo, ra, senha_hash
             FROM estudantes
             WHERE ra = ?`,
            [ra.trim()]
        );

        if (alunos.length === 0) {
            return res.status(401).json({
                mensagem: "RA ou senha incorretos."
            });
        }

        const aluno = alunos[0];
        const senhaCorreta = await bcrypt.compare(
            senha,
            aluno.senha_hash
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: "RA ou senha incorretos."
            });
        }

        res.json({
            mensagem: "Login realizado com sucesso!",
            aluno: {
                id: aluno.id_estudante,
                nome: aluno.nome_completo,
                ra: aluno.ra
            }
        });
    } catch (erro) {
        console.error(erro.code || erro.message);

        res.status(500).json({
            mensagem: "Erro ao realizar login."
        });
    } finally {
        if (conexao) await conexao.end();
    }
});

// Buscar materiais de uma disciplina
app.get("/api/materiais/:id_disciplina", async (req, res) => {
    let conexao;

    try {
        const idDisciplina = Number(req.params.id_disciplina);

        if (!Number.isInteger(idDisciplina) || idDisciplina < 1) {
            return res.status(400).json({
                mensagem: "Disciplina inválida."
            });
        }

        conexao = await conectarBanco();

        const [materiais] = await conexao.execute(
            `SELECT
                m.id_material,
                m.titulo,
                m.descricao,
                m.tipo,
                m.caminho_arquivo,
                m.data_publicacao,
                d.nome AS disciplina,
                e.nome_completo AS autor
             FROM materiais m
             INNER JOIN disciplinas d
                ON m.id_disciplina = d.id_disciplina
             INNER JOIN estudantes e
                ON m.id_estudante = e.id_estudante
             WHERE m.id_disciplina = ?
             ORDER BY m.data_publicacao DESC`,
            [idDisciplina]
        );

        res.json(materiais);
    } catch (erro) {
        console.error(erro.code || erro.message);

        res.status(500).json({
            mensagem: "Erro ao buscar materiais."
        });
    } finally {
        if (conexao) await conexao.end();
    }
});

// Buscar perguntas do quiz por disciplina
app.get("/api/perguntas-quiz/:id_disciplina", async (req, res) => {
    let conexao;

    try {
        const idDisciplina = Number(req.params.id_disciplina);

        if (!Number.isInteger(idDisciplina) || idDisciplina < 1) {
            return res.status(400).json({
                mensagem: "Disciplina inválida."
            });
        }

        conexao = await conectarBanco();

        // Não enviar a resposta correta ao navegador.
        const [perguntas] = await conexao.execute(
            `SELECT
                id_pergunta,
                enunciado,
                alternativa_a,
                alternativa_b,
                alternativa_c,
                alternativa_d,
                explicacao
             FROM perguntas_quiz
             WHERE id_disciplina = ?
             ORDER BY id_pergunta`,
            [idDisciplina]
        );

        res.json(perguntas);
    } catch (erro) {
        console.error(erro.code || erro.message);

        res.status(500).json({
            mensagem: "Erro ao buscar perguntas do quiz."
        });
    } finally {
        if (conexao) await conexao.end();
    }
});

// Salvar uma tentativa e as respostas do quiz
app.post("/api/tentativas-quiz", async (req, res) => {
    const { id_estudante, id_disciplina, respostas } = req.body;

    const idEstudante = Number(id_estudante);
    const idDisciplina = Number(id_disciplina);

    if (
        !Number.isInteger(idEstudante) ||
        idEstudante < 1 ||
        !Number.isInteger(idDisciplina) ||
        idDisciplina < 1 ||
        !Array.isArray(respostas) ||
        respostas.length === 0
    ) {
        return res.status(400).json({
            mensagem: "Envie o aluno, a disciplina e as respostas."
        });
    }

    const idsPerguntas = new Set();

    for (const resposta of respostas) {
        if (
            !Number.isInteger(Number(resposta.id_pergunta)) ||
            Number(resposta.id_pergunta) < 1 ||
            !["A", "B", "C", "D"].includes(resposta.alternativa_escolhida)
        ) {
            return res.status(400).json({
                mensagem: "Existe uma resposta inválida."
            });
        }

        if (idsPerguntas.has(Number(resposta.id_pergunta))) {
            return res.status(400).json({
                mensagem: "Uma questão foi enviada mais de uma vez."
            });
        }

        idsPerguntas.add(Number(resposta.id_pergunta));
    }

    let conexao;
    let transacaoIniciada = false;

    try {
        conexao = await conectarBanco();

        // Confirmar que o aluno existe.
        const [alunos] = await conexao.execute(
            "SELECT id_estudante FROM estudantes WHERE id_estudante = ?",
            [idEstudante]
        );

        if (alunos.length === 0) {
            return res.status(404).json({
                mensagem: "Aluno não encontrado."
            });
        }

        // Buscar as respostas corretas diretamente no banco.
        const [perguntas] = await conexao.execute(
            `SELECT id_pergunta, resposta_correta
             FROM perguntas_quiz
             WHERE id_disciplina = ?`,
            [idDisciplina]
        );

        const mapaPerguntas = new Map(
            perguntas.map(pergunta => [
                Number(pergunta.id_pergunta),
                pergunta.resposta_correta
            ])
        );

        // Garantir que todas as questões enviadas pertencem ao quiz.
        for (const resposta of respostas) {
            if (!mapaPerguntas.has(Number(resposta.id_pergunta))) {
                return res.status(400).json({
                    mensagem: "Uma questão não pertence a esta disciplina."
                });
            }
        }

        await conexao.beginTransaction();
        transacaoIniciada = true;

        let pontuacao = 0;

        const [resultadoTentativa] = await conexao.execute(
            `INSERT INTO tentativas_quiz
             (id_estudante, id_disciplina, pontuacao, total_perguntas)
             VALUES (?, ?, 0, ?)`,
            [idEstudante, idDisciplina, respostas.length]
        );

        const idTentativa = resultadoTentativa.insertId;

        for (const resposta of respostas) {
            const idPergunta = Number(resposta.id_pergunta);
            const alternativa = resposta.alternativa_escolhida;
            const correta =
                alternativa === mapaPerguntas.get(idPergunta);

            if (correta) pontuacao++;

            await conexao.execute(
                `INSERT INTO respostas_quiz
                 (id_tentativa, id_pergunta, alternativa_escolhida, correta)
                 VALUES (?, ?, ?, ?)`,
                [idTentativa, idPergunta, alternativa, correta ? 1 : 0]
            );
        }

        await conexao.execute(
            `UPDATE tentativas_quiz
             SET pontuacao = ?
             WHERE id_tentativa = ?`,
            [pontuacao, idTentativa]
        );

        await conexao.commit();
        transacaoIniciada = false;

        res.status(201).json({
            mensagem: "Tentativa salva com sucesso!",
            id_tentativa: idTentativa,
            pontuacao,
            total_perguntas: respostas.length
        });
    } catch (erro) {
        if (conexao && transacaoIniciada) {
            await conexao.rollback();
        }

        console.error(erro.code || erro.message);

        res.status(500).json({
            mensagem: "Não foi possível salvar a tentativa."
        });
    } finally {
        if (conexao) await conexao.end();
    }
});

 // Conferir resposta de uma questão sem revelar o gabarito
app.post("/api/conferir-resposta", async (req, res) => {
    const { id_pergunta, alternativa_escolhida } = req.body;

    const idPergunta = Number(id_pergunta);
    const alternativa = alternativa_escolhida;

    if (
        !Number.isInteger(idPergunta) ||
        idPergunta < 1 ||
        !["A", "B", "C", "D"].includes(alternativa)
    ) {
        return res.status(400).json({
            mensagem: "Questão ou alternativa inválida."
        });
    }

    let conexao;

    try {
        conexao = await conectarBanco();

        const [perguntas] = await conexao.execute(
            `SELECT resposta_correta, explicacao
             FROM perguntas_quiz
             WHERE id_pergunta = ?`,
            [idPergunta]
        );

        if (perguntas.length === 0) {
            return res.status(404).json({
                mensagem: "Questão não encontrada."
            });
        }

        const pergunta = perguntas[0];
        const correta = alternativa === pergunta.resposta_correta;

        res.json({
            correta,
            explicacao: pergunta.explicacao || ""
        });
    } catch (erro) {
        console.error(erro.code || erro.message);

        res.status(500).json({
            mensagem: "Erro ao conferir a resposta."
        });
    } finally {
        if (conexao) await conexao.end();
    }
});

// Buscar dados do perfil no MySQL
app.get("/api/perfil/:ra", async (req, res) => {
    let conexao;

    try {
        conexao = await conectarBanco();

        const [alunos] = await conexao.execute(
            `SELECT id_estudante, nome_completo, ra, curso, semestre
             FROM estudantes
             WHERE ra = ?`,
            [req.params.ra]
        );

        if (alunos.length === 0) {
            return res.status(404).json({
                mensagem: "Aluno não encontrado."
            });
        }

        res.json(alunos[0]);
    } catch (erro) {
        console.error(erro.code || erro.message);

        res.status(500).json({
            mensagem: "Erro ao buscar perfil do aluno."
        });
    } finally {
        if (conexao) await conexao.end();
    }
});

// Iniciar o servidor por último
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
});
