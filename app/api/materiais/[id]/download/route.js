import { NextResponse } from 'next/server';
import { usuarioOuNulo } from '@/lib/auth';
import { criarClienteAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Entrega um material que está no Storage.
 * O bucket é privado: geramos uma URL assinada de vida curta e redirecionamos,
 * então o link nunca fica válido para quem não passou pela autenticação.
 */
export async function GET(_request, { params }) {
  const usuario = await usuarioOuNulo();
  if (!usuario) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  const admin = criarClienteAdmin();
  const { data: material } = await admin
    .from('materiais')
    .select('arquivo_path, arquivo_nome, tipo, url')
    .eq('id', params.id)
    .single();

  if (!material) {
    return NextResponse.json({ erro: 'Material não encontrado.' }, { status: 404 });
  }

  if (material.tipo === 'link') {
    return NextResponse.redirect(material.url);
  }

  const { data, error } = await admin.storage
    .from('materiais')
    .createSignedUrl(material.arquivo_path, 60, { download: material.arquivo_nome || true });

  if (error) {
    return NextResponse.json({ erro: `Não foi possível gerar o link: ${error.message}` }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
