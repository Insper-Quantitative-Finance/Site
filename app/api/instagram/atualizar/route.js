import { NextResponse } from 'next/server';
import { buscarPostsInstagram, renovarTokenInstagram } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

/**
 * Atualiza o cache do Instagram e, opcionalmente, renova o token.
 * Feito para ser chamado por um cron job do Render (Cron Job gratuito ou
 * qualquer agendador externo), protegido por CRON_SECRET.
 *
 *   GET /api/instagram/atualizar?renovar=1
 *   Authorization: Bearer $CRON_SECRET
 */
export async function GET(request) {
  const segredo = process.env.CRON_SECRET;
  const enviado = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!segredo || enviado !== segredo) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  }

  const resultado = await buscarPostsInstagram({ limite: 12, forcar: true });

  let token = null;
  if (request.nextUrl.searchParams.get('renovar') === '1') {
    try {
      const novo = await renovarTokenInstagram();
      // Só o prefixo vai na resposta: o token inteiro em log é vazamento.
      token = {
        prefixo: `${novo.token.slice(0, 12)}…`,
        expira_em_dias: Math.round(novo.expira_em_segundos / 86400),
        aviso: 'Copie o token completo do painel da Meta para INSTAGRAM_ACCESS_TOKEN no Render.',
      };
    } catch (e) {
      token = { erro: e.message };
    }
  }

  return NextResponse.json({
    posts: resultado.posts.length,
    origem: resultado.origem,
    erro: resultado.erro ?? null,
    token,
  });
}
