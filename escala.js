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
  var LIMITE_SEMANA = 42 * 60;
  var LIMITE_DIA = 10 * 60;
  var DSR_EXIGIDOS = 2;
  var DOMINGO = 6;

  /** "8", "8,5", "8.5", "8:30", "8h30" -> minutos. Vazio -> null. Inválido -> NaN. */
  function lerHoras(txt) {
    var t = String(txt == null ? "" : txt).trim().toLowerCase().replace(/\s/g, "");
    if (!t) return null;
    var m = /^(\d{1,2})(?::|h)(\d{1,2})$/.exec(t);
    if (m) return +m[2] < 60 ? +m[1] * 60 + +m[2] : NaN;
    if (/^\d{1,2}h$/.test(t)) return parseInt(t, 10) * 60;
    if (!/^\d{1,2}([.,]\d{1,2})?$/.test(t)) return NaN;
    return Math.round(parseFloat(t.replace(",", ".")) * 60);
  }

  /** 2520 -> "42 h"; 2490 -> "41 h 30 min". */
  function formatar(min) {
    var h = Math.floor(min / 60);
    var r = min % 60;
    return h + " h" + (r ? " " + r + " min" : "");
  }

  /**
   * dias: 7 itens (segunda a domingo) { dsr: boolean, horas: texto digitado }
   * Devolve { erros:[{dia, msg}], totalMin, dsr, excedeMin, situacao }
   * situacao: "erro" (dados incompletos ou fora da regra), "excede" (passa de 42 h) ou "ok".
   */
  function avaliar(dias) {
    var erros = [];
    var total = 0;
    var dsr = dias.filter(function (d) { return d.dsr; }).length;

    dias.forEach(function (d, i) {
      if (d.dsr) return;
      var min = lerHoras(d.horas);
      if (min === null) erros.push({ dia: i, msg: NOMES[i] + ": informe as horas trabalhadas ou marque como DSR." });
      else if (isNaN(min)) erros.push({ dia: i, msg: NOMES[i] + ": horas inválidas. Use, por exemplo, 8 ou 8:30." });
      else if (min === 0) erros.push({ dia: i, msg: NOMES[i] + ": 0 hora é descanso. Marque como DSR ou informe as horas." });
      else if (min > LIMITE_DIA) erros.push({ dia: i, msg: NOMES[i] + ": " + formatar(min) + " passa do máximo de " + formatar(LIMITE_DIA) + " por dia." });
      else total += min;
    });

    if (dsr < DSR_EXIGIDOS) erros.push({ dia: null, msg: "Escolha 2 dias de DSR (descanso semanal remunerado). Você marcou " + dsr + "." });
    else if (dsr > DSR_EXIGIDOS) erros.push({ dia: null, msg: "São exigidos exatamente 2 dias de DSR. Você marcou " + dsr + "; deixe só 2." });

    var excede = Math.max(0, total - LIMITE_SEMANA);
    var situacao = erros.length ? "erro" : excede ? "excede" : "ok";
    return { erros: erros, totalMin: total, dsr: dsr, excedeMin: excede, situacao: situacao, domingoTrabalha: !dias[DOMINGO].dsr };
  }

  return { NOMES: NOMES, LIMITE_SEMANA: LIMITE_SEMANA, LIMITE_DIA: LIMITE_DIA, lerHoras: lerHoras, formatar: formatar, avaliar: avaliar };
});
