/**
 * Resolve as credenciais do Supabase em um lugar só.
 *
 * O Supabase renomeou as chaves: a "anon key" (JWT) virou "publishable key"
 * (sb_publishable_…) e a "service_role" virou "secret key" (sb_secret_…).
 * As duas gerações funcionam nas bibliotecas, então aceitamos os dois nomes —
 * o painel entrega um ou outro dependendo de quando o projeto foi criado.
 *
 * Importante: NEXT_PUBLIC_* é inlinada no BUILD, não lida em runtime. Trocar
 * o valor exige rebuildar; definir depois no painel do Render não basta.
 */

export const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const CHAVE_PUBLICA =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Chave de servidor: ignora RLS. Nunca importe isto em componente client. */
export const CHAVE_SECRETA =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Falha com uma mensagem que diz o que fazer, em vez de um erro de rede opaco. */
export function exigirCredenciaisPublicas() {
  if (!URL_SUPABASE || !CHAVE_PUBLICA) {
    throw new Error(
      'Supabase não configurado no build: defina NEXT_PUBLIC_SUPABASE_URL e ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou _ANON_KEY) e rode o build de novo.',
    );
  }
  return { url: URL_SUPABASE, chave: CHAVE_PUBLICA };
}
