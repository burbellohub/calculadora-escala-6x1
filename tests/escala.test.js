const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../escala.js");

const dia = (horas) => ({ dsr: false, horas });
const folga = () => ({ dsr: true, horas: "" });
// segunda a domingo
const semana = (...d) => d;
const seis_por_um = () => semana(dia("8"), dia("8"), dia("8"), dia("8"), dia("8"), dia("4"), folga());

test("lerHoras aceita 8, 8,5, 8:30, 8h30 e rejeita lixo", () => {
  assert.equal(E.lerHoras("8"), 480);
  assert.equal(E.lerHoras("8,5"), 510);
  assert.equal(E.lerHoras("8.5"), 510);
  assert.equal(E.lerHoras("8:30"), 510);
  assert.equal(E.lerHoras("8h30"), 510);
  assert.equal(E.lerHoras("8h"), 480);
  assert.equal(E.lerHoras(""), null);
  assert.ok(Number.isNaN(E.lerHoras("abc")));
  assert.ok(Number.isNaN(E.lerHoras("8:75")));
  assert.ok(Number.isNaN(E.lerHoras("-2")));
});

test("formatar mostra horas e minutos", () => {
  assert.equal(E.formatar(2520), "42 h");
  assert.equal(E.formatar(2490), "41 h 30 min");
});

test("6x1 de 44 h com só 1 DSR: erro de DSR", () => {
  const r = E.avaliar(seis_por_um().map((d, i) => (i === 6 ? folga() : d)));
  assert.equal(r.dsr, 1);
  assert.equal(r.situacao, "erro");
  assert.match(r.erros[0].msg, /2 dias de DSR/);
});

test("dia de 12 h é erro mesmo com 2 DSR", () => {
  const r = E.avaliar(semana(dia("8"), dia("8"), dia("8"), dia("8"), dia("8"), dia("4"), folga()).map((d, i) => (i === 0 ? { dsr: true, horas: "" } : i === 5 ? dia("12") : d)));
  assert.equal(r.situacao, "erro"); // 12 h num dia: acima de 10 h
});

test("passa de 42 h: situação excede e diz quanto", () => {
  const r = E.avaliar(semana(dia("9"), dia("9"), dia("9"), dia("9"), dia("9"), folga(), folga()));
  assert.equal(r.totalMin, 45 * 60);
  assert.equal(r.situacao, "excede");
  assert.equal(r.excedeMin, 3 * 60);
});

test("exatamente 42 h com 2 DSR está ok", () => {
  const r = E.avaliar(semana(dia("8:24"), dia("8:24"), dia("8:24"), dia("8:24"), dia("8:24"), folga(), folga()));
  assert.equal(r.totalMin, 2520);
  assert.equal(r.situacao, "ok");
  assert.equal(r.domingoTrabalha, false);
});

test("menos de 42 h com 2 DSR está ok", () => {
  const r = E.avaliar(semana(dia("8"), dia("8"), dia("8"), dia("8"), dia("8"), folga(), folga()));
  assert.equal(r.situacao, "ok");
  assert.equal(r.totalMin, 2400);
});

test("mais de 2 DSR é erro; 0 DSR é erro", () => {
  assert.equal(E.avaliar(semana(dia("8"), dia("8"), dia("8"), folga(), folga(), folga(), folga())).situacao, "erro");
  assert.equal(E.avaliar(semana(dia("6"), dia("6"), dia("6"), dia("6"), dia("6"), dia("6"), dia("6"))).situacao, "erro");
});

test("dia sem horas, com 0 ou acima de 10 h é erro e aponta o dia", () => {
  const base = () => semana(dia("8"), dia("8"), dia("8"), dia("8"), dia("8"), folga(), folga());
  for (const [txt, i] of [["", 0], ["0", 1], ["11", 2], ["abc", 3]]) {
    const s = base();
    s[i] = dia(txt);
    const r = E.avaliar(s);
    assert.equal(r.situacao, "erro", txt);
    assert.equal(r.erros[0].dia, i, txt);
  }
});

test("domingo trabalhado é sinalizado (DSR preferencialmente no domingo)", () => {
  const r = E.avaliar(semana(folga(), dia("8"), dia("8"), dia("8"), dia("8"), folga(), dia("8")));
  assert.equal(r.domingoTrabalha, true);
  assert.equal(r.situacao, "ok");
});

test("sem valores em dinheiro nem porcentagem no resultado", () => {
  const txt = JSON.stringify(E.avaliar(seis_por_um()));
  assert.ok(!/salario|custo|brl|pct|percent/i.test(txt));
});
