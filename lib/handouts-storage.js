// Só servidor: usa a service_role. Nunca importe isto em componente client.
import { criarClienteAdmin } from '@/lib/supabase/server';
import { BUCKET, HANDOUTS, PASTA, caminhoStorage } from '@/lib/handouts';

/** O HTML do handout, ou null se ainda não foi subido. */
export async function baixarHandout(handout) {
  const admin = criarClienteAdmin();
  const { data, error } = await admin.storage.from(BUCKET).download(caminhoStorage(handout));
  if (error || !data) return null;
  return data.text();
}

/**
 * Os handouts cujo arquivo realmente está no bucket.
 *
 * Um handout anunciado na página e sem arquivo seria um card que abre em 404 —
 * pior do que não aparecer. Então a página do trainee só mostra o que dá para
 * fazer. Uma listagem da pasta responde por todos: nada de um download por
 * handout só para saber se existe.
 */
export async function handoutsDisponiveis() {
  try {
    const admin = criarClienteAdmin();
    const { data, error } = await admin.storage.from(BUCKET).list(PASTA, { limit: 1000 });
    if (error) return [];
    const nomes = new Set((data ?? []).map((o) => o.name));
    return HANDOUTS.filter((h) => nomes.has(h.arquivo));
  } catch {
    // Sem a service key no ambiente, criarClienteAdmin() lança. A página do
    // trainee ainda tem entregas para mostrar; não vale derrubá-la por isso.
    return [];
  }
}
