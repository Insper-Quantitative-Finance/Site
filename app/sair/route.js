import { NextResponse } from 'next/server';
import { criarClienteServidor } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Encerra a sessão e devolve ao login.
 *
 * Existe como Route Handler porque só aqui dá para escrever cookies — em
 * Server Component a escrita é ignorada. É esse encerramento que impede o
 * laço /membros → /login → /membros quando o cookie é válido mas o perfil
 * não serve (conta órfã ou desativada).
 */
export async function GET(request) {
  const supabase = criarClienteServidor();

  try {
    await supabase.auth.signOut();
  } catch {
    // Supabase fora do ar não pode impedir o logout local; os cookies
    // expirados são limpos abaixo de qualquer jeito.
  }

  const destino = request.nextUrl.clone();
  destino.pathname = '/login';
  destino.search = '';

  const motivo = request.nextUrl.searchParams.get('motivo');
  if (motivo) destino.searchParams.set('motivo', motivo);

  const resposta = NextResponse.redirect(destino);

  // Garante a limpeza mesmo se o signOut acima falhou: sem isso o middleware
  // ainda veria uma sessão e devolveria o usuário para /membros.
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith('sb-')) resposta.cookies.delete(c.name);
  }

  return resposta;
}
