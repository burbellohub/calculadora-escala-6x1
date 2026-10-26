(function () {
  "use strict";

  var E = window.Escala;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  // Exemplos de escalas dentro do limite (batidas de segunda a domingo; null = DSR).
  var D824 = ["08:00", "12:00", "13:00", "17:24"]; // 8 h 24
  var D8 = ["08:00", "12:00", "13:00", "17:00"]; // 8 h
  var D9 = ["08:00", "12:00", "13:00", "18:00"]; // 9 h
  var D6 = ["08:00", "12:00", "13:00", "15:00"]; // 6 h
  var D6S = ["08:00", "12:00", "12:15", "14:15"]; // 6 h, intervalo curto
  var EXEMPLOS = [
    { nome: "homem, segunda a sexta, 8 h 24 por dia (42 h)", sexo: "h", dias: [D824, D824, D824, D824, D824, null, null] },
    { nome: "mulher, segunda a sexta, 8 h por dia (40 h)", sexo: "m", dias: [D8, D8, D8, D8, D8, null, null] },
    { nome: "homem, 9 h de segunda a quinta e 6 h na sexta (42 h)", sexo: "h", dias: [D9, D9, D9, D9, D6, null, null] },
    { nome: "mulher, terça a sábado, com DSR na segunda e no domingo (42 h)", sexo: "m", dias: [null, D9, D9, D9, D9, D6S, null] },
    { nome: "mulher que trabalha no domingo e folga 1 domingo sim e 1 não (42 h)", sexo: "m", domingo: "2", dias: [D824, null, D824, D824, null, D824, D824] },
    { nome: "homem que trabalha no domingo e folga 1 domingo a cada 4 semanas (42 h)", sexo: "h", domingo: "4", dias: [D824, D824, null, D824, null, D824, D824] },
  ];
  var exemploAtual = 0;

  /* ---------- Linhas dos 7 dias ---------- */
  $("#dias").innerHTML = E.NOMES.map(function (nome, i) {
    var batidas = E.BATIDAS.map(function (rot, k) {
      return '<div><label for="b' + i + k + '">' + rot + '</label><input id="b' + i + k + '" type="text" inputmode="numeric" maxlength="5" placeholder="00:00" autocomplete="off"></div>';
    }).join("");
    return '<div class="dia" data-i="' + i + '">' +
      '<div class="cab"><span class="nome">' + nome + '</span>' +
      '<select id="t' + i + '" aria-label="Situação de ' + nome + '"><option value="t">Trabalha</option><option value="d">DSR (descanso)</option></select></div>' +
      '<div class="batidas">' + batidas + "</div>" +
      '<div class="rodape-dia"><p class="horas-dia" id="r' + i + '"></p>' +
      '<button type="button" class="btn mini" data-copiar="' + i + '" id="c' + i + '">Replicar para os outros dias</button></div></div>';
  }).join("");

  function batidasDe(i) { return [0, 1, 2, 3].map(function (k) { return $("#b" + i + k).value; }); }

  var tocou = false; // só mostra erros depois que a pessoa mexe no formulário

  /** Mulher: pergunta única (domingo sim, domingo não). Homem: de quantas em quantas semanas folga. */
  var opcoesDomingo = "";

  function ajustarPerguntaDomingo() {
    var m = $("#sexo").value === "m";
    var chave = m ? "m" : "h";
    if (opcoesDomingo === chave) return;
    opcoesDomingo = chave;
    var sel = $("#domingo-cada");
    var atual = sel.value;
    $("#rotulo-domingo").textContent = m
      ? "Como o domingo é dia de trabalho: a escala da mulher alterna 1 domingo trabalhado e 1 domingo de folga (uma semana sim, outra não)?"
      : "Como o domingo é dia de trabalho: o homem folga um domingo a cada";
    sel.innerHTML = m
      ? '<option value="">Escolha...</option><option value="2">Sim, folga 1 domingo sim e 1 não</option><option value="0">Não alterna</option>'
      : '<option value="">Escolha...</option><option value="2">2 semanas</option><option value="3">3 semanas</option><option value="4">4 semanas</option><option value="5">5 semanas</option><option value="6">6 semanas</option><option value="8">8 semanas</option><option value="0">Nunca folga no domingo</option>';
    sel.value = Array.prototype.some.call(sel.options, function (o) { return o.value === atual; }) ? atual : "";
  }

  function lerExtra() {
    return { sexo: $("#sexo").value, domingoACada: $("#domingo-cada").value };
  }

  function ler() {
    return E.NOMES.map(function (_, i) {
      return { dsr: $("#t" + i).value === "d", batidas: batidasDe(i) };
    });
  }

  function mostrar() {
    var dias = ler();
    $("#bloco-domingo").hidden = dias[6].dsr;
    ajustarPerguntaDomingo();
    var r = E.avaliar(dias, lerExtra());

    dias.forEach(function (d, i) {
      var linha = document.querySelector('.dia[data-i="' + i + '"]');
      [0, 1, 2, 3].forEach(function (k) { $("#b" + i + k).disabled = d.dsr; });
      linha.querySelector(".batidas").hidden = d.dsr;
      $("#c" + i).hidden = d.dsr;
      $("#r" + i).textContent = d.dsr ? "DSR: dia de descanso." : r.porDia[i] === null ? "" : "Horas do dia: " + E.formatar(r.porDia[i]);
      linha.classList.toggle("dsr", d.dsr);
      linha.classList.toggle("problema", tocou && r.erros.some(function (e) { return e.dia === i; }));
    });

    var html = '<div class="total">Total da semana: <strong>' + esc(E.formatar(r.totalMin)) + "</strong> (limite: " + esc(E.formatar(E.LIMITE_SEMANA)) + "). Dias de DSR: <strong>" + r.dsr + "</strong> de 2.</div>";

    if (!tocou) {
      html = '<div class="msg aviso"><p>Preencha as 4 batidas de cada dia de trabalho e marque os 2 dias de DSR. A conferência aparece aqui.</p></div>';
    } else if (r.situacao === "erro") {
      html += '<div class="msg erro"><h2>Corrija para continuar</h2><ul>' + r.erros.map(function (e) { return "<li>" + esc(e.msg) + "</li>"; }).join("") + "</ul></div>";
    } else if (r.situacao === "excede") {
      html += '<div class="msg aviso"><h2>A escala passa do limite semanal</h2><p>Faltam reduzir <strong>' + esc(E.formatar(r.excedeMin)) + "</strong> para caber em " + esc(E.formatar(E.LIMITE_SEMANA)) + ". Diminua a escala: edite as batidas de um ou mais dias acima.</p></div>";
    } else {
      html += '<div class="msg ok"><h2>Dentro do limite</h2><p>A escala cabe em ' + esc(E.formatar(E.LIMITE_SEMANA)) + " por semana e tem 2 dias de DSR. Você pode continuar.</p></div>";
      html += '<div class="msg ok"><p>' + esc(textoDomingo(lerExtra(), r.domingoTrabalha)) + "</p></div>";
    }
    $("#painel").innerHTML = html;
    $("#continuar").disabled = r.situacao !== "ok";
    return r;
  }

  /** Frase sobre a regra do domingo, para o painel e para a tela final. */
  function textoDomingo(extra, trabalha) {
    var quem = extra.sexo === "m" ? "mulher" : "homem";
    var regra = extra.sexo === "m" ? "domingo sim, domingo não" : "pelo menos 1 domingo de folga por mês";
    if (!trabalha) return "Domingo é dia de DSR: a regra do domingo (" + quem + ": " + regra + ") está cumprida.";
    if (extra.sexo === "m") return "Domingo é dia de trabalho, com folga 1 domingo sim e 1 não: cumpre a regra da mulher (1 semana sim, 1 semana não).";
    return "Domingo é dia de trabalho, com folga num domingo a cada " + extra.domingoACada + " semanas: cumpre a regra (" + quem + ": " + regra + ").";
  }

  function dataHoje() {
    return new Date().toLocaleDateString("pt-BR");
  }

  /** Trecho da lei sobre o repouso dominical da mulher (mostrado na tela final e no PDF). */
  function textoLei() {
    return '<blockquote class="lei"><p class="lei-titulo">Base legal: folga aos domingos para mulheres</p>' +
      "<p>&ldquo;Havendo trabalho aos domingos, ser&aacute; organizada uma escala de revezamento quinzenal, que favore&ccedil;a o repouso dominical.&rdquo;</p>" +
      '<p class="lei-fonte">CLT (Decreto-Lei n&ordm; 5.452/1943), art. 386, no Cap&iacute;tulo &ldquo;Da Prote&ccedil;&atilde;o do Trabalho da Mulher&rdquo;. Confira a reda&ccedil;&atilde;o vigente em planalto.gov.br/ccivil_03/decreto-lei/del5452.htm.</p></blockquote>';
  }

  function esconderFinal() { $("#final").hidden = true; $("#final").innerHTML = ""; }

  /** Aceita só dígitos que formam um horário real (00:00 a 23:59): descarta o que não existe, como 80:00 ou 12:79. */
  function soHorasValidas(txt) {
    var out = "";
    txt.replace(/\D/g, "").split("").forEach(function (c) {
      var n = out.length;
      if (n === 4) return;
      if (n === 0 && c > "2") out = "0" + c; // 8 vira 08
      else if (n === 1 && out[0] === "2" && c > "3") return; // 24 a 29 não existem
      else if (n === 2 && c > "5") return; // minutos de 00 a 59
      else out += c;
    });
    return out;
  }

  // Máscara HH:MM e salto automático: ao completar os 4 dígitos, o foco vai para a próxima batida.
  $("#dias").addEventListener("input", function (ev) {
    var campo = ev.target;
    if (!campo.matches(".batidas input")) return;
    var d = soHorasValidas(campo.value);
    campo.value = d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d;
    if (d.length === 4 && ev.inputType && ev.inputType.indexOf("insert") === 0) {
      var todos = Array.prototype.slice.call(document.querySelectorAll("#dias .batidas input:not(:disabled)"));
      var prox = todos[todos.indexOf(campo) + 1];
      if (prox) { prox.focus(); prox.select(); }
    }
  });

  $("#form").addEventListener("input", function () { tocou = true; esconderFinal(); mostrar(); });
  $("#form").addEventListener("change", function () { tocou = true; esconderFinal(); mostrar(); });
  $("#form").addEventListener("submit", function (ev) { ev.preventDefault(); });

  $("#continuar").addEventListener("click", function () {
    var dias = ler();
    var r = mostrar();
    if (r.situacao !== "ok") return;
    var extra = lerExtra();
    var linhas = dias.map(function (d, i) {
      return d.dsr
        ? '<tr class="dsr"><td>' + E.NOMES[i] + '</td><td>DSR</td><td class="n">—</td></tr>'
        : "<tr><td>" + E.NOMES[i] + "</td><td>" + d.batidas.map(esc).join(" · ") + '</td><td class="n">' + esc(E.formatar(r.porDia[i])) + "</td></tr>";
    }).join("");
    var el = $("#final");
    var lei = extra.sexo === "m" ? textoLei() : "";
    el.innerHTML = '<div class="cabeca-final"><img class="logo-final" src="logo.png" alt="Burbello Escritório Contábil" width="150" height="99"><div><h2>Escala conferida</h2><p class="sub-final">Burbello Escritório Contábil · Departamento de RH · ' + esc(dataHoje()) + "</p></div></div>" +
      "<p><strong>Funcionário(a): " + (extra.sexo === "m" ? "Mulher" : "Homem") + "</strong></p>" +
      "<p>Dentro de " + esc(E.formatar(E.LIMITE_SEMANA)) + " por semana, com 2 dias de DSR. " + esc(textoDomingo(extra, r.domingoTrabalha)) + "</p>" +
      '<table><thead><tr><th>Dia</th><th>Batidas</th><th class="n">Horas</th></tr></thead><tbody>' + linhas + '</tbody><tfoot><tr><td colspan="2">Total da semana</td><td class="n">' + esc(E.formatar(r.totalMin)) + "</td></tr></tfoot></table>" +
      lei + '<div class="acoes"><button type="button" class="btn primario" id="imprimir">Imprimir ou salvar em PDF</button></div>';
    el.hidden = false;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.focus({ preventScroll: true });
    $("#imprimir").addEventListener("click", function () { window.print(); });
  });

  $("#dias").addEventListener("click", function (ev) {
    var bt = ev.target.closest("[data-copiar]");
    if (!bt) return;
    var origem = Number(bt.getAttribute("data-copiar"));
    var valores = batidasDe(origem);
    E.NOMES.forEach(function (_, i) {
      if (i === origem || $("#t" + i).value === "d") return; // não mexe nos dias de DSR
      valores.forEach(function (v, k) { $("#b" + i + k).value = v; });
    });
    tocou = true;
    esconderFinal();
    mostrar();
  });

  function preencherExemplo() {
    tocou = true;
    var ex = EXEMPLOS[exemploAtual];
    $("#nome-exemplo").textContent = "Exemplo " + (exemploAtual + 1) + " de " + EXEMPLOS.length + ": " + ex.nome + ".";
    $("#sexo").value = ex.sexo;
    ajustarPerguntaDomingo();
    $("#domingo-cada").value = ex.domingo || "";
    ex.dias.forEach(function (b, i) {
      $("#t" + i).value = b === null ? "d" : "t";
      [0, 1, 2, 3].forEach(function (k) { $("#b" + i + k).value = b === null ? "" : b[k]; });
    });
    esconderFinal();
    mostrar();
  }

  $("#exemplo").addEventListener("click", preencherExemplo);
  $("#trocar").addEventListener("click", function () {
    exemploAtual = (exemploAtual + 1) % EXEMPLOS.length;
    preencherExemplo();
  });

  $("#limpar").addEventListener("click", function () {
    tocou = false;
    $("#nome-exemplo").textContent = "";
    $("#sexo").value = "";
    $("#domingo-cada").value = "";
    E.NOMES.forEach(function (_, i) { $("#t" + i).value = "t"; [0, 1, 2, 3].forEach(function (k) { $("#b" + i + k).value = ""; }); });
    esconderFinal();
    mostrar();
  });

  mostrar();
})();
