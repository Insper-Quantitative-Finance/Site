import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { CHAVE_PUBLICA, URL_SUPABASE } from '@/lib/supabase/config';

// Renova a sessão a cada request e barra /membros para quem não está logado.
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    URL_SUPABASE,
    CHAVE_PUBLICA,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(items) {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() faz uma chamada de rede ao Supabase. Sem teto de tempo, um
  // projeto pausado ou uma rede ruim penduram TODA navegação para /membros —
  // a tela fica presa em "Entrando…" sem nunca resolver nem falhar.
  // Se não der para verificar a tempo, deixamos passar: o layout refaz a
  // checagem no servidor e mostra um erro legível em vez de travar.
  let user = null;
  let indeterminado = false;
  try {
    const resultado = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error('timeout')), 5000)),
    ]);
    user = resultado?.data?.user ?? null;
  } catch {
    indeterminado = true;
  }

  const { pathname } = request.nextUrl;

  if (indeterminado) return response;

  if (!user && pathname.startsWith('/membros')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('destino', pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/membros';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/membros/:path*', '/login'],
};
