# Handouts do trainee

Um arquivo HTML autocontido por handout — todo o CSS e JS inline, sem CDN.

**O HTML não entra no repositório.** Este repositório é público (exigência do
plano Hobby da Vercel, ver `DEPLOY.md`), e o material da aula sairia junto. O
arquivo vive no bucket privado `materiais`, sob `handouts/`, e só sai pela rota
`/api/handouts/[slug]`, que exige sessão. Esta pasta é só a área de trabalho
local: o `.gitignore` barra os `.html` daqui.

## Como o handout é montado

O conteúdo fica em `_corpo-<n>.html` — só o corpo, sem `<html>` nem `<style>`.
O estilo fica em `estilo.mjs` e o script em `_montar.mjs`, num lugar só, para
os handouts não divergirem de visual conforme forem saindo:

```
node conteudo/handouts/_montar.mjs 2
```

Isso gera o arquivo autocontido que vai para o bucket. Os corpos e o HTML
montado não entram no repositório (o `.gitignore` barra `*.html` aqui); o que
fica versionado é a ferramenta.

### Mexer no CSS não exige subir handout de novo

O estilo é `estilo.mjs` — um módulo que exporta o CSS como string, e não um
`.css`, porque a página do site precisa dele como texto para injetar. Quem
importa são dois: o `_montar.mjs`, para o arquivo avulso abrir sozinho, e a
página `app/membros/trainee/handout/[slug]/page.js`.

A página usa **só** este módulo e ignora o `<style>` que vem dentro do arquivo
baixado do bucket. Isso é de propósito: aquele `<style>` é uma fotografia do CSS
do dia do upload, e enquanto a página o usava, corrigir o estilo aqui não mudava
nada no ar até alguém remontar e subir cada handout de novo — foi assim que os
handouts seguiram vazando da tela no celular com o conserto já comitado.

Então: conserto de CSS vale com um deploy. Remontar e subir só é necessário
quando muda o **conteúdo** (`_corpo-<n>.html`).

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
