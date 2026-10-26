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
    var total = 0;
    var porDia = [];
    var dsr = dias.filter(function (d) { return d.dsr; }).length;

    dias.forEach(function (d, i) {
      porDia.push(null);
      if (d.dsr) return;
      var b = (d.batidas || []).map(lerHora);
      while (b.length < 4) b.push(null);
      var nome = NOMES[i];
      var faltam = b.some(function (x) { return x === null; });
      if (b.some(function (x) { return x !== null && isNaN(x); })) {
        erros.push({ dia: i, msg: nome + ": horário inválido. Use o formato 08:00." });
      } else if (faltam) {
        erros.push({ dia: i, msg: nome + ": preencha as 4 batidas ou marque como DSR." });
      } else if (!(b[0] < b[1] && b[1] < b[2] && b[2] < b[3])) {
        erros.push({ dia: i, msg: nome + ": os horários precisam estar em ordem (1ª, 2ª, 3ª e 4ª batida, uma depois da outra)." });
      } else {
        var min = (b[1] - b[0]) + (b[3] - b[2]);
        porDia[i] = min;
        if (min > LIMITE_DIA) erros.push({ dia: i, msg: nome + ": " + formatar(min) + " passa do máximo de " + formatar(LIMITE_DIA) + " por dia." });
        else total += min;
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
    return { erros: erros, totalMin: total, porDia: porDia, dsr: dsr, excedeMin: excede, situacao: situacao, domingoTrabalha: !dias[DOMINGO].dsr };
  }

  return { NOMES: NOMES, BATIDAS: BATIDAS, LIMITE_SEMANA: LIMITE_SEMANA, LIMITE_DIA: LIMITE_DIA, DOMINGO_LIMITE: DOMINGO_LIMITE, lerHora: lerHora, formatar: formatar, avaliar: avaliar };
});
