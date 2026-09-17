/**
 * Monta o HTML final de um handout a partir de um corpo e do estilo comum.
 *
 *   node conteudo/handouts/_montar.mjs 2
 *
 * Lê `_corpo-<n>.html` (só o conteúdo, sem <html> nem <style>) e escreve o
 * arquivo autocontido que vai para o bucket. O estilo e o script ficam num
 * lugar só, para os handouts não divergirem de visual conforme forem saindo.
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

// Tema: aplicado antes da pintura para não piscar branco no escuro. O handout
// abre em iframe com allow-same-origin, então o localStorage funciona e a
// escolha do trainee sobrevive entre um handout e outro.
const script = `
(function () {
  var html = document.documentElement;
  try {
    if (localStorage.getItem('iqf-tema') === 'claro') html.setAttribute('data-tema', 'claro');
  } catch (e) {}

  document.addEventListener('DOMContentLoaded', function () {
    var botao = document.getElementById('tema');
    function rotulo() {
      botao.textContent = html.getAttribute('data-tema') === 'claro' ? 'tema escuro' : 'tema claro';
    }
    rotulo();
    botao.addEventListener('click', function () {
      var claro = html.getAttribute('data-tema') === 'claro';
      if (claro) html.removeAttribute('data-tema');
      else html.setAttribute('data-tema', 'claro');
      try { localStorage.setItem('iqf-tema', claro ? 'escuro' : 'claro'); } catch (e) {}
      rotulo();
    });

    // Copiar: o trainee vai rodar esses blocos no notebook, e código técnico
    // redigitado à mão erra em espaço e acento.
    document.querySelectorAll('.bloco:not(.saida)').forEach(function (bloco) {
      var botao = bloco.querySelector('.copiar');
      if (!botao) return;
      botao.addEventListener('click', function () {
        var codigo = bloco.querySelector('pre').textContent;
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
${estilo.trim()}
</style>
<script>
${script}
</script>
</head>
<body>
${corpo.trim()}
</body>
</html>
`;

const destino = path.join(AQUI, alvo.arquivo);
await writeFile(destino, html, 'utf8');
console.log(`${alvo.arquivo} — ${Math.round(Buffer.byteLength(html, 'utf8') / 1024)} KB`);
