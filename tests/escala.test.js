const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../escala.js");

const dia = (...b) => ({ dsr: false, batidas: b });
const oito = () => dia("08:00", "12:00", "13:00", "17:00"); // 8 h
const folga = () => ({ dsr: true, batidas: [] });
const sabado4 = () => dia("08:00", "10:00", "10:15", "12:15"); // 4 h
const semana = (...d) => d;
const av = (s, extra = { sexo: "h", domingoACada: 4 }) => E.avaliar(s, extra);

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
  const r = av(semana(oito(), oito(), oito(), oito(), oito(), folga(), folga()));
  assert.equal(r.porDia[0], 480);
  assert.equal(r.totalMin, 2400);
  assert.equal(r.situacao, "ok");
});

test("turno noturno 21:00, 00:00, 01:00, 06:00 passa da meia-noite e dá 8 h (não zera)", () => {
  const n = () => dia("21:00", "00:00", "01:00", "06:00");
  const r = av(semana(n(), n(), n(), n(), n(), folga(), folga()));
  assert.equal(r.porDia[0], 480);
  assert.equal(r.viraDia[0], true);
  assert.equal(r.totalMin, 40 * 60);
  assert.equal(r.situacao, "ok");
});

test("outros turnos que viram a meia-noite: virada na 2ª, na 3ª ou na 4ª batida", () => {
  const cenarios = [
    [dia("22:00", "02:00", "03:00", "07:00"), 480], // vira entre a 1ª e a 2ª
    [dia("18:00", "23:00", "00:00", "03:00"), 480], // vira entre a 2ª e a 3ª (intervalo na meia-noite)
    [dia("20:00", "23:30", "00:30", "04:30"), 450], // 3 h 30 + 4 h = 7 h 30
    [dia("14:00", "18:00", "19:00", "23:00"), 480], // não vira
  ];
  cenarios.forEach(([d, esperado], k) => {
    const r = av(semana(d, folga(), folga(), folga(), folga(), folga(), folga()));
    assert.equal(r.porDia[0], esperado, String(k));
  });
  assert.equal(av(semana(dia("22:00", "02:00", "03:00", "07:00"), folga(), folga(), folga(), folga(), folga(), folga())).viraDia[0], true);
  assert.equal(av(semana(dia("14:00", "18:00", "19:00", "23:00"), folga(), folga(), folga(), folga(), folga(), folga())).viraDia[0], false);
});

test("virar a meia-noite não esconde erro: batida repetida, trecho de mais de 12 h ou turno de mais de 24 h", () => {
  const casos = [
    dia("08:00", "08:00", "13:00", "17:00"), // batida repetida
    dia("08:00", "12:00", "11:00", "17:00"), // 3ª antes da 2ª (viraria 23 h de intervalo)
    dia("08:00", "12:00", "13:00", "07:00"), // 4ª "no dia seguinte" daria 18 h de trabalho
  ];
  casos.forEach((c, k) => {
    const r = av(semana(c, oito(), oito(), oito(), oito(), folga(), folga()));
    assert.equal(r.situacao, "erro", String(k));
    assert.equal(r.erros[0].dia, 0, String(k));
  });
});

test("6x1 de 44 h com só 1 DSR: erro de DSR", () => {
  const r = av(semana(oito(), oito(), oito(), oito(), oito(), sabado4(), folga()));
  assert.equal(r.dsr, 1);
  assert.equal(r.totalMin, 44 * 60);
  assert.equal(r.situacao, "erro");
  assert.match(r.erros[0].msg, /2 dias de DSR/);
});

test("passa de 42 h com 2 DSR: situação excede e diz quanto", () => {
  const nove = () => dia("08:00", "12:00", "13:00", "18:00"); // 9 h
  const r = av(semana(nove(), nove(), nove(), nove(), nove(), folga(), folga()));
  assert.equal(r.totalMin, 45 * 60);
  assert.equal(r.situacao, "excede");
  assert.equal(r.excedeMin, 180);
});

test("exatamente 42 h está ok", () => {
  const d = () => dia("08:00", "12:00", "13:00", "17:24"); // 8 h 24
  const r = av(semana(d(), d(), d(), d(), d(), folga(), folga()));
  assert.equal(r.totalMin, 2520);
  assert.equal(r.situacao, "ok");
});

test("DSR a mais ou a menos é erro", () => {
  assert.equal(av(semana(oito(), oito(), oito(), folga(), folga(), folga(), folga())).situacao, "erro");
  assert.equal(av(semana(oito(), oito(), oito(), oito(), oito(), oito(), oito())).situacao, "erro");
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
    const r = av(s);
    assert.equal(r.situacao, "erro", String(k));
    assert.equal(r.erros[0].dia, k, String(k));
  });
});

test("domingo trabalhado é sinalizado", () => {
  const r = av(semana(folga(), oito(), oito(), oito(), oito(), folga(), oito()), { sexo: "h", domingoACada: 4 });
  assert.equal(r.domingoTrabalha, true);
  assert.equal(r.situacao, "ok");
});

test("sem valores em dinheiro nem porcentagem no resultado", () => {
  assert.ok(!/salario|custo|brl|pct|percent/i.test(JSON.stringify(av(semana(oito(), oito(), oito(), oito(), oito(), folga(), folga())))));
});

const comDomingo = () => semana(folga(), oito(), oito(), oito(), oito(), folga(), oito()); // domingo é dia de trabalho

test("sem informar mulher ou homem é erro", () => {
  const r = av(semana(oito(), oito(), oito(), oito(), oito(), folga(), folga()), {});
  assert.equal(r.situacao, "erro");
  assert.equal(r.erros[0].campo, "sexo");
});

test("DSR no domingo cumpre a regra para mulher e para homem, sem perguntar a frequência", () => {
  for (const sexo of ["m", "h"]) {
    const r = av(semana(oito(), oito(), oito(), oito(), oito(), folga(), folga()), { sexo });
    assert.equal(r.situacao, "ok", sexo);
  }
});

test("mulher trabalhando no domingo: precisa folgar 1 domingo a cada 15 dias (até 2 semanas)", () => {
  assert.equal(av(comDomingo(), { sexo: "m", domingoACada: 2 }).situacao, "ok");
  const tres = av(comDomingo(), { sexo: "m", domingoACada: 3 });
  assert.equal(tres.situacao, "erro");
  assert.equal(tres.erros[0].campo, "domingo");
  assert.match(tres.erros[0].msg, /15 dias/);
  assert.equal(av(comDomingo(), { sexo: "m", domingoACada: 0 }).situacao, "erro");
});

test("homem trabalhando no domingo: precisa folgar pelo menos 1 domingo por mês (até 4 semanas)", () => {
  assert.equal(av(comDomingo(), { sexo: "h", domingoACada: 3 }).situacao, "ok");
  assert.equal(av(comDomingo(), { sexo: "h", domingoACada: 4 }).situacao, "ok");
  const cinco = av(comDomingo(), { sexo: "h", domingoACada: 5 });
  assert.equal(cinco.situacao, "erro");
  assert.match(cinco.erros[0].msg, /por mês/);
});

test("domingo trabalhado sem informar a frequência é erro", () => {
  const r = av(comDomingo(), { sexo: "h", domingoACada: "" });
  assert.equal(r.situacao, "erro");
  assert.equal(r.erros[0].campo, "domingo");
});
