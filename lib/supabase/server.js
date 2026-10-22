import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { CHAVE_PUBLICA, URL_SUPABASE } from './config';
import { exigirChaveSecreta } from './config-servidor';

/** Client ligado à sessão do usuário (respeita RLS). Use em Server Components e actions. */
export function criarClienteServidor() {
  const cookieStore = cookies();
  return createServerClient(
    URL_SUPABASE,
    CHAVE_PUBLICA,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(items) {
          // Em Server Components a escrita de cookie lança; o middleware já
          // cuida do refresh de sessão, então ignorar aqui é seguro.
          try {
            items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}

/**
 * Client anônimo, sem sessão e sem ler cookies — usar em páginas que devem
 * continuar estáticas (a landing). Enxerga só o que o RLS libera para `anon`,
 * que é exatamente o conteúdo público.
 */
export function criarClienteEstatico() {
  return createSupabaseClient(
    URL_SUPABASE,
    CHAVE_PUBLICA,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Client administrativo (service_role): ignora RLS e acessa a Admin API.
 * NUNCA importe isto em um componente client — a chave daria acesso total ao banco.
 */
export function criarClienteAdmin() {
  // exigirChaveSecreta() põe o nome da variável no log e lança uma mensagem
  // curta, que lib/erros.js traduz para "não foi possível conectar". Antes a
  // instrução de configurar o ambiente subia inteira até a tela.
  return createSupabaseClient(URL_SUPABASE, exigirChaveSecreta(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
