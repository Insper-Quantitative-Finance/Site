import { redirect } from 'next/navigation';
import { CARGOS, ehGestao } from '@/lib/cargos';
import { exigirUsuario } from '@/lib/auth';
import { criarClienteServidor } from '@/lib/supabase/server';
import GerenciarUsuarios from './GerenciarUsuarios';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Usuários · IQF' };

export default async function PaginaUsuarios() {
  const ator = await exigirUsuario();
  // O layout já exige login; aqui é a barreira de cargo.
  if (!ehGestao(ator.cargo)) redirect('/membros');

  const supabase = criarClienteServidor();
  const { data: usuarios } = await supabase.from('profiles').select('*').order('nome');

  const ordenados = [...(usuarios ?? [])].sort(
    (a, b) =>
      Number(b.ativo) - Number(a.ativo) ||
      (CARGOS[b.cargo]?.nivel ?? 0) - (CARGOS[a.cargo]?.nivel ?? 0) ||
      a.nome.localeCompare(b.nome),
  );

  return (
    <div style={{ display: 'grid', gap: 40 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Gestão</div>
        <h1 style={{ fontSize: 38, lineHeight: 1.1, marginBottom: 12 }}>Usuários</h1>
        <p className="p-corpo" style={{ maxWidth: '62ch', margin: 0 }}>
          Cadastre novos membros, ajuste cargos e desative quem saiu da liga. Senhas não aparecem aqui e não podem ser
          editadas por ninguém além do próprio dono da conta — quando alguém esquecer a senha, envie o link de
          redefinição.
        </p>
      </div>

      <GerenciarUsuarios usuarios={ordenados} ator={{ id: ator.id, cargo: ator.cargo }} />
    </div>
  );
}
