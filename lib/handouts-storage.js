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
 * Os handouts que o trainee consegue abrir, com a marca de onde vêm.
 *
 * `hospedado: true` → o HTML está no bucket e abre dentro do site.
 * `hospedado: false` → só existe a versão publicada (urlPublica), que abre fora.
 *
 * Handout sem arquivo e sem URL fica de fora: um card que abre em 404 é pior
 * do que não aparecer. Uma listagem da pasta responde por todos — nada de um
 * download por handout só para saber se existe.
 */
export async function handoutsDisponiveis() {
  let nomes = new Set();
  try {
    const admin = criarClienteAdmin();
    const { data, error } = await admin.storage.from(BUCKET).list(PASTA, { limit: 1000 });
    if (!error) nomes = new Set((data ?? []).map((o) => o.name));
  } catch {
    // Sem a service key no ambiente, criarClienteAdmin() lança. Segue com o
    // bucket "vazio": os handouts com urlPublica ainda aparecem, e a página do
    // trainee não cai por causa disso.
  }

  return HANDOUTS.filter((h) => nomes.has(h.arquivo) || h.urlPublica).map((h) => ({
    ...h,
    hospedado: nomes.has(h.arquivo),
  }));
}
