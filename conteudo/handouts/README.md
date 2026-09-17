# Handouts do trainee

Um arquivo HTML autocontido por handout — todo o CSS e JS inline, sem CDN.

**O HTML não entra no repositório.** Este repositório é público (exigência do
plano Hobby da Vercel, ver `DEPLOY.md`), e o material da aula sairia junto. O
arquivo vive no bucket privado `materiais`, sob `handouts/`, e só sai pela rota
`/api/handouts/[slug]`, que exige sessão. Esta pasta é só a área de trabalho
local: o `.gitignore` barra os `.html` daqui.

## Publicar um handout

1. Salve o HTML aqui (no artifact do Claude: **Ctrl+S** → "Página da Web,
   somente HTML", ou copie o código da aba de código).
2. Confira/acrescente a entrada em `lib/handouts.js` — `slug`, `numero`,
   `titulo`, `descricao`, `arquivo`. A ordem da lista é a ordem que o trainee vê.
3. Suba para o bucket:

   ```
   node --env-file=.env.local scripts/subir-handout.mjs limpeza-dos-dados conteudo/handouts/limpeza-dos-dados.html
   ```

4. Abra `/membros/trainee`. Não precisa de deploy: o handout vem do bucket em
   tempo de request. Rodar o script de novo com o mesmo slug substitui a versão
   no ar — é assim que se corrige um handout entre uma turma e outra.

Arquivos esperados hoje:

| Arquivo | Handout |
| --- | --- |
| `limpeza-dos-dados.html` | 2 — Limpeza dos dados |
| `programacao-do-backtest.html` | 3 — Programação do backtest |

A página do trainee lista só os handouts que estão no bucket: um card anunciado
sem arquivo abriria em 404.

PDFs e links soltos continuam indo para **Materiais** com a categoria `Trainee`
— aparecem em "Material complementar", abaixo dos handouts.
