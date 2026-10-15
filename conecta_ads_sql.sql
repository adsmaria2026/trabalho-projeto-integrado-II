-- Banco de dados do projeto CONECTA ADS
-- Compatível com MySQL 8.0.16 ou superior.
-- Execute no MySQL Workbench.
-- Este script não apaga o banco nem os dados das 8 tabelas principais.
-- Ele remove tabelas antigas de projetos, comentários e curtidas, se existirem.
-- Ele cria 8 tabelas: estudantes, disciplinas, materiais, perguntas_quiz,
-- tentativas_quiz, respostas_quiz, perfis_academicos e trabalhos.
-- Projetos, comentários e curtidas foram retirados do escopo atual.
--
CREATE DATABASE IF NOT EXISTS conecta_ads
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE conecta_ads;

-- Remove tabelas antigas que não fazem mais parte do projeto.
-- ATENÇÃO: se existirem, os dados dessas três tabelas serão apagados.
-- As demais tabelas e seus dados são mantidos.
DROP TABLE IF EXISTS comentarios;
DROP TABLE IF EXISTS curtidas;
DROP TABLE IF EXISTS projetos;

-- 1. Estudantes: cadastro e login por RA
CREATE TABLE IF NOT EXISTS estudantes (
    id_estudante INT AUTO_INCREMENT PRIMARY KEY,
    nome_completo VARCHAR(150) NOT NULL,
    ra VARCHAR(30) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    curso VARCHAR(100) NOT NULL DEFAULT 'Análise e Desenvolvimento de Sistemas',
    semestre TINYINT UNSIGNED NOT NULL DEFAULT 2,
    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Disciplinas do segundo semestre
CREATE TABLE IF NOT EXISTS disciplinas (
    id_disciplina INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL UNIQUE,
    descricao TEXT
) ENGINE=InnoDB;

-- 3. Materiais compartilhados
CREATE TABLE IF NOT EXISTS materiais (
    id_material INT AUTO_INCREMENT PRIMARY KEY,
    id_estudante INT NOT NULL,
    id_disciplina INT NOT NULL,
    titulo VARCHAR(180) NOT NULL,
    descricao TEXT,
    tipo ENUM('resumo', 'exercicio', 'dica', 'arquivo') NOT NULL,
    caminho_arquivo VARCHAR(500),
    data_publicacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_materiais_estudante FOREIGN KEY (id_estudante)
        REFERENCES estudantes(id_estudante) ON DELETE CASCADE,
    CONSTRAINT fk_materiais_disciplina FOREIGN KEY (id_disciplina)
        REFERENCES disciplinas(id_disciplina) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Perguntas dos quizzes
CREATE TABLE IF NOT EXISTS perguntas_quiz (
    id_pergunta INT AUTO_INCREMENT PRIMARY KEY,
    id_disciplina INT NOT NULL,
    enunciado TEXT NOT NULL,
    alternativa_a VARCHAR(500) NOT NULL,
    alternativa_b VARCHAR(500) NOT NULL,
    alternativa_c VARCHAR(500) NOT NULL,
    alternativa_d VARCHAR(500) NOT NULL,
    resposta_correta ENUM('A', 'B', 'C', 'D') NOT NULL,
    explicacao TEXT,
    CONSTRAINT fk_perguntas_disciplina FOREIGN KEY (id_disciplina)
        REFERENCES disciplinas(id_disciplina) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Tentativas e pontuação dos quizzes
CREATE TABLE IF NOT EXISTS tentativas_quiz (
    id_tentativa INT AUTO_INCREMENT PRIMARY KEY,
    id_estudante INT NOT NULL,
    id_disciplina INT NOT NULL,
    pontuacao INT UNSIGNED NOT NULL DEFAULT 0,
    total_perguntas INT UNSIGNED NOT NULL DEFAULT 0,
    data_tentativa TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tentativas_estudante FOREIGN KEY (id_estudante)
        REFERENCES estudantes(id_estudante) ON DELETE CASCADE,
    CONSTRAINT fk_tentativas_disciplina FOREIGN KEY (id_disciplina)
        REFERENCES disciplinas(id_disciplina) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Respostas registradas em cada tentativa
CREATE TABLE IF NOT EXISTS respostas_quiz (
    id_resposta INT AUTO_INCREMENT PRIMARY KEY,
    id_tentativa INT NOT NULL,
    id_pergunta INT NOT NULL,
    alternativa_escolhida ENUM('A', 'B', 'C', 'D') NOT NULL,
    correta BOOLEAN NOT NULL,
    CONSTRAINT fk_respostas_tentativa FOREIGN KEY (id_tentativa)
        REFERENCES tentativas_quiz(id_tentativa) ON DELETE CASCADE,
    CONSTRAINT fk_respostas_pergunta FOREIGN KEY (id_pergunta)
        REFERENCES perguntas_quiz(id_pergunta) ON DELETE CASCADE,
    CONSTRAINT uq_resposta_por_tentativa UNIQUE (id_tentativa, id_pergunta)
) ENGINE=InnoDB;

-- 7. Perfil acadêmico
CREATE TABLE IF NOT EXISTS perfis_academicos (
    id_perfil INT AUTO_INCREMENT PRIMARY KEY,
    id_estudante INT NOT NULL UNIQUE,
    bio TEXT,
    interesses VARCHAR(500),
    habilidades VARCHAR(500),
    foto_perfil VARCHAR(500),
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_perfil_estudante FOREIGN KEY (id_estudante)
        REFERENCES estudantes(id_estudante) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Trabalhos acadêmicos compartilhados
CREATE TABLE IF NOT EXISTS trabalhos (
    id_trabalho INT AUTO_INCREMENT PRIMARY KEY,
    id_estudante INT NOT NULL,
    id_disciplina INT NOT NULL,
    titulo VARCHAR(180) NOT NULL,
    descricao TEXT,
    objetivo TEXT,
    caminho_arquivo VARCHAR(500),
    data_publicacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trabalhos_estudante FOREIGN KEY (id_estudante)
        REFERENCES estudantes(id_estudante) ON DELETE CASCADE,
    CONSTRAINT fk_trabalhos_disciplina FOREIGN KEY (id_disciplina)
        REFERENCES disciplinas(id_disciplina) ON DELETE RESTRICT
) ENGINE=InnoDB;




-- Disciplinas do segundo semestre. INSERT IGNORE evita duplicar nomes.
INSERT IGNORE INTO disciplinas (nome, descricao) VALUES
('Sistemas Operacionais', 'Gerenciamento de recursos de hardware e software'),
('Lógica e Matemática Computacional', 'Proposições, conectivos lógicos e conjuntos'),
('Modelagem de Dados', 'Entidades, atributos e relacionamentos');

-- Perguntas iniciais para o quiz de Sistemas Operacionais.
INSERT INTO perguntas_quiz
(id_disciplina, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta)
SELECT d.id_disciplina,
       'Qual é a principal função de um sistema operacional?',
       'Criar documentos', 'Gerenciar os recursos do computador',
       'Criar imagens', 'Navegar na internet', 'B'
FROM disciplinas d
WHERE d.nome = 'Sistemas Operacionais'
  AND NOT EXISTS (
      SELECT 1 FROM perguntas_quiz p
      WHERE p.id_disciplina = d.id_disciplina
        AND p.enunciado = 'Qual é a principal função de um sistema operacional?'
  );

INSERT INTO perguntas_quiz
(id_disciplina, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta)
SELECT d.id_disciplina,
       'Qual destes é um sistema operacional?',
       'YouTube', 'Google', 'Windows', 'Excel', 'C'
FROM disciplinas d
WHERE d.nome = 'Sistemas Operacionais'
  AND NOT EXISTS (
      SELECT 1 FROM perguntas_quiz p
      WHERE p.id_disciplina = d.id_disciplina
        AND p.enunciado = 'Qual destes é um sistema operacional?'
  );

INSERT INTO perguntas_quiz
(id_disciplina, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta)
SELECT d.id_disciplina,
       'O que o sistema operacional gerencia?',
       'Apenas a internet', 'Apenas os arquivos',
       'Os recursos de hardware e software', 'Apenas os programas de texto', 'C'
FROM disciplinas d
WHERE d.nome = 'Sistemas Operacionais'
  AND NOT EXISTS (
      SELECT 1 FROM perguntas_quiz p
      WHERE p.id_disciplina = d.id_disciplina
        AND p.enunciado = 'O que o sistema operacional gerencia?'
  );

-- Os exemplos de materiais e trabalhos só são inseridos se já houver alunos.
-- Isso evita criar registros sem um estudante responsável.
INSERT INTO materiais (id_estudante, id_disciplina, titulo, descricao, tipo, caminho_arquivo)
SELECT e.id_estudante, d.id_disciplina,
       'Introdução aos Sistemas Operacionais',
       'Conceitos de sistema operacional, processos, memória, arquivos e dispositivos.',
       'resumo', 'resumo-sistema-operacionais.html'
FROM estudantes e
JOIN disciplinas d ON d.nome = 'Sistemas Operacionais'
WHERE NOT EXISTS (
    SELECT 1 FROM materiais m
    WHERE m.id_estudante = e.id_estudante
      AND m.titulo = 'Introdução aos Sistemas Operacionais'
);

INSERT INTO materiais (id_estudante, id_disciplina, titulo, descricao, tipo, caminho_arquivo)
SELECT e.id_estudante, d.id_disciplina,
       'Introdução à Modelagem de Dados',
       'Conceitos de entidade, atributo, relacionamento e modelo entidade-relacionamento.',
       'resumo', 'resumo-modelagem-dados.html'
FROM estudantes e
JOIN disciplinas d ON d.nome = 'Modelagem de Dados'
WHERE NOT EXISTS (
    SELECT 1 FROM materiais m
    WHERE m.id_estudante = e.id_estudante
      AND m.titulo = 'Introdução à Modelagem de Dados'
);

INSERT INTO trabalhos (id_estudante, id_disciplina, titulo, descricao, objetivo, caminho_arquivo)
SELECT e.id_estudante, d.id_disciplina,
       'Trabalho de Lógica e Matemática',
       'Material de referência sobre lógica, proposições e raciocínio matemático.',
       'Revisar os conceitos estudados na disciplina de Lógica e Matemática Computacional.',
       'trabalho-logica-matematica.html'
FROM estudantes e
JOIN disciplinas d ON d.nome = 'Lógica e Matemática Computacional'
WHERE NOT EXISTS (
    SELECT 1 FROM trabalhos t
    WHERE t.id_estudante = e.id_estudante
      AND t.titulo = 'Trabalho de Lógica e Matemática'
);

INSERT INTO trabalhos (id_estudante, id_disciplina, titulo, descricao, objetivo, caminho_arquivo)
SELECT e.id_estudante, d.id_disciplina,
       'Trabalho de Modelagem de Dados',
       'Material sobre organização, representação e estruturação de dados.',
       'Revisar os conceitos de modelagem de dados estudados durante o semestre.',
       'trabalho-modelagem-dados.html'
FROM estudantes e
JOIN disciplinas d ON d.nome = 'Modelagem de Dados'
WHERE NOT EXISTS (
    SELECT 1 FROM trabalhos t
    WHERE t.id_estudante = e.id_estudante
      AND t.titulo = 'Trabalho de Modelagem de Dados'
);

INSERT INTO trabalhos (id_estudante, id_disciplina, titulo, descricao, objetivo, caminho_arquivo)
SELECT e.id_estudante, d.id_disciplina,
       'Trabalho de Sistemas Operacionais',
       'Material compartilhado para consulta e estudo dos conceitos de sistemas operacionais.',
       'Revisar as funções e os recursos gerenciados pelo sistema operacional.',
       'trabalho-sistemas-operacionais.html'
FROM estudantes e
JOIN disciplinas d ON d.nome = 'Sistemas Operacionais'
WHERE NOT EXISTS (
    SELECT 1 FROM trabalhos t
    WHERE t.id_estudante = e.id_estudante
      AND t.titulo = 'Trabalho de Sistemas Operacionais'
);

-- Conferência: banco, tabelas e quantidades de registros.
SELECT DATABASE() AS banco_selecionado;
SHOW TABLES;
SELECT id_disciplina, nome FROM disciplinas ORDER BY nome;
SELECT 'estudantes' AS tabela, COUNT(*) AS registros FROM estudantes
UNION ALL SELECT 'disciplinas', COUNT(*) FROM disciplinas
UNION ALL SELECT 'materiais', COUNT(*) FROM materiais
UNION ALL SELECT 'perguntas_quiz', COUNT(*) FROM perguntas_quiz
UNION ALL SELECT 'tentativas_quiz', COUNT(*) FROM tentativas_quiz
UNION ALL SELECT 'respostas_quiz', COUNT(*) FROM respostas_quiz
UNION ALL SELECT 'perfis_academicos', COUNT(*) FROM perfis_academicos
UNION ALL SELECT 'trabalhos', COUNT(*) FROM trabalhos;
