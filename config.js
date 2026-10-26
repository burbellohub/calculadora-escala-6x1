/*
 * Configuração do simulador. Para atualizar a regra (ex.: depois da promulgação) ou o contato do RH,
 * edite só este arquivo.
 */
window.CONFIG = {
  marca: "Burbello",
  setor: "Departamento de RH",

  /** WhatsApp do RH, só números com DDI (ex.: "5541999999999"). Vazio = o botão de contato não aparece. */
  contatoWhatsApp: "",
  contatoTexto: "Falar com o RH",

  regras: {
    /** Quando a regra foi conferida pela última vez. */
    consultadoEm: "26/10/2026",
    situacao:
      "A PEC 221/2019 foi aprovada pelo Senado em 14/10/2026 (75 votos a 1), sem mudanças no texto da Câmara. Na última informação que conferimos (16/10/2026), faltava a promulgação. Os prazos abaixo contam a partir da publicação da Emenda Constitucional.",

    /** Jornada hoje (CF, art. 7º, XIII). */
    jornadaAtual: 44,

    /** Etapas futuras. "meses" = prazo após a publicação da Emenda. */
    etapas: [
      {
        id: "e42",
        rotulo: "2 meses após a publicação",
        meses: 2,
        horas: 42,
        detalhe: "Limite cai para 42 h semanais e passam a valer 2 dias de descanso por semana (um deles, preferencialmente, no domingo).",
      },
      {
        id: "e40",
        rotulo: "14 meses após a publicação",
        meses: 14,
        horas: 40,
        detalhe: "Limite cai para 40 h semanais (8 h por dia). O salário não pode ser reduzido.",
      },
    ],

    /** O que NÃO entra na conta e merece análise caso a caso. */
    atencao: [
      "Micro e pequenas empresas e MEI: o texto prevê regras de transição por lei complementar, ainda não editada.",
      "Acordo ou convenção coletiva pode ter regras próprias (por exemplo, compensação na média de dois descansos por semana e jornada diária maior durante a transição).",
      "Empregados com nível superior e remuneração a partir de 2,5 vezes o teto do INSS têm tratamento diferente na jornada.",
      "Regimes e setores com jornada especial (turnos, plantões) podem depender de lei específica.",
      "Hora extra, banco de horas, reflexos em DSR, férias e 13º não estão calculados em detalhe.",
    ],

    fontes: [
      {
        rotulo: "Mayer Brown, 16/10/2026: Congresso aprova o fim da escala 6x1 e a redução para 40 horas",
        url: "https://www.mayerbrown.com/pt/insights/publications/2026/10/brazilian-congress-approves-the-end-of-the-6x1-work-schedule-and-the-reduction-of-the-workweek-to-40-hours",
      },
      {
        rotulo: "InfoMoney: Câmara aprova PEC do fim da 6x1, com redução para 40h e jornada de 5 dias",
        url: "https://www.infomoney.com.br/politica/camara-aprova-pec-do-fim-da-6x1/",
      },
      {
        rotulo: "O POVO: fim da escala 6x1 é aprovado na Câmara Federal (28/05/2026)",
        url: "https://mais.opovo.com.br/jornal/reportagem/2026/05/28/fim-da-escala-6x1-e-aprovado-na-camara-federal.html",
      },
    ],
  },
};
