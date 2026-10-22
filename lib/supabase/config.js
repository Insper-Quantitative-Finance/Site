/**
 * Credenciais PÚBLICAS do Supabase. Este arquivo vai para o navegador.
 *
 * O Supabase renomeou as chaves: a "anon key" (JWT) virou "publishable key"
 * (sb_publishable_…). As duas gerações funcionam nas bibliotecas, então
 * aceitamos os dois nomes — o painel entrega um ou outro dependendo de quando o
 * projeto foi criado.
 *
 * A chave de servidor NÃO mora aqui, e isso é o ponto do arquivo existir
 * separado: lib/supabase/client.js tem 'use client' e importa este módulo, logo
 * tudo que está escrito aqui entra no bundle do navegador. Enquanto o
 * `process.env.SUPABASE_SECRET_KEY` morava neste arquivo, o nome da variável
 * aparecia no JS servido — o valor não, porque o Next só inlina NEXT_PUBLIC_*,
 * mas o nome já revelava que um arquivo de servidor estava sendo importado no
 * cliente. Um `NEXT_PUBLIC_` digitado por engano na frente dele, algum dia,
 * publicaria a chave que ignora RLS. Ver lib/supabase/config-servidor.js.
 *
 * Importante: NEXT_PUBLIC_* é inlinada no BUILD, não lida em runtime. Trocar
 * o valor exige rebuildar; definir depois no painel do Render não basta.
 */

export const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const CHAVE_PUBLICA =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const TEM_CREDENCIAIS_PUBLICAS = Boolean(URL_SUPABASE && CHAVE_PUBLICA);

/**
 * Falha sem dizer na tela o que está faltando.
 *
 * A mensagem antiga nomeava NEXT_PUBLIC_SUPABASE_URL e a chave, e subia inteira
 * até a tela do usuário. Quem precisa do detalhe é quem lê o log do deploy, e é
 * para lá que ele vai; o usuário recebe "não foi possível conectar" por
 * lib/erros.js, que reconhece esta mensagem como falha de conexão.
 */
export function exigirCredenciaisPublicas() {
  if (!TEM_CREDENCIAIS_PUBLICAS) {
    console.error(
      '[config] Supabase não configurado no build: defina NEXT_PUBLIC_SUPABASE_URL e ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou _ANON_KEY) e rode o build de novo.',
    );
    throw new Error('Supabase não configurado.');
  }
  return { url: URL_SUPABASE, chave: CHAVE_PUBLICA };
}
