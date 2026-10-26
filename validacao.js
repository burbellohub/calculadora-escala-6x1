/*
 * Validação dos dados do simulador (sem tela). Duas classes de problema:
 *  - ERRO: dado impossível, inválido ou que contradiz a escala. Bloqueia; precisa corrigir.
 *  - AVISO: dado fora do padrão, mas possível. Bloqueia até o usuário confirmar que está certo.
 * Funciona no navegador (window.Validacao) e no Node (testes).
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.Validacao = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var brl = function (v) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v); };
  var dec = function (v) { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v); };
  var NOMES_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  /** Aceita "2.500,50", "2500,5", "2500.5" e "2.500". Devolve null (vazio), NaN (inválido) ou o número. */
  function lerNumero(txt) {
    var t = String(txt == null ? "" : txt).trim().replace(/\s/g, "").replace(/^R\$/i, "");
    if (!t) return null;
    if (t.indexOf(",") >= 0) t = t.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
    var n = Number(t);
    return isFinite(n) ? n : NaN;
  }

  /** Data "AAAA-MM-DD" que realmente existe? */
  function dataValida(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }

  function maisMeses(iso, meses) {
    var p = iso.split("-").map(Number);
    var total = p[0] * 12 + (p[1] - 1) + meses;
    var ano = Math.floor(total / 12);
    var mes = total % 12;
    var dia = Math.min(p[2], new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate());
    return ano + "-" + String(mes + 1).padStart(2, "0") + "-" + String(dia).padStart(2, "0");
  }

  var dataBr = function (iso) { return iso.split("-").reverse().join("/"); };

  /**
   * e: { funcionarios, salario, encargos, adicional, horas, escalaAtual, dias:[0..6], equipeMinima, promulgacao }
   *    (campos de texto como o usuário digitou; horas/escalaAtual/dias já numéricos)
   * cfg: CONFIG.limites; hojeISO: "AAAA-MM-DD"
   */
  function validar(e, cfg, hojeISO) {
    var erros = [];
    var avisos = [];
    var erro = function (campo, msg) { erros.push({ campo: campo, msg: msg }); };
    var aviso = function (id, campo, msg) { avisos.push({ id: id, campo: campo, msg: msg }); };

    /* ---- Equipe ---- */
    var n = lerNumero(e.funcionarios);
    var nOk = false;
    if (n === null) erro("funcionarios", "Informe quantos funcionários trabalham nesta escala.");
    else if (isNaN(n) || Math.floor(n) !== n || n < 1 || n > cfg.funcionariosMax) erro("funcionarios", "Use um número inteiro de 1 a " + cfg.funcionariosMax + ".");
    else nOk = true;

    var salario = lerNumero(e.salario);
    var salOk = false;
    if (salario === null) erro("salario", "Informe o salário médio mensal, por exemplo 2.400,00.");
    else if (isNaN(salario) || salario <= 0) erro("salario", "Informe um valor maior que zero, por exemplo 2.400,00.");
    else if (salario > cfg.salarioMaximoAceito) erro("salario", "Esse valor é improvável para um salário médio individual. Confira se não digitou a folha total.");
    else salOk = true;

    var encargos = lerNumero(e.encargos);
    if (encargos === null) encargos = 0;
    if (isNaN(encargos) || encargos < 0 || encargos > 300) erro("encargos", "Use um valor entre 0 e 300 (em %).");
    else if (encargos > cfg.encargosAvisoAcima) aviso("encargos-altos", "encargos", "Encargos de " + dec(encargos) + "% estão bem acima do usual. Confirme que não digitou o valor em reais ou o fator em vez do percentual.");

    var adicional = lerNumero(e.adicional);
    if (adicional === null) adicional = cfg.adicionalExtraMinimo;
    if (isNaN(adicional) || adicional > 300) erro("adicional", "Use um valor entre " + cfg.adicionalExtraMinimo + " e 300 (em %).");
    else if (adicional < cfg.adicionalExtraMinimo) erro("adicional", "O adicional mínimo de hora extra é de " + cfg.adicionalExtraMinimo + "% (Constituição, art. 7º, XVI).");

    if (nOk && salOk) {
      var piso = cfg.salarioMinimo * Math.min(1, e.horas / 44);
      if (salario < piso - 0.005) {
        aviso("salario-minimo", "salario", "O salário médio de " + brl(salario) + " está abaixo do salário mínimo nacional" + (e.horas < 44 ? " proporcional à jornada de " + e.horas + " h" : "") + " (" + brl(piso) + "). Confirme se o valor está correto.");
      } else if (salario > cfg.salarioAvisoAcima) {
        aviso("salario-alto", "salario", "O salário médio de " + brl(salario) + " é muito acima do usual. Confirme que é o salário médio de UMA pessoa, e não a folha total.");
      }
    }

    /* ---- Funcionamento ---- */
    var abertos = (e.dias || []).filter(function (d, i, a) { return a.indexOf(d) === i; });
    var abertosOk = false;
    if (!abertos.length) erro("dias", "Marque ao menos um dia em que a empresa abre.");
    else if (abertos.length < 5) erro("dias", "A escala 5x2 exige que a empresa abra pelo menos 5 dias por semana, porque cada pessoa trabalha 5. Com " + abertos.length + " dia(s) aberto(s) a jornada não fecha. Marque mais dias.");
    else if (e.escalaAtual === 6 && abertos.length < 6) erro("dias", "A escala 6x1 que você escolheu em \"Escala hoje\" exige abrir pelo menos 6 dias. Marque mais um dia ou mude a escala atual para 5x2.");
    else abertosOk = true;

    var m = lerNumero(e.equipeMinima);
    var mOk = false;
    if (m === null) erro("equipeMinima", "Informe quantas pessoas, no mínimo, precisam estar presentes por dia.");
    else if (isNaN(m) || Math.floor(m) !== m || m < 1) erro("equipeMinima", "Use um número inteiro a partir de 1.");
    else if (nOk && m > n) erro("equipeMinima", "Você pediu " + m + " pessoas presentes por dia, mas informou só " + n + " funcionário(s). Reduza o mínimo ou aumente a equipe.");
    else mOk = true;

    /* ---- Jornada x escala de hoje ---- */
    var porDia = e.horas / e.escalaAtual;
    if (porDia > cfg.jornadaDiariaMaxima) {
      erro("horas", "Uma jornada de " + e.horas + " h em " + e.escalaAtual + " dias dá " + dec(porDia) + " h por dia, acima do máximo legal de " + cfg.jornadaDiariaMaxima + " h. Corrija a jornada ou a escala.");
    } else if (porDia > cfg.jornadaDiariaPadrao + 0.005) {
      aviso("jornada-diaria", "horas", "Uma jornada de " + e.horas + " h em " + e.escalaAtual + " dias exige " + dec(porDia) + " h por dia, acima do limite de " + cfg.jornadaDiariaPadrao + " h. Isso só é possível com compensação prevista em acordo ou convenção coletiva. Confirme que é o seu caso.");
    }

    /* ---- A equipe informada consegue manter o mínimo HOJE? ---- */
    if (nOk && mOk && abertosOk) {
      var trabalhaHoje = Math.min(e.escalaAtual, abertos.length);
      var precisaHoje = Math.ceil((m * abertos.length) / trabalhaHoje - 1e-9);
      if (n < precisaHoje) {
        aviso("equipe-curta-hoje", "funcionarios", "Mesmo na escala de hoje (" + e.escalaAtual + " dias de trabalho), manter " + m + " pessoa(s) presente(s) em " + abertos.length + " dias exigiria " + precisaHoje + " funcionários, e você informou " + n + ". Confira os números.");
      }
    }

    /* ---- Data de publicação da Emenda ---- */
    var promulgacao = e.promulgacao || null;
    if (promulgacao) {
      if (!dataValida(promulgacao)) erro("promulgacao", "Data inválida.");
      else if (promulgacao < cfg.aprovacaoISO) erro("promulgacao", "A Emenda só pode ser publicada depois da aprovação no Senado (" + dataBr(cfg.aprovacaoISO) + "). Informe uma data a partir daí ou deixe em branco.");
      else if (promulgacao > maisMeses(hojeISO, 12)) aviso("promulgacao-longe", "promulgacao", "A data " + dataBr(promulgacao) + " está a mais de 12 meses de hoje. Confirme que é a data prevista de publicação.");
    }

    if (erros.length) return { erros: erros, avisos: avisos, dados: null };

    return {
      erros: [],
      avisos: avisos,
      dados: {
        funcionarios: n, salario: salario, encargosPct: encargos, adicionalExtraPct: adicional,
        horasAtuais: e.horas, diasTrabalhoAtuais: e.escalaAtual, diasAbertos: abertos,
        equipeMinima: m, promulgacao: promulgacao,
      },
    };
  }

  return { lerNumero: lerNumero, dataValida: dataValida, validar: validar, NOMES_DIAS: NOMES_DIAS };
});
