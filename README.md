# Simulador do fim da escala 6x1

Página única em **HTML, CSS e JavaScript puros** (sem instalar nada, sem servidor, sem banco). O cliente informa alguns dados e vê:

- o impacto da jornada **44 h → 42 h → 40 h** (valor da hora, horas perdidas, custo de repor contratando ou com hora extra);
- a linha do tempo das etapas (com datas, se a data de publicação da Emenda for informada);
- uma **escala 5x2 sugerida** para 4 semanas, com o rodízio de folgas e o aviso de dias em que faltaria gente;
- botões para **imprimir/salvar em PDF** e **copiar o resumo**.

Os dados digitados **não saem do navegador**.

## Regras usadas (conferidas em 26/10/2026)
PEC 221/2019 aprovada pelo Congresso (Senado em 14/10/2026, 75 a 1). Jornada máxima de 40 h semanais, **dois dias de descanso** por semana (um, preferencialmente, no domingo), **sem redução de salário**. Transição contada da **publicação da Emenda**: **2 meses** depois, 42 h e 2 dias de descanso; **14 meses** depois, 40 h. Na última informação conferida (16/10/2026) faltava a promulgação.

Fica **fora** da conta (aparece como aviso na tela): micro e pequenas empresas e MEI (lei complementar), regras de convenção coletiva, empregados de nível superior com remuneração alta, jornadas especiais, reflexos de hora extra em DSR/férias/13º.

> Confirme sempre no texto oficial da Emenda quando ela for publicada. As regras ficam em `config.js`.

## Como atualizar
Tudo que muda com o tempo está em **`config.js`**:
- `regras.situacao` e `regras.consultadoEm`: a situação da Emenda (promulgada? data?);
- `regras.etapas`: horas e prazos de cada etapa;
- `regras.atencao` e `regras.fontes`;
- `contatoWhatsApp`: WhatsApp do RH, só números com DDI (ex.: `5541999999999`). Vazio = o botão "Falar com o RH" não aparece.

Os cálculos estão em `calc.js` (sem tela) e têm testes.

## Rodar e testar
Abra o `index.html` no navegador (duplo clique), ou:
```bash
python -m http.server 8000   # http://localhost:8000
npm test                     # testes dos cálculos (Node 20+; sem dependências)
```

## Publicar
**GitHub Pages:** no repositório, *Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`*. O arquivo `.nojekyll` já está incluído. (Em repositório privado, o Pages exige plano pago; deixe o repositório público.)

**Vercel:** *Add New → Project*, escolha o repositório, em *Framework Preset* deixe **Other** (sem comando de build e sem pasta de saída) e clique em *Deploy*.

## Como os números são calculados
- **Valor da hora** = salário ÷ (horas semanais × 5): o divisor usual da CLT (220 para 44 h, 200 para 40 h).
- **Repor contratando** = pessoas a mais, arredondadas para cima, para manter o total de horas semanais da equipe, × salário × (1 + encargos).
- **Repor com hora extra** = horas perdidas no mês × valor da hora × (1 + adicional) × (1 + encargos). Estimativa mínima: não inclui reflexos.
- **Equipe mínima 5x2** = menor equipe que mantém as pessoas mínimas por dia em todos os dias em que a empresa abre, conferida simulando 4 semanas de rodízio.
