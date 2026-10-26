(function () {
  "use strict";

  var CFG = window.CONFIG;
  var E = window.Escala;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ---------- Formatação ---------- */
  var brl = function (v) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v); };
  var num = function (v, d) { d = d || 0; return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v); };
  var pct = function (v) { return (v > 0.0005 ? "+" : v < -0.0005 ? "−" : "") + num(Math.abs(v), 1) + "%"; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var dataBr = function (iso) { return iso ? iso.split("-").reverse().join("/") : null; };
  var plural = function (n, um, varios) { return n === 1 ? um : varios; };

  /** Aceita "2.500,50", "2500,5", "2500.5" e "2.500". Devolve null (vazio), NaN (inválido) ou o número. */
  function lerNumero(txt) {
    var t = String(txt == null ? "" : txt).trim().replace(/\s/g, "").replace(/^R\$/i, "");
    if (!t) return null;
    if (t.indexOf(",") >= 0) t = t.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
    var n = Number(t);
    return isFinite(n) ? n : NaN;
  }

  /* ---------- Cabeçalho, situação e rodapé (vêm do config.js) ---------- */
  function linkZap(texto) {
    return "https://wa.me/" + CFG.contatoWhatsApp + "?text=" + encodeURIComponent(texto || "Olá! Usei o simulador do fim da escala 6x1 e gostaria de conversar.");
  }
  if (CFG.contatoWhatsApp) {
    $("#contato-box").innerHTML = '<a class="btn whats" href="' + esc(linkZap()) + '" target="_blank" rel="noopener noreferrer">' + esc(CFG.contatoTexto) + "</a>";
  }

  /* ---------- Leitura e validação ---------- */
  var CAMPOS_ERRO = ["funcionarios", "salario", "encargos", "adicional", "dias", "equipeMinima", "promulgacao"];

  function mostrarErro(campo, msg) {
    var el = $("#e-" + campo);
    var entrada = $("#" + campo);
    if (el) { el.textContent = msg || ""; el.hidden = !msg; }
    if (entrada) { if (msg) entrada.setAttribute("aria-invalid", "true"); else entrada.removeAttribute("aria-invalid"); }
  }

  function lerFormulario() {
    var erros = {};
    var f = $("#form");

    var funcionarios = lerNumero(f.funcionarios.value);
    if (funcionarios === null || isNaN(funcionarios) || funcionarios < 1 || funcionarios > 5000 || Math.floor(funcionarios) !== funcionarios) erros.funcionarios = "Informe um número inteiro de 1 a 5000.";

    var salario = lerNumero(f.salario.value);
    if (salario === null || isNaN(salario) || salario <= 0) erros.salario = "Informe o salário médio mensal, por exemplo 2.400,00.";

    var encargos = lerNumero(f.encargos.value);
    if (encargos === null) encargos = 0;
    if (isNaN(encargos) || encargos < 0 || encargos > 300) erros.encargos = "Use um valor entre 0 e 300.";

    var adicional = lerNumero(f.adicional.value);
    if (adicional === null) adicional = 50;
    if (isNaN(adicional) || adicional < 0 || adicional > 300) erros.adicional = "Use um valor entre 0 e 300.";

    var dias = Array.prototype.map.call(f.querySelectorAll('input[name="dias"]:checked'), function (c) { return Number(c.value); });
    if (!dias.length) erros.dias = "Marque ao menos um dia em que a empresa abre.";

    var equipeMinima = lerNumero(f.equipeMinima.value);
    if (equipeMinima === null || isNaN(equipeMinima) || equipeMinima < 1 || Math.floor(equipeMinima) !== equipeMinima) erros.equipeMinima = "Informe um número inteiro a partir de 1.";

    var promulgacao = f.promulgacao.value || null;
    if (promulgacao && !/^\d{4}-\d{2}-\d{2}$/.test(promulgacao)) erros.promulgacao = "Data inválida.";

    CAMPOS_ERRO.forEach(function (c) { mostrarErro(c, erros[c]); });
    if (Object.keys(erros).length) return { erros: erros };

    return {
      erros: null,
      dados: {
        funcionarios: funcionarios, salario: salario, encargosPct: encargos, adicionalExtraPct: adicional,
        horasAtuais: Number(f.horas.value), diasTrabalhoAtuais: Number(f.escalaAtual.value),
        diasAbertos: dias, equipeMinima: equipeMinima, promulgacao: promulgacao,
      },
    };
  }

  /* ---------- Montagem do resultado ---------- */
  function cartao(titulo, valor, detalhe, classe) {
    return '<div class="cartao ' + (classe || "") + '"><div class="t">' + esc(titulo) + '</div><div class="v">' + valor + '</div><div class="d">' + detalhe + "</div></div>";
  }

  function secaoResumo(p, imp, eq) {
    var fim = imp.etapas[imp.etapas.length - 1];
    var cartoes = "";
    if (fim.mudou) {
      cartoes += cartao("Valor da hora de trabalho", pct(fim.variacaoValorHoraPct), "de " + brl(imp.hoje.valorHora) + " para " + brl(fim.valorHora) + ", com o mesmo salário", "alerta");
      cartoes += cartao("Horas a menos por semana", num(fim.horasPerdidasSemana) + " h", "equipe toda: " + num(imp.hoje.horasEquipeSemana) + " h → " + num(fim.horasEquipeSemana) + " h (" + pct(-fim.horasPerdidasPct) + ")");
      cartoes += cartao("Para repor essas horas contratando", fim.pessoasParaRepor + " " + plural(fim.pessoasParaRepor, "pessoa", "pessoas"), "cerca de " + brl(fim.custoReposicaoMes) + " a mais por mês", "alerta");
    } else {
      cartoes += cartao("Sua jornada atual", num(p.horasAtuais) + " h", "já está dentro do limite final de 40 h por semana", "ok");
    }
    var ok = p.funcionarios >= eq.equipe52;
    cartoes += cartao(
      "Equipe mínima para a escala 5x2",
      eq.equipe52 + " " + plural(eq.equipe52, "pessoa", "pessoas"),
      "hoje seriam " + eq.equipeHoje + " (" + (p.diasTrabalhoAtuais === 6 ? "6x1" : "5x2") + "); você tem " + p.funcionarios + (ok ? ": cobre." : ": faltam " + (eq.equipe52 - p.funcionarios) + "."),
      ok ? "ok" : "alerta"
    );
    return '<section class="bloco"><h2>Resumo</h2><p class="sub">No limite final de 40 horas, com dois dias de descanso por semana e sem redução de salário.</p><div class="cartoes">' + cartoes + "</div></section>";
  }

  function secaoLinhaDoTempo(p, imp) {
    var passos = [{ nome: "Hoje", horas: imp.hoje.horas, data: null, texto: "Jornada de " + num(p.horasAtuais) + " h por semana, com " + (p.diasTrabalhoAtuais === 6 ? "1 dia de descanso (6x1)" : "2 dias de descanso (5x2)") + ".", atual: true }];
    CFG.regras.etapas.forEach(function (et, i) {
      var r = imp.etapas[i];
      passos.push({ nome: et.rotulo, horas: r.horas, data: r.data, texto: et.detalhe, atual: false });
    });
    var html = passos.map(function (s) {
      return '<div class="etapa ' + (s.atual ? "atual" : "") + '"><div class="nome">' + esc(s.nome) + '</div><div class="horas">' + num(s.horas) + ' h</div>' +
        (s.data ? '<div class="data">a partir de ' + esc(dataBr(s.data)) + "</div>" : "") + "<p>" + esc(s.texto) + "</p></div>";
    }).join("");
    var nota = p.promulgacao ? "As datas partem da publicação em " + esc(dataBr(p.promulgacao)) + "." : "Informe a data de publicação da Emenda (opcional) para ver as datas de cada etapa.";
    return '<section class="bloco"><h2>Linha do tempo</h2><p class="sub">' + nota + '</p><div class="linha-tempo">' + html + "</div></section>";
  }

  function secaoTabela(p, imp) {
    var cols = [imp.hoje].concat(imp.etapas);
    var cab = '<th scope="col">Item</th>' + cols.map(function (c) { return '<th scope="col" class="n">' + esc(c.id === "hoje" ? "Hoje" : num(c.horas) + " h") + "</th>"; }).join("");
    function linha(titulo, dica, fn) {
      return "<tr><th scope=\"row\">" + esc(titulo) + (dica ? "<small>" + esc(dica) + "</small>" : "") + "</th>" + cols.map(function (c, i) { return '<td class="n">' + fn(c, i) + "</td>"; }).join("") + "</tr>";
    }
    var cinza = function (t) { return '<span class="zero">' + t + "</span>"; };
    var corpo =
      linha("Jornada semanal", "", function (c) { return num(c.horas) + " h"; }) +
      linha("Valor da hora", "salário ÷ (horas semanais × 5)", function (c) { return brl(c.valorHora); }) +
      linha("Variação do valor da hora", "mesmo salário, menos horas", function (c, i) { return i === 0 || !c.mudou ? cinza("—") : '<span class="sobe">' + pct(c.variacaoValorHoraPct) + "</span>"; }) +
      linha("Horas trabalhadas pela equipe", "por semana", function (c) { return num(c.horasEquipeSemana) + " h"; }) +
      linha("Horas perdidas por semana", "em relação a hoje", function (c, i) { return i === 0 || !c.mudou ? cinza("—") : num(c.horasPerdidasSemana) + " h"; }) +
      linha("Folha mensal", "sem mudança: o salário não pode cair", function (c) { return brl(c.folhaMensal); }) +
      linha("Repor as horas contratando", "pessoas a mais e custo mensal", function (c, i) { return i === 0 || !c.mudou ? cinza("—") : c.pessoasParaRepor + " " + plural(c.pessoasParaRepor, "pessoa", "pessoas") + "<br>+ " + brl(c.custoReposicaoMes); }) +
      linha("Repor as horas com hora extra", "custo mensal; limite legal de 2 h extras por dia", function (c, i) { return i === 0 || !c.mudou ? cinza("—") : "+ " + brl(c.custoHoraExtraMes); });
    return '<section class="bloco"><h2>Impacto por etapa</h2><p class="sub">Para ' + p.funcionarios + " " + plural(p.funcionarios, "funcionário", "funcionários") + ", salário médio de " + brl(p.salario) + (p.encargosPct ? " e encargos de " + num(p.encargosPct, 1) + "%" : "") +
      '. Os dois últimos itens são formas alternativas de cobrir as horas que deixam de ser trabalhadas.</p><div class="rolagem"><table><thead><tr>' + cab + "</tr></thead><tbody>" + corpo + "</tbody></table></div></section>";
  }

  var ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

  function secaoEscala(p, esc5, eq) {
    var visiveis = Math.min(p.funcionarios, 12);
    var resumo = esc5.resumo;
    var avisos = "";
    if (p.funcionarios >= eq.equipe52 && resumo.semFalta) {
      avisos += '<p class="aviso ok">Com ' + p.funcionarios + " " + plural(p.funcionarios, "pessoa", "pessoas") + " dá para manter ao menos " + p.equipeMinima + " " + plural(p.equipeMinima, "presente", "presentes") + " em todos os dias em que a empresa abre, na escala 5x2.</p>";
    } else {
      var faltam = Math.max(0, eq.equipe52 - p.funcionarios);
      avisos += '<p class="aviso alerta"><strong>Atenção:</strong> com ' + p.funcionarios + " " + plural(p.funcionarios, "pessoa", "pessoas") + ", faltaria gente em: " + esc(resumo.diasComFalta.join(", ") || "alguns dias") + ". Para manter " + p.equipeMinima + " presentes em todos os dias abertos seriam necessárias " + eq.equipe52 + " pessoas" +
        (faltam ? " (" + faltam + " a mais, cerca de " + brl(faltam * p.salario * (1 + p.encargosPct / 100)) + " por mês)" : "") + ".</p>";
    }
    if (resumo.abreNoDomingo && resumo.domingosDeFolgaPorPessoa !== null) {
      avisos += '<p class="sub">Como a empresa abre no domingo, o rodízio dá em média <strong>' + num(resumo.domingosDeFolgaPorPessoa, 1) + "</strong> domingo(s) de folga por pessoa a cada 4 semanas. A regra pede que um dos dois descansos seja, preferencialmente, no domingo.</p>";
    }
    var semanas = esc5.semanas.map(function (sem, w) {
      var cab = "<th>Pessoa</th>" + ORDEM_DIAS.map(function (d) { return "<th>" + E.DIAS[d] + "</th>"; }).join("");
      var corpo = sem.funcionarios.slice(0, visiveis).map(function (est, i) {
        return "<tr><td>Pessoa " + (i + 1) + "</td>" + ORDEM_DIAS.map(function (d) {
          var c = est[d];
          return '<td class="' + c + '" title="' + (c === "T" ? "Trabalha" : c === "F" ? "Folga" : "Empresa fechada") + '">' + (c === "T" ? "Trab." : c === "F" ? "Folga" : "—") + "</td>";
        }).join("") + "</tr>";
      }).join("");
      var rodape = "<tr><td>Presentes</td>" + ORDEM_DIAS.map(function (d) {
        var aberto = esc5.abertos.indexOf(d) >= 0;
        return '<td class="' + (aberto && sem.faltas[d] > 0 ? "falta" : "") + '">' + (aberto ? sem.presentes[d] : "—") + "</td>";
      }).join("") + "</tr>";
      return '<div class="semana"><h3>Semana ' + (w + 1) + '</h3><div class="rolagem"><table class="escala"><thead><tr>' + cab + "</tr></thead><tbody>" + corpo + "</tbody><tfoot>" + rodape + "</tfoot></table></div></div>";
    }).join("");
    var nota = p.funcionarios > visiveis ? '<p class="sub">Mostrando as primeiras ' + visiveis + " de " + p.funcionarios + " pessoas. A mesma lógica vale para toda a equipe.</p>" : "";
    return '<section class="bloco"><h2>Escala 5x2 sugerida (4 semanas)</h2><p class="sub">Cada pessoa trabalha 5 dias e descansa 2 por semana. Os dias em que a empresa fecha já contam como descanso. É um modelo de rodízio para planejamento, não uma escala definitiva.</p>' +
      avisos + nota + semanas + '<p class="legenda"><span class="lt">Trabalha</span><span class="lf">Folga</span><span class="lx">Empresa fechada</span></p></section>';
  }

  function secaoAtencao() {
    var atencao = CFG.regras.atencao.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var fontes = CFG.regras.fontes.map(function (f) { return '<li><a href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.rotulo) + "</a></li>"; }).join("");
    return '<section class="bloco"><h2>O que esta simulação não cobre</h2><ul class="lista">' + atencao + '</ul><h3 style="margin:18px 0 8px;font-size:1rem">Fontes consultadas</h3><ul class="lista fontes">' + fontes + "</ul></section>";
  }

  function textoResumo(p, imp, eq) {
    var fim = imp.etapas[imp.etapas.length - 1];
    var l = [];
    l.push("Simulação do fim da escala 6x1 (" + CFG.marca + ")");
    l.push(p.funcionarios + " funcionários, salário médio " + brl(p.salario) + ", jornada atual " + p.horasAtuais + " h.");
    if (fim.mudou) {
      l.push("Com 40 h/semana: valor da hora " + pct(fim.variacaoValorHoraPct) + " (" + brl(imp.hoje.valorHora) + " → " + brl(fim.valorHora) + "); " + num(fim.horasPerdidasSemana) + " h a menos por semana na equipe.");
      l.push("Repor contratando: " + fim.pessoasParaRepor + " pessoa(s), cerca de " + brl(fim.custoReposicaoMes) + " por mês. Repor com hora extra: cerca de " + brl(fim.custoHoraExtraMes) + " por mês.");
    }
    l.push("Equipe mínima na escala 5x2: " + eq.equipe52 + " pessoa(s) (você tem " + p.funcionarios + ").");
    l.push("Estimativa para planejamento; não substitui análise de RH, contabilidade ou advogado trabalhista.");
    return l.join("\n");
  }

  var ultimoTexto = "";

  function simular(p) {
    var imp = E.simularImpacto({
      funcionarios: p.funcionarios, salario: p.salario, encargosPct: p.encargosPct, horasAtuais: p.horasAtuais,
      adicionalExtraPct: p.adicionalExtraPct, promulgacao: p.promulgacao, etapas: CFG.regras.etapas,
    });
    var eq = {
      equipeHoje: E.equipeNecessaria({ diasAbertos: p.diasAbertos, equipeMinima: p.equipeMinima, diasTrabalhoSemana: p.diasTrabalhoAtuais }),
      equipe52: E.menorEquipe5x2({ diasAbertos: p.diasAbertos, equipeMinima: p.equipeMinima }),
    };
    var esc5 = E.gerarEscala({ funcionarios: p.funcionarios, diasAbertos: p.diasAbertos, equipeMinima: p.equipeMinima, semanas: 4 });

    ultimoTexto = textoResumo(p, imp, eq);
    var acoes = '<div class="barra-acoes"><button type="button" class="btn primario" id="imprimir">Imprimir ou salvar em PDF</button><button type="button" class="btn" id="copiar">Copiar resumo</button>' +
      (CFG.contatoWhatsApp ? '<a class="btn whats" target="_blank" rel="noopener noreferrer" href="' + esc(linkZap("Olá! Fiz a simulação do fim da escala 6x1:\n\n" + ultimoTexto)) + '">' + esc(CFG.contatoTexto) + "</a>" : "") + '</div><p class="sub" id="copiado" role="status"></p>';

    var el = $("#resultado");
    el.innerHTML = secaoResumo(p, imp, eq) + secaoLinhaDoTempo(p, imp) + secaoTabela(p, imp) + secaoEscala(p, esc5, eq) + secaoAtencao() + acoes;
    el.hidden = false;
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });

    $("#imprimir").addEventListener("click", function () { window.print(); });
    $("#copiar").addEventListener("click", function () {
      var aviso = $("#copiado");
      function ok() { aviso.textContent = "Resumo copiado."; }
      function falha() { aviso.textContent = "Não foi possível copiar automaticamente. Selecione o texto e copie."; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ultimoTexto).then(ok, falha); else falha();
    });
  }

  /* ---------- Eventos ---------- */
  $("#form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var r = lerFormulario();
    if (r.erros) {
      var primeiro = CAMPOS_ERRO.filter(function (c) { return r.erros[c]; })[0];
      var alvo = primeiro === "dias" ? $('input[name="dias"]') : $("#" + primeiro);
      if (alvo) alvo.focus();
      $("#resultado").hidden = true;
      return;
    }
    simular(r.dados);
  });

  $("#form").addEventListener("reset", function () {
    setTimeout(function () {
      CAMPOS_ERRO.forEach(function (c) { mostrarErro(c, ""); });
      $("#resultado").hidden = true;
      $("#resultado").innerHTML = "";
    }, 0);
  });

  $("#exemplo").addEventListener("click", function () {
    var f = $("#form");
    f.funcionarios.value = "12";
    f.salario.value = "2.400,00";
    f.encargos.value = "70";
    f.horas.value = "44";
    f.escalaAtual.value = "6";
    f.adicional.value = "50";
    f.equipeMinima.value = "3";
    f.promulgacao.value = "";
    Array.prototype.forEach.call(f.querySelectorAll('input[name="dias"]'), function (c) { c.checked = c.value !== "0"; });
    f.requestSubmit();
  });
})();
