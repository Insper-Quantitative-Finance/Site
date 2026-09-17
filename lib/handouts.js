import { access } from 'node:fs/promises';
import path from 'node:path';

/**
 * Handouts do programa de trainee que moram no próprio repositório.
 *
 * São páginas HTML autocontidas (texto, exercícios e o que rodar no navegador).
 * Ficam em `conteudo/handouts/` — fora de `public/`, de propósito: em `public/`
 * o arquivo seria servido a qualquer um que adivinhasse a URL. Aqui só sai pela
 * rota /api/handouts/[slug], que exige sessão.
 *
 * Para publicar um handout novo: salve o HTML em conteudo/handouts/ e acrescente
 * uma entrada nesta lista. Nada de banco — o material do trainee é versionado
 * junto com o site.
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

export function acharHandout(slug) {
  return HANDOUTS.find((h) => h.slug === slug) ?? null;
}

export function caminhoHandout(handout) {
  return path.join(process.cwd(), 'conteudo', 'handouts', handout.arquivo);
}

/**
 * Os handouts cujo HTML realmente está no repositório.
 *
 * A lista acima é a intenção; esta função é o que existe. Um handout anunciado
 * na página e sem arquivo seria um card que abre em 404 — pior do que não
 * aparecer. Então a página do trainee só mostra o que dá para fazer.
 */
export async function handoutsDisponiveis() {
  const existe = await Promise.all(
    HANDOUTS.map((h) =>
      access(caminhoHandout(h)).then(
        () => true,
        () => false,
      ),
    ),
  );
  return HANDOUTS.filter((_, i) => existe[i]);
}
