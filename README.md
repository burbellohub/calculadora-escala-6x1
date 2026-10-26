# Conferência da escala semanal (42 h e 2 DSR)

Página única em **HTML, CSS e JavaScript puros** (sem instalar nada, sem servidor, sem banco). Só horas: **não há salário, valores em dinheiro nem porcentagens**.

## Como funciona
1. A pessoa informa a escala que a empresa usa hoje, **dia a dia** (segunda a domingo): cada dia é **Trabalha** (com as horas) ou **DSR** (descanso semanal remunerado).
2. O sistema soma o **total semanal** e confere:
   - exatamente **2 dias de DSR** (mais ou menos que isso é erro);
   - cada dia trabalhado com horas informadas, de até 10 h;
   - total de até **42 h** por semana. Se passar, mostra um aviso com quantas horas faltam reduzir e deixa **editar qualquer dia** da semana;
   - se o domingo não for DSR, lembra que um dos DSR deve ser, preferencialmente, no domingo.
3. Só com a escala dentro das regras o botão **Continuar** libera a tela final, com a escala conferida e o botão de **imprimir ou salvar em PDF**.

As horas aceitam `8`, `8,5`, `8:30` e `8h30`. Os dados **não saem do navegador**.

## Arquivos
- `escala.js`: as regras (sem tela), testadas em `tests/escala.test.js`. Limites no topo do arquivo: 42 h por semana, 10 h por dia, 2 DSR.
- `app.js`, `index.html`, `style.css`: a tela.

## Rodar e testar
Abra o `index.html` no navegador (duplo clique), ou:
```bash
python -m http.server 8000   # http://localhost:8000
npm test                     # testes das regras (Node 20+; sem dependências)
```

## Publicar
**GitHub Pages:** *Settings → Pages → Deploy from a branch → `main` / `(root)`*. O `.nojekyll` já está incluído. (Repositório público.)
**Vercel:** *Add New → Project*, *Framework Preset* **Other**, sem build, *Deploy*.

> Apoio ao planejamento; confirme sempre no texto oficial da Emenda e na convenção coletiva da categoria.
