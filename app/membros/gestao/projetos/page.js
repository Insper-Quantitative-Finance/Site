import { redirect } from 'next/navigation';
import { ehGestao } from '@/lib/cargos';
import { exigirUsuario } from '@/lib/auth';
import { criarClienteServidor } from '@/lib/supabase/server';
import GerenciarProjetos from './GerenciarProjetos';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Projetos do site · IQF' };

export default async function PaginaProjetos() {
  const ator = await exigirUsuario();
  if (!ehGestao(ator.cargo)) redirect('/membros');

  const supabase = criarClienteServidor();
  const { data: projetos } = await supabase
    .from('projetos')
    .select('*')
    .order('destaque', { ascending: false })
    .order('ordem')
    .order('created_at', { ascending: false });

  return (
    <div style={{ display: 'grid', gap: 40 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Gestão</div>
        <h1 style={{ fontSize: 38, lineHeight: 1.1, marginBottom: 12 }}>Projetos do site</h1>
        <p className="p-corpo" style={{ maxWidth: '62ch', margin: 0 }}>
          Controla a seção “O que a liga produz” da landing. Os marcados como <strong>destaque</strong> aparecem de
          imediato; o resto fica atrás do botão “Carregar mais”. Despublicar tira do site sem apagar o registro.
        </p>
      </div>

      <GerenciarProjetos projetos={projetos ?? []} />
    </div>
  );
}
