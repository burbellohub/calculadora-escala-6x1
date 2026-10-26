const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../calc.js");

const etapas = [
  { id: "e42", rotulo: "42h", meses: 2, horas: 42 },
  { id: "e40", rotulo: "40h", meses: 14, horas: 40 },
];
const perto = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} deveria estar perto de ${b}`);
const base = (extra = {}) => ({ funcionarios: 10, horasAtuais: 44, diasTrabalhoAtuais: 6, promulgacao: null, etapas, ...extra });

test("o cálculo não usa nem devolve valores em dinheiro", () => {
  const r = E.simularImpacto(base());
  const todas = JSON.stringify(r).toLowerCase();
  for (const proibida of ["valorhora", "folha", "custo", "salario", "brl"]) assert.ok(!todas.includes(proibida), proibida);
  assert.equal(typeof E.valorHora, "undefined");
});

test("impacto em horas: 10 pessoas, 44h -> 42h e 40h", () => {
  const r = E.simularImpacto(base());

  assert.equal(r.hoje.horas, 44);
  perto(r.hoje.horasPorDia, 7.3333, 0.001); // 44 h em 6 dias
  assert.equal(r.hoje.descansos, 1);
  assert.equal(r.hoje.horasEquipeSemana, 440);

  const [e42, e40] = r.etapas;
  assert.equal(e42.horas, 42);
  assert.equal(e42.descansos, 2);
  perto(e42.horasPorDia, 8.4, 0.001); // 42 h em 5 dias: acima de 8 h/dia
  assert.equal(e42.horasEquipeSemana, 420);
  assert.equal(e42.horasPerdidasSemana, 20);
  perto(e42.horasPerdidasPct, 4.545, 0.001);
  assert.equal(e42.pessoasParaRepor, 1); // 10 x (44/42 - 1) = 0,48 -> 1 pessoa
  assert.equal(e42.horaExtraSemanaPorPessoa, 2);
  perto(e42.horaExtraDiaPorPessoa, 0.4, 0.001);

  assert.equal(e40.horas, 40);
  perto(e40.horasPorDia, 8, 0.001);
  assert.equal(e40.horasPerdidasSemana, 40);
  perto(e40.horasPerdidasMes, 40 * (52 / 12), 0.001);
  perto(e40.horasMesPorPessoa, 40 * (52 / 12), 0.001);
  assert.equal(e40.pessoasParaRepor, 1); // 10 x 0,1 = 1,0 exato, sem arredondar para 2
  assert.equal(e40.horaExtraSemanaPorPessoa, 4);
  perto(e40.horaExtraDiaPorPessoa, 0.8, 0.001);
});

test("12 pessoas: repor 44 -> 40 h exige 2 pessoas (1,2 arredondado para cima)", () => {
  const r = E.simularImpacto(base({ funcionarios: 12 }));
  assert.equal(r.etapas[1].pessoasParaRepor, 2);
  assert.equal(r.etapas[1].horasPerdidasSemana, 48);
});

test("quem já trabalha 40 h não perde horas", () => {
  const r = E.simularImpacto(base({ funcionarios: 5, horasAtuais: 40 }));
  for (const e of r.etapas) {
    assert.equal(e.mudou, false);
    assert.equal(e.pessoasParaRepor, 0);
    assert.equal(e.horasPerdidasSemana, 0);
    assert.equal(e.horaExtraSemanaPorPessoa, 0);
    assert.equal(e.horas, 40);
  }
});

test("já em 5x2 com 44 h: hoje tem 5 dias de trabalho e 2 de descanso", () => {
  const r = E.simularImpacto(base({ diasTrabalhoAtuais: 5 }));
  assert.equal(r.hoje.diasTrabalho, 5);
  assert.equal(r.hoje.descansos, 2);
  perto(r.hoje.horasPorDia, 8.8, 0.001);
});

test("datas das etapas a partir da publicação", () => {
  const r = E.simularImpacto(base({ funcionarios: 1, promulgacao: "2026-12-15" }));
  assert.equal(r.etapas[0].data, "2027-02-15");
  assert.equal(r.etapas[1].data, "2028-02-15");
  assert.equal(E.simularImpacto(base()).etapas[0].data, null);
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
