# Handouts do trainee

Um arquivo HTML autocontido por handout — todo o CSS e JS inline, sem CDN.

**O HTML não entra no repositório.** Este repositório é público (exigência do
plano Hobby da Vercel, ver `DEPLOY.md`), e o material da aula sairia junto. O
arquivo vive no bucket privado `materiais`, sob `handouts/`, e só sai pela rota
`/api/handouts/[slug]`, que exige sessão. Esta pasta é só a área de trabalho
local: o `.gitignore` barra os `.html` daqui.

## Como o handout é montado

O conteúdo fica em `_corpo-<n>.html` — só o corpo, sem `<html>` nem `<style>`.
O estilo e o script (tema claro/escuro, botão de copiar código) ficam em
`_estilo.css` e em `_montar.mjs`, num lugar só, para os handouts não
divergirem de visual conforme forem saindo:

```
node conteudo/handouts/_montar.mjs 2
```

Isso gera o arquivo autocontido que vai para o bucket. Os corpos e o HTML
montado não entram no repositório (o `.gitignore` barra `*.html` aqui); o que
fica versionado é a ferramenta.

Convenções do corpo: `.bloco` para código com `<header>` de rótulo,
`.bloco.saida` para saída do Python, `.bloco.errado` para o código que o
handout mostra como armadilha, `.caixa.guarde` e `.caixa.checkpoint` para as
caixas, e `<details><summary>Gabarito</summary>` dentro do checkpoint.

## Publicar um handout

1. Escreva o corpo em `_corpo-<n>.html` e rode o `_montar.mjs`.
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
