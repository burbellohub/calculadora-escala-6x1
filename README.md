# Simulador do fim da escala 6x1

Página única em **HTML, CSS e JavaScript puros** (sem instalar nada, sem servidor, sem banco). O cliente informa alguns dados e vê:

- o impacto da jornada **44 h → 42 h → 40 h** só em **horas, pessoas e dias** (horas perdidas, pessoas a contratar ou horas extras por pessoa). **Não há salário nem valores em dinheiro** em nenhum campo ou resultado;
- a linha do tempo das etapas (com datas, se a data de publicação da Emenda for informada);
- uma **escala 5x2 sugerida** para 4 semanas, com o rodízio de folgas e o aviso de dias em que faltaria gente;
- botões para **imprimir/salvar em PDF** e **copiar o resumo**.

Os dados digitados **não saem do navegador**.

## Regras usadas (conferidas em 26/10/2026)
PEC 221/2019 aprovada pelo Congresso (Senado em 14/10/2026, 75 a 1). Jornada máxima de 40 h semanais, **dois dias de descanso** por semana (um, preferencialmente, no domingo), **sem redução de salário**. Transição contada da **publicação da Emenda**: **2 meses** depois, 42 h e 2 dias de descanso; **14 meses** depois, 40 h. Na última informação conferida (16/10/2026) faltava a promulgação.

Fica **fora** da conta (aparece como aviso na tela): micro e pequenas empresas e MEI (lei complementar), regras de convenção coletiva, empregados de nível superior com remuneração alta, jornadas especiais, banco de horas e compensações.

> Confirme sempre no texto oficial da Emenda quando ela for publicada. As regras ficam em `config.js`.

## Erros e avisos (o usuário só avança se resolver)
A tela confere os dados antes de simular, em dois níveis (regras em `validacao.js`, limites em `config.js`, com testes):

- **Erro (bloqueia até corrigir):** campo vazio ou inválido; equipe mínima maior que o número de funcionários; empresa que abre menos de 5 dias (a escala 5x2 não fecha) ou menos de 6 dias com "6x1"; jornada que dá mais de 10 h por dia; data de publicação inválida ou anterior à aprovação no Senado (14/10/2026).
- **Aviso (bloqueia até confirmar):** 5x2 com 44 h (8,8 h por dia, acima de 8 h, só com compensação por acordo); equipe menor que a necessária até na escala de hoje; data de publicação a mais de 12 meses. Cada aviso tem uma caixa "confirmo"; o que foi confirmado aparece no resultado.
- Mudou qualquer dado depois de simular? O resultado antigo some, para ninguém decidir em cima de número velho.

## Como atualizar
Tudo que muda com o tempo está em **`config.js`**:
- `regras.situacao` e `regras.consultadoEm`: a situação da Emenda (promulgada? data?);
- `regras.etapas`: horas e prazos de cada etapa;
- `regras.atencao` e `regras.fontes`;
- `contatoWhatsApp`: WhatsApp do RH, só números com DDI (ex.: `5541999999999`). Vazio = o botão "Falar com o RH" não aparece.

Os cálculos estão em `calc.js` e a validação em `validacao.js` (ambos sem tela e com testes).
## Rodar e testar
Abra o `index.html` no navegador (duplo clique), ou:
```bash
python -m http.server 8000   # http://localhost:8000
npm test                     # testes dos cálculos e da validação (Node 20+; sem dependências)
```

## Publicar
**GitHub Pages:** no repositório, *Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`*. O arquivo `.nojekyll` já está incluído. (Em repositório privado, o Pages exige plano pago; deixe o repositório público.)

**Vercel:** *Add New → Project*, escolha o repositório, em *Framework Preset* deixe **Other** (sem comando de build e sem pasta de saída) e clique em *Deploy*.

## Como os números são calculados
- **Horas perdidas** = funcionários × (jornada de hoje − jornada da etapa), por semana; por mês, multiplicado por 52 ÷ 12.
- **Repor contratando** = pessoas a mais, arredondadas para cima, para manter o total de horas semanais da equipe: funcionários × (horas de hoje ÷ horas da etapa − 1).
- **Repor com hora extra** = horas perdidas por pessoa, por semana e por dia (a lei limita a 2 h extras por dia).
- **Horas por dia** = jornada semanal ÷ dias de trabalho (5 nas etapas novas).
- **Equipe mínima 5x2** = menor equipe que mantém as pessoas mínimas por dia em todos os dias em que a empresa abre, conferida simulando 4 semanas de rodízio.
