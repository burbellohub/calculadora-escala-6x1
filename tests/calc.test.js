const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../calc.js");

const etapas = [
  { id: "e42", rotulo: "42h", meses: 2, horas: 42 },
  { id: "e40", rotulo: "40h", meses: 14, horas: 40 },
];
const perto = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} deveria estar perto de ${b}`);

test("valor da hora usa o divisor horas semanais x 5 (220 para 44 h)", () => {
  perto(E.valorHora(2200, 44), 10);
  perto(E.valorHora(2000, 40), 10);
  perto(E.valorHora(2100, 42), 10);
});

test("impacto: 10 pessoas, R$ 2.000, 44h -> 42h e 40h", () => {
  const r = E.simularImpacto({ funcionarios: 10, salario: 2000, encargosPct: 0, horasAtuais: 44, adicionalExtraPct: 50, etapas });
  perto(r.hoje.valorHora, 9.0909, 0.001);
  perto(r.hoje.folhaMensal, 20000);

  const [e42, e40] = r.etapas;
  perto(e42.valorHora, 9.5238, 0.001);
  perto(e42.variacaoValorHoraPct, 4.76, 0.01);
  assert.equal(e42.horasPerdidasSemana, 20);
  assert.equal(e42.pessoasParaRepor, 1); // 10 x (44/42 - 1) = 0,48 -> 1 pessoa

  perto(e40.valorHora, 10, 0.001);
  perto(e40.variacaoValorHoraPct, 10, 0.001);
  assert.equal(e40.horasPerdidasSemana, 40);
  assert.equal(e40.pessoasParaRepor, 1); // 10 x 0,1 = 1,0 exato, sem arredondar para 2
  perto(e40.custoReposicaoMes, 2000);
  // 40 h/semana x 4,333 sem x R$ 10 x 1,5 = R$ 2.600
  perto(e40.custoHoraExtraMes, 2600);
  perto(e40.folhaMensal, 20000, 0.001);
});

test("encargos aumentam o custo de reposição e de hora extra", () => {
  const r = E.simularImpacto({ funcionarios: 10, salario: 2000, encargosPct: 50, horasAtuais: 44, adicionalExtraPct: 50, etapas });
  perto(r.hoje.folhaMensal, 30000);
  perto(r.etapas[1].custoReposicaoMes, 3000);
  perto(r.etapas[1].custoHoraExtraMes, 3900);
});

test("quem já trabalha 40 h não tem impacto", () => {
  const r = E.simularImpacto({ funcionarios: 5, salario: 3000, encargosPct: 0, horasAtuais: 40, adicionalExtraPct: 50, etapas });
  for (const e of r.etapas) {
    assert.equal(e.mudou, false);
    assert.equal(e.pessoasParaRepor, 0);
    assert.equal(e.horasPerdidasSemana, 0);
    perto(e.variacaoValorHoraPct, 0, 0.0001);
    perto(e.custoHoraExtraMes, 0, 0.0001);
  }
});

test("datas das etapas a partir da promulgação", () => {
  const r = E.simularImpacto({ funcionarios: 1, salario: 1000, encargosPct: 0, horasAtuais: 44, adicionalExtraPct: 50, promulgacao: "2026-12-15", etapas });
  assert.equal(r.etapas[0].data, "2027-02-15");
  assert.equal(r.etapas[1].data, "2028-02-15");
  assert.equal(E.adicionarMeses("2026-12-31", 2), "2027-02-28"); // dia 31 não existe em fevereiro
  assert.equal(E.adicionarMeses("2028-01-31", 1), "2028-02-29"); // ano bissexto
  assert.equal(E.adicionarMeses("lixo", 2), null);
});

test("equipe necessária para manter a cobertura (6x1 versus 5x2)", () => {
  const seisDias = [1, 2, 3, 4, 5, 6];
  assert.equal(E.equipeNecessaria({ diasAbertos: seisDias, equipeMinima: 3, diasTrabalhoSemana: 6 }), 3);
  assert.equal(E.equipeNecessaria({ diasAbertos: seisDias, equipeMinima: 3, diasTrabalhoSemana: 5 }), 4); // 18 turnos / 5
  assert.equal(E.equipeNecessaria({ diasAbertos: [1, 2, 3, 4, 5], equipeMinima: 3, diasTrabalhoSemana: 5 }), 3);
});

test("escala 5x2: segunda a sábado, todos folgam no domingo e cada um mais um dia", () => {
  const esc = E.gerarEscala({ funcionarios: 4, diasAbertos: [1, 2, 3, 4, 5, 6], equipeMinima: 3, semanas: 4 });
  for (const semana of esc.semanas) {
    for (const pessoa of semana.funcionarios) {
      assert.equal(pessoa[0], "X"); // domingo fechado
      assert.equal(pessoa.filter((c) => c === "T").length, 5); // trabalha 5 dias
      assert.equal(pessoa.filter((c) => c === "F").length, 1); // 1 folga rotativa
    }
    for (let d = 1; d <= 6; d++) assert.ok(semana.presentes[d] >= 3);
  }
  assert.equal(esc.resumo.semFalta, true);
});

test("escala 5x2: com equipe curta o simulador aponta dia com falta", () => {
  const esc = E.gerarEscala({ funcionarios: 3, diasAbertos: [1, 2, 3, 4, 5, 6], equipeMinima: 3, semanas: 4 });
  assert.equal(esc.resumo.semFalta, false);
  assert.ok(esc.resumo.maiorFalta >= 1);
});

test("escala 5x2 abrindo todos os dias: domingo de folga em rodízio e ninguém fica sem", () => {
  const esc = E.gerarEscala({ funcionarios: 6, diasAbertos: [0, 1, 2, 3, 4, 5, 6], equipeMinima: 3, semanas: 4 });
  for (const semana of esc.semanas) {
    for (const pessoa of semana.funcionarios) {
      assert.equal(pessoa.filter((c) => c === "T").length, 5);
      assert.equal(pessoa.filter((c) => c === "F").length, 2);
    }
    assert.ok(semana.presentes[0] >= 3, "domingo com equipe mínima");
  }
  assert.ok(esc.resumo.domingosDeFolgaPorPessoa >= 1, "cada pessoa folga ao menos um domingo em 4 semanas");
});

test("menor equipe 5x2 fecha a cobertura", () => {
  const n = E.menorEquipe5x2({ diasAbertos: [1, 2, 3, 4, 5, 6], equipeMinima: 3 });
  assert.equal(n, 4);
  assert.equal(E.gerarEscala({ funcionarios: n, diasAbertos: [1, 2, 3, 4, 5, 6], equipeMinima: 3 }).resumo.semFalta, true);
  const sete = E.menorEquipe5x2({ diasAbertos: [0, 1, 2, 3, 4, 5, 6], equipeMinima: 2 });
  assert.equal(E.gerarEscala({ funcionarios: sete, diasAbertos: [0, 1, 2, 3, 4, 5, 6], equipeMinima: 2 }).resumo.semFalta, true);
});
