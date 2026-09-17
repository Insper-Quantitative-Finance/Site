// Só servidor: usa a service_role. Nunca importe isto em componente client.
import { criarClienteAdmin } from '@/lib/supabase/server';
import { BUCKET, HANDOUTS, PASTA, caminhoStorage, estaLiberado } from '@/lib/handouts';

/** O HTML do handout, ou null se ainda não foi subido. */
export async function baixarHandout(handout) {
  const admin = criarClienteAdmin();
  const { data, error } = await admin.storage.from(BUCKET).download(caminhoStorage(handout));
  if (error || !data) return null;
  return data.text();
}

/**
 * Todo o catálogo, anotado com o estado de cada handout:
 *
 *   hospedado   → o HTML está no bucket e abre dentro do site
 *   liberadoEm  → quando abre para a turma (null = sem tranca)
 *   liberado    → já abriu
 *   abrivel     → há algo para abrir (bucket ou versão publicada)
 *
 * Duas consultas para o catálogo inteiro: uma listagem da pasta e uma leitura
 * da tabela. Nada de uma ida ao banco por handout.
 */
export async function listarHandouts() {
  const admin = criarClienteAdmin();
  const agora = new Date();

  const [arquivos, liberacoes] = await Promise.all([
    admin.storage
      .from(BUCKET)
      .list(PASTA, { limit: 1000 })
      .then(({ data, error }) => (error ? [] : data ?? []))
      .catch(() => []),
    admin
      .from('handouts')
      .select('slug, liberado_em')
      .then(({ data, error }) => (error ? [] : data ?? []))
      .catch(() => []),
  ]);

  const nomes = new Set(arquivos.map((o) => o.name));
  const datas = new Map(liberacoes.map((l) => [l.slug, l.liberado_em]));

  return HANDOUTS.map((h) => {
    const hospedado = nomes.has(h.arquivo);
    const liberadoEm = datas.get(h.slug) ?? null;
    return {
      ...h,
      hospedado,
      liberadoEm,
      liberado: estaLiberado(liberadoEm, agora),
      abrivel: hospedado || Boolean(h.urlPublica),
    };
  });
}

/**
 * O que ESTE usuário pode ver na página do trainee.
 *
 * Gestão vê o catálogo inteiro — inclusive o que ainda não abriu e o que não
 * tem arquivo — porque é quem precisa conferir e marcar as datas. Para os
 * demais, handout trancado ou sem nada para abrir simplesmente não existe:
 * anunciar um card que não abre é pior do que não mostrar.
 */
export async function handoutsVisiveis(gestao) {
  const todos = await listarHandouts();
  return gestao ? todos : todos.filter((h) => h.liberado && h.abrivel);
}

/** A trava das rotas de conteúdo: o usuário pode abrir este handout agora? */
export async function podeAbrirHandout(handout, usuario, gestao) {
  if (gestao) return true;
  if (!usuario) return false;
  const todos = await listarHandouts();
  const atual = todos.find((h) => h.slug === handout.slug);
  return Boolean(atual?.liberado);
}
