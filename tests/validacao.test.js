const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../validacao.js");

const LIM = { funcionariosMax: 5000, jornadaDiariaPadrao: 8, jornadaDiariaMaxima: 10, aprovacaoISO: "2026-10-14" };
const HOJE = "2026-10-26";
const base = () => ({ funcionarios: "12", horas: 44, escalaAtual: 6, dias: [1, 2, 3, 4, 5, 6], equipeMinima: "3", promulgacao: "" });
const rodar = (mudancas) => V.validar({ ...base(), ...mudancas }, LIM, HOJE);
const campos = (r) => r.erros.map((e) => e.campo).sort();
const ids = (r) => r.avisos.map((a) => a.id).sort();

test("lerNumero aceita formatos brasileiros e rejeita lixo", () => {
  assert.equal(V.lerNumero("2.500,50"), 2500.5);
  assert.equal(V.lerNumero("2500,5"), 2500.5);
  assert.equal(V.lerNumero("2500.5"), 2500.5);
  assert.equal(V.lerNumero("2.500"), 2500);
  assert.equal(V.lerNumero(""), null);
  assert.ok(Number.isNaN(V.lerNumero("abc")));
});

test("não existe validação nem dado de salário, encargos ou adicional", () => {
  const r = rodar({ salario: "abc", encargos: "-5", adicional: "10" }); // campos que não existem mais são ignorados
  assert.deepEqual(r.erros, []);
  assert.deepEqual(Object.keys(r.dados).sort(), ["diasAbertos", "diasTrabalhoAtuais", "equipeMinima", "funcionarios", "horasAtuais", "promulgacao"]);
});

test("dados corretos passam sem erro nem aviso e voltam convertidos", () => {
  const r = rodar({});
  assert.deepEqual(r.erros, []);
  assert.deepEqual(r.avisos, []);
  assert.equal(r.dados.funcionarios, 12);
  assert.equal(r.dados.equipeMinima, 3);
  assert.deepEqual(r.dados.diasAbertos, [1, 2, 3, 4, 5, 6]);
});

test("campos obrigatórios vazios geram erro e nenhum dado", () => {
  const r = rodar({ funcionarios: "", equipeMinima: "" });
  assert.deepEqual(campos(r), ["equipeMinima", "funcionarios"]);
  assert.equal(r.dados, null);
});

test("funcionários: inteiro de 1 a 5000", () => {
  for (const ruim of ["0", "-3", "2,5", "5001", "abc"]) assert.deepEqual(campos(rodar({ funcionarios: ruim })), ["funcionarios"], ruim);
  assert.deepEqual(campos(rodar({ funcionarios: "5000", equipeMinima: "3" })), []);
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
  assert.deepEqual(ids(rodar({ funcionarios: "3", equipeMinima: "3" })), []); // 3 fecha exatamente em 6x1
  assert.deepEqual(ids(rodar({ funcionarios: "5", equipeMinima: "5", dias: [0, 1, 2, 3, 4, 5, 6] })), ["equipe-curta-hoje"]); // precisa de ceil(35/6)=6
});

test("jornada diária: 5x2 com 44 h é aviso (8,8 h/dia); acima de 10 h/dia é erro", () => {
  assert.deepEqual(ids(rodar({ escalaAtual: 5, horas: 44, dias: [1, 2, 3, 4, 5] })), ["jornada-diaria"]);
  assert.deepEqual(ids(rodar({ escalaAtual: 5, horas: 40, dias: [1, 2, 3, 4, 5] })), []);
  assert.deepEqual(ids(rodar({ escalaAtual: 6, horas: 44 })), []); // 7,33 h/dia
  assert.deepEqual(campos(rodar({ horas: 70, escalaAtual: 6 })), ["horas"]);
});

test("data de publicação: inválida e anterior à aprovação são erros; muito distante é aviso", () => {
  assert.deepEqual(campos(rodar({ promulgacao: "2026-02-30" })), ["promulgacao"]);
  assert.deepEqual(campos(rodar({ promulgacao: "2026-10-13" })), ["promulgacao"]);
  assert.deepEqual(campos(rodar({ promulgacao: "2026-10-14" })), []);
  assert.deepEqual(ids(rodar({ promulgacao: "2028-03-01" })), ["promulgacao-longe"]);
  assert.deepEqual(ids(rodar({ promulgacao: "2026-12-15" })), []);
});
