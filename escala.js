/*
 * Regras da escala semanal (sem tela). Funciona no navegador (window.Escala) e no Node (testes).
 * Tudo em minutos; nenhum valor em dinheiro nem porcentagem.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.Escala = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var NOMES = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  var BATIDAS = ["1ª · Entrada", "2ª · Saída intervalo", "3ª · Volta intervalo", "4ª · Saída"];
  var LIMITE_SEMANA = 42 * 60;
  var LIMITE_DIA = 10 * 60;
  var DSR_EXIGIDOS = 2;
  var DOMINGO = 6;
  // Folga em domingo: mulheres, ao menos 1 a cada 15 dias (2 semanas); homens, ao menos 1 por mês (4 semanas).
  var DOMINGO_LIMITE = { m: 2, h: 4 };

  /** "08:00", "8:00", "8h30", "0800" -> minutos desde 00:00. Vazio -> null. Inválido -> NaN. */
  function lerHora(txt) {
    var t = String(txt == null ? "" : txt).trim().toLowerCase().replace(/\s/g, "");
    if (!t) return null;
    var m = /^(\d{1,2})(?::|h)(\d{2})$/.exec(t) || /^(\d{2})(\d{2})$/.exec(t);
    if (!m) return NaN;
    return +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : NaN;
  }

  var DIA_MIN = 24 * 60;
  // Nenhum trecho (jornada ou intervalo) passa de 12 h: acima disso quase sempre é erro de digitação.
  var TRECHO_MAX = 12 * 60;

  /**
   * Põe as 4 batidas em linha do tempo contínua, contadas desde 00:00 do dia em que o turno começa.
   * Batida menor que a anterior = já passou da meia-noite (soma 24 h): 21:00, 00:00, 01:00, 06:00 vira
   * 1260, 1440, 1500, 1800. Devolve null se algum trecho ficar parado ou longo demais ou se o turno
   * inteiro passar de 24 h, que é erro de digitação.
   */
  function linhaDoTempo(b) {
    var t = [b[0]];
    for (var k = 1; k < 4; k++) {
      var v = b[k];
      while (v <= t[k - 1]) v += DIA_MIN;
      if (v - t[k - 1] > TRECHO_MAX) return null;
      t.push(v);
    }
    return t[3] - t[0] < DIA_MIN ? t : null;
  }

  // Hora noturna: das 22h às 5h cada hora vale 52 min 30 s (CLT, art. 73, § 1º), ou seja, 8/7 do tempo de relógio; fora disso, 60 min.
  var JORNADAS = { d: "Diurna", m: "Mista", n: "Noturna" };
  // Janelas noturnas na linha do tempo do turno (minutos desde 00:00 do dia em que ele começa).
  var JANELAS_NOTURNAS = [[0, 5 * 60], [22 * 60, 29 * 60], [46 * 60, 53 * 60]];

  /** Minutos de trabalho de relógio (2 trechos: 1ª a 2ª e 3ª a 4ª batida) que caem entre 22h e 5h. */
  function minutosNoturnos(t) {
    var soma = 0;
    [[t[0], t[1]], [t[2], t[3]]].forEach(function (tr) {
      JANELAS_NOTURNAS.forEach(function (j) {
        soma += Math.max(0, Math.min(tr[1], j[1]) - Math.max(tr[0], j[0]));
      });
    });
    return soma;
  }

  /** Minutos noturnos de relógio -> minutos contados com a hora reduzida de 52 min 30 s (arredondado). */
  function comHoraReduzida(minNoturno) {
    return Math.round(minNoturno * 8 / 7);
  }

  /** 2520 -> "42 h"; 2490 -> "41 h 30 min". */
  function formatar(min) {
    var h = Math.floor(min / 60);
    var r = min % 60;
    return h + " h" + (r ? " " + r + " min" : "");
  }

  /**
   * dias: 7 itens (segunda a domingo) { dsr: boolean, batidas: [4 textos "HH:MM"] }
   * extra: { sexo: "m" (mulher) | "h" (homem), domingoACada: a cada quantas semanas folga num domingo
   *         (só vale se o domingo for dia de trabalho; 0 = nunca folga) }
   * Devolve { erros:[{dia, msg}], totalMin, porDia:[minutos|null], dsr, excedeMin, situacao, domingoTrabalha }
   * situacao: "erro" (dados incompletos ou fora da regra), "excede" (passa de 42 h) ou "ok".
   */
  function avaliar(dias, extra) {
    extra = extra || {};
    var erros = [];
    var total = 0; // minutos contados com a hora noturna reduzida: é o que vale para os limites de 10 h por dia e 42 h por semana
    var totalRelogio = 0;
    var totalNoturno = 0;
    var porDia = []; // minutos de relógio
    var porDiaNoturno = []; // minutos de relógio entre 22h e 5h
    var porDiaComputado = []; // minutos com a hora noturna reduzida
    var viraDia = []; // true quando o turno termina depois da meia-noite (dia seguinte)
    var dsr = dias.filter(function (d) { return d.dsr; }).length;
    var jornada = JORNADAS[extra.jornada] ? extra.jornada : "";
    if (!jornada) erros.push({ dia: null, campo: "jornada", msg: "Escolha o tipo de jornada: diurna, mista ou noturna." });

    dias.forEach(function (d, i) {
      porDia.push(null);
      porDiaNoturno.push(null);
      porDiaComputado.push(null);
      viraDia.push(false);
      if (d.dsr) return;
      var b = (d.batidas || []).map(lerHora);
      while (b.length < 4) b.push(null);
      var nome = NOMES[i];
      var faltam = b.some(function (x) { return x === null; });
      if (b.some(function (x) { return x !== null && isNaN(x); })) {
        erros.push({ dia: i, msg: nome + ": horário inválido. Use o formato 08:00." });
      } else if (faltam) {
        erros.push({ dia: i, msg: nome + ": preencha as 4 batidas ou marque como DSR." });
      } else if (!linhaDoTempo(b)) {
        erros.push({ dia: i, msg: nome + ": os horários não fecham. Confira a ordem das 4 batidas (1ª, 2ª, 3ª e 4ª, uma depois da outra; passar da meia-noite é aceito) e se nenhum trecho passa de 12 h." });
      } else {
        var t = linhaDoTempo(b);
        var min = (t[1] - t[0]) + (t[3] - t[2]);
        var noturno = minutosNoturnos(t);
        var computado = min - noturno + comHoraReduzida(noturno);
        porDia[i] = min;
        porDiaNoturno[i] = noturno;
        porDiaComputado[i] = computado;
        viraDia[i] = t[3] >= DIA_MIN;
        totalRelogio += min;
        totalNoturno += noturno;
        var tipoErro = jornada ? erroDaJornada(jornada, min, noturno) : null;
        if (tipoErro) erros.push({ dia: i, campo: "jornada", msg: nome + ": " + tipoErro });
        else if (computado > LIMITE_DIA) erros.push({ dia: i, msg: nome + ": " + formatar(computado) + (noturno ? " (com a hora noturna reduzida)" : "") + " passa do máximo de " + formatar(LIMITE_DIA) + " por dia." });
        else total += computado;
      }
    });

    if (dsr < DSR_EXIGIDOS) erros.push({ dia: null, msg: "Escolha 2 dias de DSR (descanso semanal remunerado). Você marcou " + dsr + "." });
    else if (dsr > DSR_EXIGIDOS) erros.push({ dia: null, msg: "São exigidos exatamente 2 dias de DSR. Você marcou " + dsr + "; deixe só 2." });

    // Regra do domingo, por sexo.
    var sexo = extra.sexo === "m" || extra.sexo === "h" ? extra.sexo : "";
    if (!sexo) erros.push({ dia: null, campo: "sexo", msg: "Informe se a escala é de mulher ou de homem (a regra de folga no domingo é diferente)." });
    if (!dias[DOMINGO].dsr) {
      var cada = extra.domingoACada === "" || extra.domingoACada == null ? null : Number(extra.domingoACada);
      if (cada === null || isNaN(cada)) erros.push({ dia: null, campo: "domingo", msg: "O domingo é dia de trabalho: informe de quantas em quantas semanas a pessoa folga num domingo." });
      else if (sexo && (cada === 0 || cada > DOMINGO_LIMITE[sexo])) {
        erros.push({ dia: null, campo: "domingo", msg: sexo === "m"
          ? "Mulheres precisam folgar 1 domingo sim e 1 não (uma semana sim, outra não, no mínimo 1 domingo a cada 15 dias). " + (cada === 0 ? "Você informou que não há folga alternada no domingo." : "Você informou folga a cada " + cada + " semanas.") + " Ajuste a escala."
          : "Homens precisam folgar pelo menos 1 domingo por mês (a cada 4 semanas). " + (cada === 0 ? "Você informou que nunca folga no domingo." : "Você informou a cada " + cada + " semanas.") + " Ajuste a escala." });
      }
    }

    var excede = Math.max(0, total - LIMITE_SEMANA);
    var situacao = erros.length ? "erro" : excede ? "excede" : "ok";
    return {
      erros: erros, situacao: situacao, dsr: dsr, excedeMin: excede, domingoTrabalha: !dias[DOMINGO].dsr, jornada: jornada,
      totalMin: totalRelogio, // total de relógio
      totalComputadoMin: total, // total com a hora noturna reduzida (vale para o limite)
      totalNoturnoMin: totalNoturno, // minutos de relógio entre 22h e 5h
      porDia: porDia, porDiaNoturno: porDiaNoturno, porDiaComputado: porDiaComputado, viraDia: viraDia,
    };
  }

  /**
   * Confere se o dia combina com o tipo de jornada escolhido. Diurna: nada entre 22h e 5h.
   * Mista: começa fora do período noturno e passa por ele (tem horas dentro e fora). Noturna: tudo entre 22h e 5h.
   */
  function erroDaJornada(jornada, minRelogio, noturno) {
    var peri = "22h às 5h";
    if (jornada === "d" && noturno > 0) return "tem " + formatar(noturno) + " no período noturno (" + peri + "), e a jornada diurna não tem horas nesse período. Escolha Mista ou Noturna.";
    if (jornada === "n" && noturno < minRelogio) return "tem " + formatar(minRelogio - noturno) + " fora do período noturno (" + peri + "). Na jornada noturna todas as horas ficam entre 22h e 5h; escolha Mista.";
    if (jornada === "m" && noturno === 0) return "não tem nenhuma hora entre " + peri + ", então a jornada é Diurna.";
    if (jornada === "m" && noturno === minRelogio) return "todas as horas ficam entre " + peri + ", então a jornada é Noturna.";
    return null;
  }

  return { NOMES: NOMES, BATIDAS: BATIDAS, JORNADAS: JORNADAS, LIMITE_SEMANA: LIMITE_SEMANA, LIMITE_DIA: LIMITE_DIA, DOMINGO_LIMITE: DOMINGO_LIMITE, lerHora: lerHora, formatar: formatar, avaliar: avaliar };
});
