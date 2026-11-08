
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Abrir o cadastro ao acessar a página inicial
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
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

// Teste para identificar o banco e a tabela
app.get("/api/teste-banco", async (req, res) => {
    let conexao;

    try {
        conexao = await conectarBanco();

        const [resultado] = await conexao.execute(`
            SELECT
                DATABASE() AS banco,
                @@hostname AS servidor,
                @@port AS porta
        `);

        const [tabelas] = await conexao.execute(
            "SHOW TABLES LIKE 'conteudos_professor'"
        );

        res.json({
            conexao: resultado[0],
            tabelaEncontrada: tabelas.length > 0,
            tabelas
        });

    } catch (erro) {
        console.error("ERRO TESTE:", erro);

        res.status(500).json({
            erro: erro.message
        });

    } finally {
        if (conexao) await conexao.end();
    }
});

// Cadastro de professor
app.post("/api/cadastro-professor", async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            mensagem: "Preencha todos os campos."
        });
    }

    if (senha.length < 6) {
        return res.status(400).json({
            mensagem: "A senha deve ter pelo menos 6 caracteres."
        });
    }

    let conexao;

    try {
        const senhaHash = await bcrypt.hash(senha, 10);
        conexao = await conectarBanco();

        await conexao.execute(
            `INSERT INTO professores
             (nome_completo, email, senha_hash)
             VALUES (?, ?, ?)`,
            [nome.trim(), email.trim().toLowerCase(), senhaHash]
        );

        res.status(201).json({
            mensagem: "Professor cadastrado com sucesso!"
        });

    } catch (erro) {
        console.error(erro.code || erro.message);

        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        res.status(500).json({
            mensagem: "Não foi possível cadastrar o professor."
        });

    } finally {
        if (conexao) await conexao.end();
    }
});

// Login do professor
app.post("/api/login-professor", async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            mensagem: "Preencha o e-mail e a senha."
        });
    }

    let conexao;

    try {
        conexao = await conectarBanco();

        const [professores] = await conexao.execute(
            `SELECT id_professor, nome_completo, email, senha_hash
             FROM professores
             WHERE email = ?`,
            [email.trim().toLowerCase()]
        );

        if (professores.length === 0) {
            return res.status(401).json({
                mensagem: "E-mail ou senha incorretos."
            });
        }

        const professor = professores[0];

        const senhaCorreta = await bcrypt.compare(
            senha,
            professor.senha_hash
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: "E-mail ou senha incorretos."
            });
        }

        res.json({
            mensagem: "Login realizado com sucesso!",
            professor: {
                id: professor.id_professor,
                nome: professor.nome_completo,
                email: professor.email
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

 // Publicar conteúdo de estudo pelo professor
app.post("/api/conteudos-professor", async (req, res) => {
    const { id_professor, disciplina, titulo, resumo } = req.body;

    const idProfessor = Number(id_professor);

    if (
        !Number.isInteger(idProfessor) ||
        idProfessor < 1 ||
        !disciplina ||
        !titulo ||
        !resumo
    ) {
        return res.status(400).json({
            mensagem: "Preencha todos os campos."
        });
    }

    let conexao;

    try {
        conexao = await conectarBanco();

        const [professores] = await conexao.execute(
            "SELECT id_professor FROM professores WHERE id_professor = ?",
            [idProfessor]
        );

        if (professores.length === 0) {
            return res.status(404).json({
                mensagem: "Professor não encontrado."
            });
        }

        await conexao.execute(
            `INSERT INTO conteudos_professor
             (id_professor, disciplina, titulo, resumo)
             VALUES (?, ?, ?, ?)`,
            [idProfessor, disciplina, titulo.trim(), resumo.trim()]
        );

        res.status(201).json({
            mensagem: "Conteúdo publicado com sucesso!"
        });

    } catch (erro) {
        console.error(erro.code || erro.message);

        res.status(500).json({
            mensagem: "Erro ao publicar conteúdo."
        });

    } finally {
        if (conexao) await conexao.end();
    }
});

// Buscar conteúdos publicados pelos professores
app.get("/api/conteudos-professor", async (req, res) => {
    let conexao;

    try {
        conexao = await conectarBanco();

        const [conteudos] = await conexao.execute(
            `SELECT
                c.id_conteudo,
                c.disciplina,
                c.titulo,
                c.resumo,
                c.data_publicacao,
                p.nome_completo AS professor
             FROM conteudos_professor c
             INNER JOIN professores p
                ON c.id_professor = p.id_professor
             ORDER BY c.data_publicacao DESC`
        );

        res.json(conteudos);

   } catch (erro) {
    console.error("ERRO COMPLETO:", erro);

    res.status(500).json({
        mensagem: "Erro ao buscar conteúdos."
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
// Publicar material de estudo
app.post("/api/materiais", async (req, res) => {
    const {
        id_estudante,
        id_disciplina,
        titulo,
        descricao,
        tipo,
        caminho_arquivo
    } = req.body;

    const idEstudante = Number(id_estudante);
    const idDisciplina = Number(id_disciplina);

    const tiposPermitidos = ["resumo", "exercicio", "dica", "arquivo"];

    if (
        !Number.isInteger(idEstudante) || idEstudante < 1 ||
        !Number.isInteger(idDisciplina) || idDisciplina < 1 ||
        !titulo || !titulo.trim() ||
        !tiposPermitidos.includes(tipo)
    ) {
        return res.status(400).json({
            mensagem: "Preencha os campos obrigatórios corretamente."
        });
    }

    let conexao;

    try {
        conexao = await conectarBanco();

        const [alunos] = await conexao.execute(
            "SELECT id_estudante FROM estudantes WHERE id_estudante = ?",
            [idEstudante]
        );

        if (alunos.length === 0) {
            return res.status(404).json({
                mensagem: "Aluno não encontrado."
            });
        }

        const [disciplinas] = await conexao.execute(
            "SELECT id_disciplina FROM disciplinas WHERE id_disciplina = ?",
            [idDisciplina]
        );

        if (disciplinas.length === 0) {
            return res.status(404).json({
                mensagem: "Disciplina não encontrada."
            });
        }

        await conexao.execute(
            `INSERT INTO materiais
            (id_estudante, id_disciplina, titulo, descricao, tipo, caminho_arquivo)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                idEstudante,
                idDisciplina,
                titulo.trim(),
                descricao || null,
                tipo,
                caminho_arquivo || null
            ]
        );

        res.status(201).json({
            mensagem: "Material publicado com sucesso!"
        });

    } catch (erro) {
        console.error("ERRO AO PUBLICAR MATERIAL:", erro);

        res.status(500).json({
            mensagem: "Erro ao publicar material."
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
// ==========================================
// PUBLICAR QUIZ PELO PROFESSOR
// ==========================================

app.post("/api/quiz", async (req, res) => {
    const { id_disciplina, id_professor, titulo, perguntas } = req.body;

    const idDisciplina = Number(id_disciplina);
    const idProfessor = Number(id_professor);

    if (
        !Number.isInteger(idDisciplina) || idDisciplina < 1 ||
        !Number.isInteger(idProfessor) || idProfessor < 1 ||
        !titulo?.trim() ||
        !Array.isArray(perguntas) ||
        perguntas.length === 0
    ) {
        return res.status(400).json({
            mensagem: "Preencha os dados do quiz e adicione perguntas."
        });
    }

    for (const pergunta of perguntas) {
        if (
            !pergunta.enunciado?.trim() ||
            !pergunta.alternativa_a?.trim() ||
            !pergunta.alternativa_b?.trim() ||
            !pergunta.alternativa_c?.trim() ||
            !pergunta.alternativa_d?.trim() ||
            !["A", "B", "C", "D"].includes(pergunta.resposta_correta)
        ) {
            return res.status(400).json({
                mensagem: "Preencha todas as perguntas e alternativas corretamente."
            });
        }
    }

    let conexao;
    let transacaoIniciada = false;

    try {
        conexao = await conectarBanco();

        const [professores] = await conexao.execute(
            "SELECT id_professor FROM professores WHERE id_professor = ?",
            [idProfessor]
        );

        const [disciplinas] = await conexao.execute(
            "SELECT id_disciplina FROM disciplinas WHERE id_disciplina = ?",
            [idDisciplina]
        );

        if (professores.length === 0 || disciplinas.length === 0) {
            return res.status(404).json({
                mensagem: "Professor ou disciplina não encontrado."
            });
        }

        await conexao.beginTransaction();
        transacaoIniciada = true;

        const [resultadoQuiz] = await conexao.execute(
            `INSERT INTO quizzes
            (id_disciplina, id_professor, titulo)
            VALUES (?, ?, ?)`,
            [idDisciplina, idProfessor, titulo.trim()]
        );

        const idQuiz = resultadoQuiz.insertId;

        for (const pergunta of perguntas) {
            await conexao.execute(
                `INSERT INTO perguntas_quiz
                (
                    id_quiz,
                    id_disciplina,
                    enunciado,
                    alternativa_a,
                    alternativa_b,
                    alternativa_c,
                    alternativa_d,
                    resposta_correta,
                    explicacao
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    idQuiz,
                    idDisciplina,
                    pergunta.enunciado.trim(),
                    pergunta.alternativa_a.trim(),
                    pergunta.alternativa_b.trim(),
                    pergunta.alternativa_c.trim(),
                    pergunta.alternativa_d.trim(),
                    pergunta.resposta_correta,
                    pergunta.explicacao?.trim() || null
                ]
            );
        }

        await conexao.commit();
        transacaoIniciada = false;

        res.status(201).json({
            mensagem: "Quiz publicado com sucesso!",
            id_quiz: idQuiz,
            total_perguntas: perguntas.length
        });

    } catch (erro) {
        if (conexao && transacaoIniciada) {
            await conexao.rollback();
        }

        console.error("ERRO AO PUBLICAR QUIZ:", erro);

        res.status(500).json({
            mensagem: "Erro ao publicar quiz."
        });

    } finally {
        if (conexao) await conexao.end();
    }
});
// ==========================================
// LISTAR QUIZZES POR DISCIPLINA
// ==========================================

app.get("/api/quizzes/:id_disciplina", async (req, res) => {
    let conexao;

    try {
        const idDisciplina = Number(req.params.id_disciplina);

        conexao = await conectarBanco();

        const [quizzes] = await conexao.execute(
            `SELECT id_quiz, id_disciplina, titulo, data_publicacao
             FROM quizzes
             WHERE id_disciplina = ?
             ORDER BY data_publicacao DESC`,
            [idDisciplina]
        );

        res.json(quizzes);

    } catch (erro) {
        console.error("ERRO AO BUSCAR QUIZZES:", erro);

        res.status(500).json({
            mensagem: "Erro ao buscar quizzes."
        });

    } finally {
        if (conexao) await conexao.end();
    }
});
// ==========================================
// BUSCAR UM QUIZ ESPECÍFICO
// ==========================================

app.get("/api/quiz/:id_quiz", async (req, res) => {
    let conexao;

    try {
        const idQuiz = Number(req.params.id_quiz);

        if (!Number.isInteger(idQuiz) || idQuiz < 1) {
            return res.status(400).json({
                mensagem: "ID do quiz inválido."
            });
        }

        conexao = await conectarBanco();

        const [quizzes] = await conexao.execute(
            `SELECT id_quiz, id_disciplina, titulo
             FROM quizzes
             WHERE id_quiz = ?`,
            [idQuiz]
        );

        if (quizzes.length === 0) {
            return res.status(404).json({
                mensagem: "Quiz não encontrado."
            });
        }

        const [perguntas] = await conexao.execute(
            `SELECT
                id_pergunta,
                enunciado,
                alternativa_a,
                alternativa_b,
                alternativa_c,
                alternativa_d
             FROM perguntas_quiz
             WHERE id_quiz = ?
             ORDER BY id_pergunta`,
            [idQuiz]
        );

        res.json({
            quiz: quizzes[0],
            perguntas
        });

    } catch (erro) {
        console.error("ERRO AO BUSCAR QUIZ:", erro);

        res.status(500).json({
            mensagem: "Erro ao buscar o quiz."
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
    const {
        id_estudante,
        id_disciplina,
        id_quiz,
        respostas
    } = req.body;

    const idEstudante = Number(id_estudante);
    const idDisciplina = Number(id_disciplina);
    const idQuiz = id_quiz ? Number(id_quiz) : null;

    if (
        !Number.isInteger(idEstudante) ||
        idEstudante < 1 ||
        !Number.isInteger(idDisciplina) ||
        idDisciplina < 1 ||
        (idQuiz !== null &&
            (!Number.isInteger(idQuiz) || idQuiz < 1)) ||
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
            !["A", "B", "C", "D"].includes(
                resposta.alternativa_escolhida
            )
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

        const [alunos] = await conexao.execute(
            "SELECT id_estudante FROM estudantes WHERE id_estudante = ?",
            [idEstudante]
        );

        if (alunos.length === 0) {
            return res.status(404).json({
                mensagem: "Aluno não encontrado."
            });
        }

        let perguntas;

        if (idQuiz !== null) {
            const [quizzes] = await conexao.execute(
                `SELECT id_quiz
                 FROM quizzes
                 WHERE id_quiz = ? AND id_disciplina = ?`,
                [idQuiz, idDisciplina]
            );

            if (quizzes.length === 0) {
                return res.status(404).json({
                    mensagem: "Quiz não encontrado nesta disciplina."
                });
            }

            const [resultadoPerguntas] = await conexao.execute(
                `SELECT id_pergunta, resposta_correta
                 FROM perguntas_quiz
                 WHERE id_quiz = ? AND id_disciplina = ?`,
                [idQuiz, idDisciplina]
            );

            perguntas = resultadoPerguntas;
        } else {
            const [resultadoPerguntas] = await conexao.execute(
                `SELECT id_pergunta, resposta_correta
                 FROM perguntas_quiz
                 WHERE id_disciplina = ? AND id_quiz IS NULL`,
                [idDisciplina]
            );

            perguntas = resultadoPerguntas;
        }

        if (perguntas.length === 0) {
            return res.status(400).json({
                mensagem: "Este quiz não possui perguntas."
            });
        }

        if (respostas.length !== perguntas.length) {
            return res.status(400).json({
                mensagem: "Responda todas as perguntas antes de finalizar."
            });
        }

        const mapaPerguntas = new Map(
            perguntas.map(pergunta => [
                Number(pergunta.id_pergunta),
                pergunta.resposta_correta
            ])
        );

        for (const resposta of respostas) {
            if (!mapaPerguntas.has(Number(resposta.id_pergunta))) {
                return res.status(400).json({
                    mensagem: "Uma questão não pertence a este quiz."
                });
            }
        }

        await conexao.beginTransaction();
        transacaoIniciada = true;

        let pontuacao = 0;

       const [resultadoTentativa] = await conexao.execute(
    `INSERT INTO tentativas_quiz
     (id_estudante, id_disciplina, id_quiz, pontuacao, total_perguntas)
     VALUES (?, ?, ?, 0, ?)`,
    [idEstudante, idDisciplina, idQuiz, perguntas.length]
);

        const idTentativa = resultadoTentativa.insertId;

        for (const resposta of respostas) {
            const idPergunta = Number(resposta.id_pergunta);
            const alternativa = resposta.alternativa_escolhida;

            const correta =
                alternativa === mapaPerguntas.get(idPergunta);

            if (correta) {
                pontuacao++;
            }

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
            total_perguntas: perguntas.length
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

// ==========================================
// TRABALHOS PUBLICADOS PELOS ESTUDANTES
// ==========================================

// Publicar um trabalho
app.post("/api/trabalhos", async (req, res) => {
    const {
        id_estudante,
        id_disciplina,
        titulo,
        descricao,
        objetivo,
        caminho_arquivo
    } = req.body;

    const idEstudante = Number(id_estudante);
    const idDisciplina = Number(id_disciplina);

    if (
        !Number.isInteger(idEstudante) || idEstudante < 1 ||
        !Number.isInteger(idDisciplina) || idDisciplina < 1 ||
        !titulo || !titulo.trim()
    ) {
        return res.status(400).json({
            mensagem: "Preencha o título, aluno e disciplina."
        });
    }

    let conexao;

    try {
        conexao = await conectarBanco();

        const [alunos] = await conexao.execute(
            "SELECT id_estudante FROM estudantes WHERE id_estudante = ?",
            [idEstudante]
        );

        if (alunos.length === 0) {
            return res.status(404).json({
                mensagem: "Aluno não encontrado."
            });
        }

        const [disciplinas] = await conexao.execute(
            "SELECT id_disciplina FROM disciplinas WHERE id_disciplina = ?",
            [idDisciplina]
        );

        if (disciplinas.length === 0) {
            return res.status(404).json({
                mensagem: "Disciplina não encontrada."
            });
        }

        await conexao.execute(
            `INSERT INTO trabalhos
            (id_estudante, id_disciplina, titulo, descricao, objetivo, caminho_arquivo)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                idEstudante,
                idDisciplina,
                titulo.trim(),
                descricao || null,
                objetivo || null,
                caminho_arquivo || null
            ]
        );

        res.status(201).json({
            mensagem: "Trabalho publicado com sucesso!"
        });

    } catch (erro) {
        console.error("ERRO AO PUBLICAR TRABALHO:", erro);

        res.status(500).json({
            mensagem: "Erro ao publicar trabalho."
        });

    } finally {
        if (conexao) await conexao.end();
    }
});


// Buscar todos os trabalhos publicados
app.get("/api/trabalhos", async (req, res) => {
    let conexao;

    try {
        conexao = await conectarBanco();

        const [trabalhos] = await conexao.execute(
            `SELECT
                t.id_trabalho,
                t.titulo,
                t.descricao,
                t.objetivo,
                t.caminho_arquivo,
                t.data_publicacao,
                e.id_estudante,
                e.nome_completo AS autor,
                d.nome AS disciplina
             FROM trabalhos t
             INNER JOIN estudantes e
                ON t.id_estudante = e.id_estudante
             INNER JOIN disciplinas d
                ON t.id_disciplina = d.id_disciplina
             ORDER BY t.data_publicacao DESC`
        );

        res.json(trabalhos);

    } catch (erro) {
        console.error("ERRO AO BUSCAR TRABALHOS:", erro);

        res.status(500).json({
            mensagem: "Erro ao buscar trabalhos."
        });

    } finally {
        if (conexao) await conexao.end();
    }
});


// Publicar comentário em um trabalho
app.post("/api/trabalhos/:id_trabalho/comentarios", async (req, res) => {
    const idTrabalho = Number(req.params.id_trabalho);
    const idEstudante = Number(req.body.id_estudante);
    const comentario = req.body.comentario;

    if (
        !Number.isInteger(idTrabalho) || idTrabalho < 1 ||
        !Number.isInteger(idEstudante) || idEstudante < 1 ||
        !comentario || !comentario.trim()
    ) {
        return res.status(400).json({
            mensagem: "Informe o aluno e o comentário."
        });
    }

    let conexao;

    try {
        conexao = await conectarBanco();

        const [trabalhos] = await conexao.execute(
            "SELECT id_trabalho FROM trabalhos WHERE id_trabalho = ?",
            [idTrabalho]
        );

        if (trabalhos.length === 0) {
            return res.status(404).json({
                mensagem: "Trabalho não encontrado."
            });
        }

        const [alunos] = await conexao.execute(
            "SELECT id_estudante FROM estudantes WHERE id_estudante = ?",
            [idEstudante]
        );

        if (alunos.length === 0) {
            return res.status(404).json({
                mensagem: "Aluno não encontrado."
            });
        }

        await conexao.execute(
            `INSERT INTO comentarios_trabalhos
            (id_trabalho, id_estudante, comentario)
            VALUES (?, ?, ?)`,
            [idTrabalho, idEstudante, comentario.trim()]
        );

        res.status(201).json({
            mensagem: "Comentário publicado com sucesso!"
        });

    } catch (erro) {
        console.error("ERRO AO PUBLICAR COMENTÁRIO:", erro);

        res.status(500).json({
            mensagem: "Erro ao publicar comentário."
        });

    } finally {
        if (conexao) await conexao.end();
    }
});


// Buscar comentários de um trabalho
app.get("/api/trabalhos/:id_trabalho/comentarios", async (req, res) => {
    const idTrabalho = Number(req.params.id_trabalho);

    if (!Number.isInteger(idTrabalho) || idTrabalho < 1) {
        return res.status(400).json({
            mensagem: "Trabalho inválido."
        });
    }

    let conexao;

    try {
        conexao = await conectarBanco();

        const [comentarios] = await conexao.execute(
            `SELECT
                c.id_comentario,
                c.comentario,
                c.data_comentario,
                e.id_estudante,
                e.nome_completo AS autor
             FROM comentarios_trabalhos c
             INNER JOIN estudantes e
                ON c.id_estudante = e.id_estudante
             WHERE c.id_trabalho = ?
             ORDER BY c.data_comentario ASC`,
            [idTrabalho]
        );

        res.json(comentarios);

    } catch (erro) {
        console.error("ERRO AO BUSCAR COMENTÁRIOS:", erro);

        res.status(500).json({
            mensagem: "Erro ao buscar comentários."
        });

    } finally {
        if (conexao) await conexao.end();
    }
});

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
// Buscar histórico de quizzes do estudante
app.get("/api/historico-quiz/:id_estudante", async (req, res) => {
    let conexao;

    try {
        const idEstudante = Number(req.params.id_estudante);

        if (!Number.isInteger(idEstudante) || idEstudante < 1) {
            return res.status(400).json({
                mensagem: "ID do estudante inválido."
            });
        }

        conexao = await conectarBanco();

        const [historico] = await conexao.execute(
            `SELECT
                t.id_tentativa,
                t.id_quiz,
                q.titulo AS titulo_quiz,
                d.nome AS disciplina,
                t.pontuacao,
                t.total_perguntas,
                t.data_tentativa
             FROM tentativas_quiz t
             LEFT JOIN quizzes q ON t.id_quiz = q.id_quiz
             INNER JOIN disciplinas d ON t.id_disciplina = d.id_disciplina
             WHERE t.id_estudante = ?
             ORDER BY t.data_tentativa DESC`,
            [idEstudante]
        );

        res.json(historico);

    } catch (erro) {
        console.error(erro.code || erro.message);

        res.status(500).json({
            mensagem: "Não foi possível carregar o histórico."
        });

    } finally {
        if (conexao) await conexao.end();
    }
});
app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
});
