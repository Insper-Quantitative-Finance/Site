import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { usuarioOuNulo } from '@/lib/auth';
import { acharHandout, caminhoHandout } from '@/lib/handouts';

export const dynamic = 'force-dynamic';

/**
 * Entrega o HTML de um handout. É o que o iframe da página do handout carrega.
 *
 * O nome do arquivo vem da lista em lib/handouts.js, nunca da URL: o slug só
 * serve para achar a entrada. Assim não existe caminho para `../`.
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

  let html;
  try {
    html = await readFile(caminhoHandout(handout), 'utf8');
  } catch {
    // O arquivo está listado mas não chegou ao repositório (ou ao deploy).
    // Melhor dizer isso do que devolver uma página branca.
    return NextResponse.json(
      { erro: `O arquivo "${handout.arquivo}" não está em conteudo/handouts/.` },
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
