function fazerLogin() {
    const raDigitado = document.querySelector("#ra").value;
    const senhaDigitada = document.querySelector("#senha").value;
    const alunoSalvo = JSON.parse(localStorage.getItem("aluno"));
    if (!alunoSalvo) {
        alert("Nenhum aluno cadastrado!");
        return;
    }
    if (
        raDigitado === alunoSalvo.ra &&
        senhaDigitada === alunoSalvo.senha
    ) {
        alert("Login realizado com sucesso!");
        window.location.href = "index.html";
    } else {
        alert("RA ou senha incorretos!");
    }
}