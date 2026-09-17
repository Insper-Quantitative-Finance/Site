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
 *
 * `urlPublica` é a ponte enquanto o arquivo não está no bucket: o card abre a
 * versão publicada do artifact, fora do site. É pior (sai da área de membros e
 * qualquer um com o link vê), mas põe a aula na mão do trainee hoje. Assim que
 * o HTML é subido, o bucket ganha: o card volta a abrir aqui dentro, e a linha
 * `urlPublica` pode sair.
 */
export const HANDOUTS = [
  {
    slug: 'limpeza-dos-dados',
    numero: 2,
    titulo: 'Limpeza dos dados',
    descricao:
      'Tratar a série antes de qualquer teste: faltantes, outliers, ajustes e as armadilhas que viram retorno fantasma.',
    arquivo: 'limpeza-dos-dados.html',
    urlPublica: 'https://claude.site/artifacts/SY3kouQbXRP42fssL3zeUd',
  },
  {
    slug: 'programacao-do-backtest',
    numero: 3,
    titulo: 'Programação do backtest',
    descricao:
      'Montar o backtest do zero: estrutura do loop, execução, custos e como não olhar o futuro sem perceber.',
    arquivo: 'programacao-do-backtest.html',
    urlPublica: 'https://claude.site/artifacts/TYdxDgHb56HLLf87q9wTXS',
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

/**
 * O handout já abriu para a turma?
 *
 * Sem data marcada está liberado — a data é uma tranca que a gestão escolhe
 * pôr, não um passo obrigatório para o handout existir. A comparação é em
 * instante absoluto (timestamptz), então o fuso do trainee não muda a resposta.
 */
export function estaLiberado(liberadoEm, agora = new Date()) {
  if (!liberadoEm) return true;
  const quando = new Date(liberadoEm);
  if (Number.isNaN(quando.getTime())) return true;
  return quando <= agora;
}

/**
 * O que o `datetime-local` manda ('2026-03-14T19:00') não tem fuso, e o
 * Postgres leria como UTC — a aula das 19h viraria 16h para o trainee. A gestão
 * pensa em horário de Brasília, então é ele que fixamos.
 *
 * -03:00 fixo: o Brasil não tem mais horário de verão desde 2019. Se voltar,
 * é aqui que se mexe.
 */
export const FUSO_LIGA = '-03:00';

export function comoInstante(local) {
  if (!local) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  return `${local}:00${FUSO_LIGA}`;
}

/** "14 mar 2026, 19:00" — sempre no fuso da liga, não no de quem lê. */
export function formatarLiberacao(instante) {
  if (!instante) return null;
  const d = new Date(instante);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** O caminho de volta: instante do banco → valor para o input da gestão. */
export function comoLocal(instante) {
  if (!instante) return '';
  const d = new Date(instante);
  if (Number.isNaN(d.getTime())) return '';
  // Reposiciona para o fuso da liga antes de cortar, senão o input mostraria
  // o horário do servidor (UTC na Vercel).
  const deslocado = new Date(d.getTime() - 3 * 3600000);
  return deslocado.toISOString().slice(0, 16);
}

// O acesso ao bucket fica em lib/handouts-storage.js. Este arquivo é só dados,
// sem import nenhum, para que scripts/subir-handout.mjs possa carregá-lo com
// node puro — fora do Next não existe `next/headers` nem o alias `@/`.
