/**
 * Monta o HTML de um handout a partir de um corpo e do estilo comum.
 *
 *   node conteudo/handouts/_montar.mjs 2
 *
 * Lê `_corpo-<n>.html` (só o conteúdo, sem <html> nem <style>) e escreve o
 * arquivo que vai para o bucket. O estilo e o script ficam num lugar só, para
 * os handouts não divergirem de visual conforme forem saindo.
 *
 * O arquivo tem dois usos, e é por isso que ele carrega os marcadores
 * ESTILO/CORPO: aberto sozinho é uma página completa; dentro da área de
 * membros, o servidor corta pelos marcadores e injeta estilo e corpo na
 * própria página do site — sem iframe. Ver lib/handouts-storage.js.
 *
 * O corpo e o HTML montado não entram no repositório (o .gitignore barra
 * *.html aqui): este repositório é público. O que fica versionado é a
 * ferramenta — este arquivo e o _estilo.css.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

const ALVOS = {
  2: { arquivo: 'limpeza-dos-dados.html', titulo: 'Handout 2 — Limpeza dos dados' },
  3: { arquivo: 'programacao-do-backtest.html', titulo: 'Handout 3 — Programação do backtest' },
};

const n = process.argv[2];
const alvo = ALVOS[n];
if (!alvo) {
  console.error(`Uso: node conteudo/handouts/_montar.mjs <${Object.keys(ALVOS).join('|')}>`);
  process.exit(1);
}

const [estilo, corpo] = await Promise.all([
  readFile(path.join(AQUI, '_estilo.css'), 'utf8'),
  readFile(path.join(AQUI, `_corpo-${n}.html`), 'utf8'),
]);

// Só para o arquivo aberto sozinho: dentro do site, o fundo e a fonte são os
// da área de membros, e estas regras não são injetadas.
const estiloAvulso = `
html { background: #0B0B0C; }
body {
  margin: 0; background: #0B0B0C;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.handout { padding: 56px 24px 96px; }
@media (max-width: 560px) { .handout { padding: 36px 18px 72px; } }
`.trim();

// Também só para o arquivo avulso. Na área de membros, o mesmo comportamento
// vem de um componente client (ComportamentoHandout), porque script injetado
// por innerHTML não executa.
const script = `
(function () {
  function pronto(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  pronto(function () {
    var folha = document.querySelector('.handout');
    if (!folha) return;

    try {
      if (localStorage.getItem('iqf-tema') === 'claro') folha.setAttribute('data-tema', 'claro');
    } catch (e) {}

    var botao = folha.querySelector('.alternar-tema');
    if (botao) {
      var rotulo = function () {
        botao.textContent = folha.getAttribute('data-tema') === 'claro' ? 'tema escuro' : 'tema claro';
      };
      rotulo();
      botao.addEventListener('click', function () {
        var claro = folha.getAttribute('data-tema') === 'claro';
        if (claro) folha.removeAttribute('data-tema');
        else folha.setAttribute('data-tema', 'claro');
        try { localStorage.setItem('iqf-tema', claro ? 'escuro' : 'claro'); } catch (e) {}
        rotulo();
      });
    }

    // Copiar: o trainee vai rodar esses blocos no notebook, e código técnico
    // redigitado à mão erra em espaço e acento.
    folha.querySelectorAll('.bloco:not(.saida) .copiar').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var codigo = botao.closest('.bloco').querySelector('pre').textContent;
        navigator.clipboard.writeText(codigo).then(function () {
          botao.textContent = 'copiado';
          setTimeout(function () { botao.textContent = 'copiar'; }, 1600);
        }, function () {
          botao.textContent = 'falhou';
          setTimeout(function () { botao.textContent = 'copiar'; }, 1600);
        });
      });
    });
  });
})();
`.trim();

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${alvo.titulo}</title>
<style>
${estiloAvulso}
</style>
<style>
/* ESTILO:INICIO */
${estilo.trim()}
/* ESTILO:FIM */
</style>
<script>
${script}
</script>
</head>
<body>
<!-- CORPO:INICIO -->
${corpo.trim()}
<!-- CORPO:FIM -->
</body>
</html>
`;

const destino = path.join(AQUI, alvo.arquivo);
await writeFile(destino, html, 'utf8');
console.log(`${alvo.arquivo} — ${Math.round(Buffer.byteLength(html, 'utf8') / 1024)} KB`);
