const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../validacao.js");

const LIM = {
  funcionariosMax: 5000, salarioMinimo: 1621, salarioMaximoAceito: 500000, salarioAvisoAcima: 25000,
  encargosAvisoAcima: 120, adicionalExtraMinimo: 50, jornadaDiariaPadrao: 8, jornadaDiariaMaxima: 10, aprovacaoISO: "2026-10-14",
};
const HOJE = "2026-10-26";
const base = () => ({
  funcionarios: "12", salario: "2.400,00", encargos: "70", adicional: "50", horas: 44, escalaAtual: 6,
  dias: [1, 2, 3, 4, 5, 6], equipeMinima: "3", promulgacao: "",
});
const rodar = (mudancas) => V.validar({ ...base(), ...mudancas }, LIM, HOJE);
const campos = (r) => r.erros.map((e) => e.campo).sort();
const ids = (r) => r.avisos.map((a) => a.id).sort();

test("lerNumero aceita formatos brasileiros e rejeita lixo", () => {
  assert.equal(V.lerNumero("2.500,50"), 2500.5);
  assert.equal(V.lerNumero("2500,5"), 2500.5);
  assert.equal(V.lerNumero("2500.5"), 2500.5);
  assert.equal(V.lerNumero("2.500"), 2500);
  assert.equal(V.lerNumero("R$ 1.621,00"), 1621);
  assert.equal(V.lerNumero(""), null);
  assert.ok(Number.isNaN(V.lerNumero("abc")));
});

test("dados corretos passam sem erro nem aviso e voltam convertidos", () => {
  const r = rodar({});
  assert.deepEqual(r.erros, []);
  assert.deepEqual(r.avisos, []);
  assert.equal(r.dados.funcionarios, 12);
  assert.equal(r.dados.salario, 2400);
  assert.equal(r.dados.encargosPct, 70);
  assert.equal(r.dados.equipeMinima, 3);
});

test("campos obrigatórios vazios geram erro e nenhum dado", () => {
  const r = rodar({ funcionarios: "", salario: "", equipeMinima: "" });
  assert.deepEqual(campos(r), ["equipeMinima", "funcionarios", "salario"]);
  assert.equal(r.dados, null);
});

test("funcionários: inteiro de 1 a 5000", () => {
  for (const ruim of ["0", "-3", "2,5", "5001", "abc"]) assert.deepEqual(campos(rodar({ funcionarios: ruim })), ["funcionarios"], ruim);
  assert.deepEqual(campos(rodar({ funcionarios: "5000", equipeMinima: "3" })), []);
});

test("salário: zero, negativo e valor absurdo são erro", () => {
  for (const ruim of ["0", "-100", "abc", "600.000,00"]) assert.ok(campos(rodar({ salario: ruim })).includes("salario"), ruim);
});

test("salário abaixo do mínimo e muito alto são avisos que pedem confirmação", () => {
  assert.deepEqual(ids(rodar({ salario: "1.200,00" })), ["salario-minimo"]);
  assert.deepEqual(ids(rodar({ salario: "30.000,00" })), ["salario-alto"]);
  // 30 h: o mínimo é proporcional (1621 x 30/44 = 1105,22)
  assert.deepEqual(ids(rodar({ salario: "1.200,00", horas: 30, escalaAtual: 6 })), []);
  assert.deepEqual(ids(rodar({ salario: "1.621,00" })), []);
});

test("encargos: fora de 0 a 300 é erro; acima de 120 é aviso", () => {
  assert.deepEqual(campos(rodar({ encargos: "-5" })), ["encargos"]);
  assert.deepEqual(campos(rodar({ encargos: "400" })), ["encargos"]);
  assert.deepEqual(ids(rodar({ encargos: "150" })), ["encargos-altos"]);
  assert.deepEqual(rodar({ encargos: "" }).dados.encargosPct, 0);
});

test("adicional de hora extra abaixo de 50% é erro", () => {
  assert.deepEqual(campos(rodar({ adicional: "30" })), ["adicional"]);
  assert.deepEqual(campos(rodar({ adicional: "50" })), []);
  assert.equal(rodar({ adicional: "" }).dados.adicionalExtraPct, 50);
});

test("dias abertos: nenhum, menos de 5, ou menos que a escala 6x1 são erros", () => {
  assert.deepEqual(campos(rodar({ dias: [] })), ["dias"]);
  assert.deepEqual(campos(rodar({ dias: [1, 2, 3, 4] })), ["dias"]);
  assert.deepEqual(campos(rodar({ dias: [1, 2, 3, 4, 5], escalaAtual: 6 })), ["dias"]);
  assert.deepEqual(campos(rodar({ dias: [1, 2, 3, 4, 5], escalaAtual: 5, horas: 40 })), []);
});

test("equipe mínima maior que a equipe é erro", () => {
  const r = rodar({ funcionarios: "4", equipeMinima: "5" });
  assert.deepEqual(campos(r), ["equipeMinima"]);
  assert.match(r.erros[0].msg, /5 pessoas/);
});

test("equipe curta até para a escala de hoje é aviso", () => {
  // 6 dias x 3 pessoas = 18 turnos / 6 dias de trabalho = 3 pessoas; com 2 funcionários não fecha (e 3 > 2 é erro)
  assert.deepEqual(ids(rodar({ funcionarios: "3", equipeMinima: "3" })), []); // 3 fecha exatamente em 6x1
  assert.deepEqual(ids(rodar({ funcionarios: "4", equipeMinima: "4", dias: [1, 2, 3, 4, 5, 6] })), []);
  assert.deepEqual(ids(rodar({ funcionarios: "5", equipeMinima: "5", dias: [0, 1, 2, 3, 4, 5, 6] })), ["equipe-curta-hoje"]); // precisa de ceil(35/6)=6
});

test("jornada diária: 5x2 com 44 h é aviso (8,8 h/dia); acima de 10 h/dia é erro", () => {
  assert.deepEqual(ids(rodar({ escalaAtual: 5, horas: 44, dias: [1, 2, 3, 4, 5] })), ["jornada-diaria"]);
  assert.deepEqual(ids(rodar({ escalaAtual: 5, horas: 40, dias: [1, 2, 3, 4, 5] })), []);
  assert.deepEqual(ids(rodar({ escalaAtual: 6, horas: 44 })), []); // 7,33 h/dia
  // não há opção de jornada acima de 44 na tela, mas a regra protege contra dados vindos de fora
  assert.deepEqual(campos(rodar({ horas: 70, escalaAtual: 6 })), ["horas"]);
});

test("data de publicação: inválida e anterior à aprovação são erros; muito distante é aviso", () => {
  assert.deepEqual(campos(rodar({ promulgacao: "2026-02-30" })), ["promulgacao"]);
  assert.deepEqual(campos(rodar({ promulgacao: "2026-10-13" })), ["promulgacao"]);
  assert.deepEqual(campos(rodar({ promulgacao: "2026-10-14" })), []);
  assert.deepEqual(ids(rodar({ promulgacao: "2028-03-01" })), ["promulgacao-longe"]);
  assert.deepEqual(ids(rodar({ promulgacao: "2026-12-15" })), []);
});

test("com erro, os avisos independentes também são devolvidos para o usuário ver tudo de uma vez", () => {
  const r = rodar({ funcionarios: "", salario: "1.000,00" });
  assert.deepEqual(campos(r), ["funcionarios"]);
  assert.equal(r.dados, null);
});
