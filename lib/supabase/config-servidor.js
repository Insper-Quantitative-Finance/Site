import 'server-only';

/**
 * Credencial de SERVIDOR do Supabase. Nunca chega ao navegador.
 *
 * A "service_role" virou "secret key" (sb_secret_…) na renomeação das chaves;
 * aceitamos os dois nomes. Esta chave ignora RLS: com ela em mãos, qualquer
 * pessoa lê e escreve o banco inteiro e usa a Admin API.
 *
 * O `import 'server-only'` no topo é a trava: se um componente client voltar a
 * importar isto (direto, ou por tabela via algum lib/), o BUILD quebra com uma
 * mensagem apontando o arquivo. É a diferença entre descobrir agora e descobrir
 * quando a chave já está num bundle público.
 *
 * Por isso este arquivo é importado por lib/supabase/server.js e por mais nada.
 */

export const CHAVE_SECRETA =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const TEM_CHAVE_SECRETA = Boolean(CHAVE_SECRETA);

/** Igual ao lado público: o nome da variável sai no log, não na tela. */
export function exigirChaveSecreta() {
  if (!CHAVE_SECRETA) {
    console.error(
      '[config] Chave de servidor ausente: defina SUPABASE_SECRET_KEY ' +
        '(ou SUPABASE_SERVICE_ROLE_KEY) no ambiente do servidor.',
    );
    throw new Error('Supabase não configurado.');
  }
  return CHAVE_SECRETA;
}
