/* Escreve marca, setor e a situação da regra (vindos do config.js) logo depois do trecho que os recebe,
 * ainda durante a leitura da página, para o conteúdo não "pular" depois da primeira pintura. */
(function () {
  var C = window.CONFIG;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  document.getElementById("marca").textContent = C.marca;
  document.getElementById("setor").textContent = C.setor;
  document.getElementById("situacao").innerHTML = "<strong>Situação da regra (conferida em " + esc(C.regras.consultadoEm) + "):</strong> " + esc(C.regras.situacao);
})();
