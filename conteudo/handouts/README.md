# Handouts do trainee

Um arquivo HTML autocontido por handout — todo o CSS e JS inline, sem CDN.
São servidos por `/api/handouts/[slug]`, que exige sessão, e exibidos em
`/membros/trainee/handout/[slug]`.

## Publicar um handout

1. Salve o HTML aqui com o nome que está em `lib/handouts.js`
   (no artifact do Claude: **Ctrl+S** → "Página da Web, somente HTML", ou copie
   o código da aba de código).
2. Confira/acrescente a entrada em `lib/handouts.js` — `slug`, `numero`,
   `titulo`, `descricao`, `arquivo`. A ordem da lista é a ordem que o trainee vê.
3. `npm run dev` e abra `/membros/trainee`.

Arquivos esperados hoje:

| Arquivo | Handout |
| --- | --- |
| `limpeza-dos-dados.html` | 2 — Limpeza dos dados |
| `programacao-do-backtest.html` | 3 — Programação do backtest |

Nada de banco de dados: o material é versionado junto com o site. PDFs e links
soltos continuam indo para **Materiais** com a categoria `Trainee` — eles
aparecem em "Material complementar", abaixo dos handouts.
