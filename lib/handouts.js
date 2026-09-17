/**
 * Handouts do programa de trainee.
 *
 * São páginas HTML autocontidas (texto, exercícios e o que rodar no navegador).
 * O arquivo NÃO fica no repositório — este repositório é público, e o material
 * da aula sairia junto. Fica no bucket privado `materiais`, sob `handouts/`,
 * e só sai pela rota /api/handouts/[slug], que exige sessão.
 *
 * Para publicar um handout novo: acrescente a entrada nesta lista e suba o
 * arquivo com `node --env-file=.env.local scripts/subir-handout.mjs <slug> <arquivo.html>`.
 * Esta lista é a intenção; o bucket é o que existe — handoutsDisponiveis()
 * cruza as duas coisas.
 */
export const HANDOUTS = [
  {
    slug: 'limpeza-dos-dados',
    numero: 2,
    titulo: 'Limpeza dos dados',
    descricao:
      'Tratar a série antes de qualquer teste: faltantes, outliers, ajustes e as armadilhas que viram retorno fantasma.',
    arquivo: 'limpeza-dos-dados.html',
  },
  {
    slug: 'programacao-do-backtest',
    numero: 3,
    titulo: 'Programação do backtest',
    descricao:
      'Montar o backtest do zero: estrutura do loop, execução, custos e como não olhar o futuro sem perceber.',
    arquivo: 'programacao-do-backtest.html',
  },
];

export const BUCKET = 'materiais';
export const PASTA = 'handouts';

export function acharHandout(slug) {
  return HANDOUTS.find((h) => h.slug === slug) ?? null;
}

export function caminhoStorage(handout) {
  return `${PASTA}/${handout.arquivo}`;
}

// O acesso ao bucket fica em lib/handouts-storage.js. Este arquivo é só dados,
// sem import nenhum, para que scripts/subir-handout.mjs possa carregá-lo com
// node puro — fora do Next não existe `next/headers` nem o alias `@/`.
