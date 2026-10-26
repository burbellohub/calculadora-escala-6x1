/*
 * Cálculos do simulador (sem tela). Funciona no navegador (window.Escala) e no Node (testes).
 * Todas as regras da jornada ficam em config.js; aqui só tem matemática.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.Escala = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Semanas em um mês (52 / 12). */
  const SEMANAS_NO_MES = 52 / 12;
  const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  /** Soma meses a uma data "AAAA-MM-DD" (mantém o dia; se não existir no mês, usa o último). */
  function adicionarMeses(iso, meses) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return null;
    const total = Number(m[1]) * 12 + (Number(m[2]) - 1) + meses;
    const ano = Math.floor(total / 12);
    const mes = total % 12;
    const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    const dia = Math.min(Number(m[3]), ultimoDia);
    return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }

  /**
   * Impacto em HORAS de cada etapa da redução de jornada (sem valores em dinheiro).
   * p: { funcionarios, horasAtuais, diasTrabalhoAtuais, promulgacao, etapas }
   * etapas: [{ id, rotulo, horas, meses }] (as etapas FUTURAS, em ordem)
   * Nas etapas novas a escala é 5x2: 5 dias de trabalho e 2 de descanso.
   */
  function simularImpacto(p) {
    const n = p.funcionarios;
    const H0 = p.horasAtuais;
    const diasHoje = p.diasTrabalhoAtuais;

    function etapa(id, rotulo, H, dias, descansos, data) {
      const mudou = H < H0;
      const perdidasSemana = n * (H0 - H);
      // Arredonda a "sobra" de ponto flutuante antes do teto (ex.: 10 × (44/40 − 1) = 1,0000000000000009).
      const pessoas = mudou ? Math.ceil(Math.round(n * (H0 / H - 1) * 1e6) / 1e6) : 0;
      return {
        id: id,
        rotulo: rotulo,
        horas: H,
        mudou: mudou,
        data: data,
        diasTrabalho: dias,
        descansos: descansos,
        horasPorDia: H / dias,
        horasMesPorPessoa: H * SEMANAS_NO_MES,
        horasEquipeSemana: n * H,
        horasPerdidasSemana: perdidasSemana,
        horasPerdidasMes: perdidasSemana * SEMANAS_NO_MES,
        horasPerdidasPct: (1 - H / H0) * 100,
        pessoasParaRepor: pessoas,
        // Alternativa: cada pessoa cobre as horas perdidas com hora extra.
        horaExtraSemanaPorPessoa: H0 - H,
        horaExtraDiaPorPessoa: (H0 - H) / dias,
      };
    }

    const hoje = etapa("hoje", "Hoje", H0, diasHoje, 7 - diasHoje, null);
    const etapas = p.etapas.map(function (e) {
      return etapa(e.id, e.rotulo, Math.min(e.horas, H0), 5, 2, p.promulgacao ? adicionarMeses(p.promulgacao, e.meses) : null);
    });
    return { hoje: hoje, etapas: etapas };
  }

  /** Pessoas necessárias para manter `equipeMinima` presentes em todos os dias abertos. */
  function equipeNecessaria({ diasAbertos, equipeMinima, diasTrabalhoSemana }) {
    const abertos = new Set(diasAbertos).size;
    const dias = Math.min(diasTrabalhoSemana, abertos) || 1;
    return Math.ceil((equipeMinima * abertos) / dias - 1e-9);
  }

  /**
   * Monta um rodízio de folgas no modelo 5x2.
   * - Cada pessoa trabalha 5 dos dias em que a empresa abre; os dias fechados já contam como descanso.
   * - Se a empresa abre no domingo, quem sobra acima da equipe mínima folga no domingo, em rodízio
   *   (quem está há mais tempo sem domingo de folga tem prioridade).
   * - As demais folgas são espalhadas pelos dias menos desfalcados.
   */
  function gerarEscala({ funcionarios, diasAbertos, equipeMinima, semanas = 4 }) {
    const n = funcionarios;
    const m = equipeMinima;
    const abertos = [...new Set(diasAbertos)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
    const trabalham = Math.min(5, abertos.length);
    const rotativas = abertos.length - trabalham;
    const ultimoDomingo = Array.from({ length: n }, (_, i) => -(n - i));
    const domingosDeFolga = Array(n).fill(0);
    const lista = [];
    const diasComFalta = new Set();
    let maiorFalta = 0;

    for (let w = 0; w < semanas; w++) {
      const folgas = Array.from({ length: n }, () => new Set());
      const cont = Array(7).fill(0);

      if (rotativas > 0 && abertos.includes(0)) {
        const capacidade = Math.max(0, n - m);
        const ordem = [...Array(n).keys()].sort((a, b) => ultimoDomingo[a] - ultimoDomingo[b] || a - b);
        for (const i of ordem.slice(0, capacidade)) {
          folgas[i].add(0);
          cont[0]++;
          ultimoDomingo[i] = w;
          domingosDeFolga[i]++;
        }
      }

      for (let k = 0; k < n; k++) {
        const i = (k + w) % n;
        let faltam = rotativas - folgas[i].size;
        while (faltam > 0) {
          const semDomingo = abertos.filter((d) => d !== 0 && !folgas[i].has(d));
          const pool = semDomingo.length ? semDomingo : abertos.filter((d) => !folgas[i].has(d));
          pool.sort((x, y) => cont[x] - cont[y] || ((x + w + i) % 7) - ((y + w + i) % 7));
          folgas[i].add(pool[0]);
          cont[pool[0]]++;
          faltam--;
        }
      }

      const presentes = DIAS.map((_, d) => (abertos.includes(d) ? n - folgas.filter((f) => f.has(d)).length : 0));
      const faltas = presentes.map((q, d) => (abertos.includes(d) ? Math.max(0, m - q) : 0));
      faltas.forEach((f, d) => {
        if (f > 0) {
          diasComFalta.add(DIAS[d]);
          maiorFalta = Math.max(maiorFalta, f);
        }
      });

      lista.push({
        presentes,
        faltas,
        funcionarios: folgas.map((f) => DIAS.map((_, d) => (!abertos.includes(d) ? "X" : f.has(d) ? "F" : "T"))),
      });
    }

    const comDomingo = abertos.includes(0) && rotativas > 0;
    return {
      semanas: lista,
      abertos,
      resumo: {
        trabalhamPorSemana: trabalham,
        diasComFalta: DIAS.filter((d) => diasComFalta.has(d)),
        maiorFalta,
        semFalta: diasComFalta.size === 0,
        abreNoDomingo: abertos.includes(0),
        domingosDeFolgaPorPessoa: comDomingo ? domingosDeFolga.reduce((a, b) => a + b, 0) / n : null,
      },
    };
  }

  /** Menor equipe (a partir do cálculo direto) que fecha a escala 5x2 sem faltar gente em nenhum dia. */
  function menorEquipe5x2({ diasAbertos, equipeMinima, semanas = 4 }) {
    const base = Math.max(equipeMinima, equipeNecessaria({ diasAbertos, equipeMinima, diasTrabalhoSemana: 5 }));
    for (let n = base; n <= base + 20; n++) {
      if (gerarEscala({ funcionarios: n, diasAbertos, equipeMinima, semanas }).resumo.semFalta) return n;
    }
    return base;
  }

  return { SEMANAS_NO_MES, DIAS, adicionarMeses, simularImpacto, equipeNecessaria, gerarEscala, menorEquipe5x2 };
});
