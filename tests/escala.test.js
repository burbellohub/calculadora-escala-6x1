const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../escala.js");

const dia = (...b) => ({ dsr: false, batidas: b });
const oito = () => dia("08:00", "12:00", "13:00", "17:00"); // 8 h
const folga = () => ({ dsr: true, batidas: [] });
const sabado4 = () => dia("08:00", "10:00", "10:15", "12:15"); // 4 h
const semana = (...d) => d;

test("lerHora aceita 08:00, 8:00, 8h30, 0800 e rejeita lixo", () => {
  assert.equal(E.lerHora("08:00"), 480);
  assert.equal(E.lerHora("8:30"), 510);
  assert.equal(E.lerHora("8h30"), 510);
  assert.equal(E.lerHora("0800"), 480);
  assert.equal(E.lerHora(""), null);
  assert.ok(Number.isNaN(E.lerHora("24:00")));
  assert.ok(Number.isNaN(E.lerHora("08:75")));
  assert.ok(Number.isNaN(E.lerHora("abc")));
});

test("formatar mostra horas e minutos", () => {
  assert.equal(E.formatar(2520), "42 h");
  assert.equal(E.formatar(2490), "41 h 30 min");
});

test("horas do dia = (2ª - 1ª) + (4ª - 3ª)", () => {
  const r = E.avaliar(semana(oito(), oito(), oito(), oito(), oito(), folga(), folga()));
  assert.equal(r.porDia[0], 480);
  assert.equal(r.totalMin, 2400);
  assert.equal(r.situacao, "ok");
});

test("6x1 de 44 h com só 1 DSR: erro de DSR", () => {
  const r = E.avaliar(semana(oito(), oito(), oito(), oito(), oito(), sabado4(), folga()));
  assert.equal(r.dsr, 1);
  assert.equal(r.totalMin, 44 * 60);
  assert.equal(r.situacao, "erro");
  assert.match(r.erros[0].msg, /2 dias de DSR/);
});

test("passa de 42 h com 2 DSR: situação excede e diz quanto", () => {
  const nove = () => dia("08:00", "12:00", "13:00", "18:00"); // 9 h
  const r = E.avaliar(semana(nove(), nove(), nove(), nove(), nove(), folga(), folga()));
  assert.equal(r.totalMin, 45 * 60);
  assert.equal(r.situacao, "excede");
  assert.equal(r.excedeMin, 180);
});

test("exatamente 42 h está ok", () => {
  const d = () => dia("08:00", "12:00", "13:00", "17:24"); // 8 h 24
  const r = E.avaliar(semana(d(), d(), d(), d(), d(), folga(), folga()));
  assert.equal(r.totalMin, 2520);
  assert.equal(r.situacao, "ok");
});

test("DSR a mais ou a menos é erro", () => {
  assert.equal(E.avaliar(semana(oito(), oito(), oito(), folga(), folga(), folga(), folga())).situacao, "erro");
  assert.equal(E.avaliar(semana(oito(), oito(), oito(), oito(), oito(), oito(), oito())).situacao, "erro");
});

test("batida faltando, fora de ordem, inválida ou mais de 10 h: erro apontando o dia", () => {
  const casos = [
    dia("08:00", "12:00", "13:00", ""),
    dia("08:00", "12:00", "11:00", "17:00"),
    dia("08:00", "12:00", "13:00", "99:00"),
    dia("06:00", "12:00", "13:00", "20:00"), // 11 h
  ];
  casos.forEach((c, k) => {
    const s = semana(oito(), oito(), oito(), oito(), oito(), folga(), folga());
    s[k] = c;
    const r = E.avaliar(s);
    assert.equal(r.situacao, "erro", String(k));
    assert.equal(r.erros[0].dia, k, String(k));
  });
});

test("domingo trabalhado é sinalizado", () => {
  const r = E.avaliar(semana(folga(), oito(), oito(), oito(), oito(), folga(), oito()));
  assert.equal(r.domingoTrabalha, true);
  assert.equal(r.situacao, "ok");
});

test("sem valores em dinheiro nem porcentagem no resultado", () => {
  assert.ok(!/salario|custo|brl|pct|percent/i.test(JSON.stringify(E.avaliar(semana(oito(), oito(), oito(), oito(), oito(), folga(), folga())))));
});
