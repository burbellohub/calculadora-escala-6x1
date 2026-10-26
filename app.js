(function () {
  "use strict";

  var E = window.Escala;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var EXEMPLO = ["8", "8", "8", "8", "8", "4", null]; // 6x1 de 44 h; null = DSR

  /* ---------- Linhas dos 7 dias ---------- */
  $("#dias").innerHTML = E.NOMES.map(function (nome, i) {
    return '<div class="dia" data-i="' + i + '">' +
      '<span class="nome">' + nome + "</span>" +
      '<div class="campos">' +
      '<div><label for="t' + i + '">Situação</label><select id="t' + i + '"><option value="t">Trabalha</option><option value="d">DSR (descanso)</option></select></div>' +
      '<div><label for="h' + i + '">Horas</label><input id="h' + i + '" type="text" inputmode="decimal" placeholder="Ex.: 8 ou 8:30"></div>' +
      "</div></div>";
  }).join("");

  function ler() {
    return E.NOMES.map(function (_, i) {
      return { dsr: $("#t" + i).value === "d", horas: $("#h" + i).value };
    });
  }

  function mostrar() {
    var dias = ler();
    var r = E.avaliar(dias);

    dias.forEach(function (d, i) {
      var linha = document.querySelector('.dia[data-i="' + i + '"]');
      $("#h" + i).disabled = d.dsr;
      linha.classList.toggle("dsr", d.dsr);
      linha.classList.toggle("problema", r.erros.some(function (e) { return e.dia === i; }));
    });

    var html = '<div class="total">Total da semana: <strong>' + esc(E.formatar(r.totalMin)) + "</strong> (limite: " + esc(E.formatar(E.LIMITE_SEMANA)) + "). Dias de DSR: <strong>" + r.dsr + "</strong> de 2.</div>";

    if (r.situacao === "erro") {
      html += '<div class="msg erro"><h2>Corrija para continuar</h2><ul>' + r.erros.map(function (e) { return "<li>" + esc(e.msg) + "</li>"; }).join("") + "</ul></div>";
    } else if (r.situacao === "excede") {
      html += '<div class="msg aviso"><h2>A escala passa do limite semanal</h2><p>Faltam reduzir <strong>' + esc(E.formatar(r.excedeMin)) + "</strong> para caber em " + esc(E.formatar(E.LIMITE_SEMANA)) + ". Diminua a escala: edite as horas de um ou mais dias acima.</p></div>";
    } else {
      html += '<div class="msg ok"><h2>Dentro do limite</h2><p>A escala cabe em ' + esc(E.formatar(E.LIMITE_SEMANA)) + " por semana e tem 2 dias de DSR. Você pode continuar.</p></div>";
      if (r.domingoTrabalha) html += '<div class="msg aviso"><p>Atenção: um dos dias de DSR deve ser, preferencialmente, o domingo.</p></div>';
    }
    $("#painel").innerHTML = html;
    $("#continuar").disabled = r.situacao !== "ok";
    return r;
  }

  function esconderFinal() { $("#final").hidden = true; $("#final").innerHTML = ""; }

  $("#form").addEventListener("input", function () { esconderFinal(); mostrar(); });
  $("#form").addEventListener("change", function () { esconderFinal(); mostrar(); });
  $("#form").addEventListener("submit", function (ev) { ev.preventDefault(); });

  $("#continuar").addEventListener("click", function () {
    var dias = ler();
    var r = mostrar();
    if (r.situacao !== "ok") return;
    var linhas = dias.map(function (d, i) {
      return d.dsr
        ? '<tr class="dsr"><td>' + E.NOMES[i] + '</td><td class="n">DSR</td></tr>'
        : "<tr><td>" + E.NOMES[i] + '</td><td class="n">' + esc(E.formatar(E.lerHoras(d.horas))) + "</td></tr>";
    }).join("");
    var el = $("#final");
    el.innerHTML = "<h2>Escala conferida</h2><p>Dentro de " + esc(E.formatar(E.LIMITE_SEMANA)) + " por semana, com 2 dias de DSR.</p>" +
      '<table><thead><tr><th>Dia</th><th class="n">Horas</th></tr></thead><tbody>' + linhas + '</tbody><tfoot><tr><td>Total da semana</td><td class="n">' + esc(E.formatar(r.totalMin)) + "</td></tr></tfoot></table>" +
      '<div class="acoes"><button type="button" class="btn primario" id="imprimir">Imprimir ou salvar em PDF</button></div>';
    el.hidden = false;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.focus({ preventScroll: true });
    $("#imprimir").addEventListener("click", function () { window.print(); });
  });

  $("#exemplo").addEventListener("click", function () {
    EXEMPLO.forEach(function (h, i) {
      $("#t" + i).value = h === null ? "d" : "t";
      $("#h" + i).value = h === null ? "" : h;
    });
    esconderFinal();
    mostrar();
  });

  $("#limpar").addEventListener("click", function () {
    E.NOMES.forEach(function (_, i) { $("#t" + i).value = "t"; $("#h" + i).value = ""; });
    esconderFinal();
    mostrar();
  });

  mostrar();
})();
