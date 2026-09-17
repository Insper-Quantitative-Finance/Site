import { NextResponse } from 'next/server';
import { usuarioOuNulo } from '@/lib/auth';
import { acharHandout } from '@/lib/handouts';
import { baixarHandout } from '@/lib/handouts-storage';

export const dynamic = 'force-dynamic';

/**
 * Entrega o HTML de um handout. É o que o iframe da página do handout carrega.
 *
 * O arquivo vem do bucket privado, sempre por aqui: diferente dos materiais,
 * não redirecionamos para uma URL assinada — o handout é uma página que o
 * navegador vai renderizar, e servi-la do domínio do Supabase a tiraria do
 * site. O caminho vem da lista em lib/handouts.js, nunca da URL, então não
 * existe caminho para `../`.
 */
export async function GET(_request, { params }) {
  const usuario = await usuarioOuNulo();
  if (!usuario) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  const handout = acharHandout(params.slug);
  if (!handout) {
    return NextResponse.json({ erro: 'Handout não encontrado.' }, { status: 404 });
  }

  const html = await baixarHandout(handout);
  if (html === null) {
    // Está na lista mas não no bucket. Melhor dizer isso do que devolver
    // uma página branca.
    return NextResponse.json(
      { erro: `O arquivo "${handout.arquivo}" ainda não foi subido para o bucket.` },
      { status: 404 },
    );
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Material de estudo muda de uma aula para a outra; nada de cache de CDN.
      'Cache-Control': 'private, no-store',
    },
  });
}
