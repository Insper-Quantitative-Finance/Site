import { redirect } from 'next/navigation';
import { CARGOS, ehGestao } from '@/lib/cargos';
import { exigirUsuario } from '@/lib/auth';
import { criarClienteAdmin, criarClienteServidor } from '@/lib/supabase/server';
import { emailConfigurado } from '@/lib/email';
import Convidados from './Convidados';
import Convites from './Convites';
import GerenciarUsuarios from './GerenciarUsuarios';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Usuários · IQF' };

export default async function PaginaUsuarios() {
  const ator = await exigirUsuario();
  // O layout já exige login; aqui é a barreira de cargo.
  if (!ehGestao(ator.cargo)) redirect('/membros');

  const supabase = criarClienteServidor();
  const { data: usuarios } = await supabase.from('profiles').select('*').order('nome');

  // Convites exigem o client admin: a tabela é invisível para RLS, porque o
  // token nela é o que dá acesso à criação de contas.
  const { data: convites } = await criarClienteAdmin()
    .from('convites')
    .select('*')
    .order('created_at', { ascending: false });

  // Duas naturezas na mesma tabela: com e-mail = convite pessoal de planilha;
  // sem e-mail = link de turma, que qualquer um com a URL usa.
  const convidados = (convites ?? []).filter((c) => c.email);
  const links = (convites ?? []).filter((c) => !c.email);

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
        <h1 style={{ fontSize: 38, lineHeight: 1.1, marginBottom: 0 }}>Usuários</h1>
      </div>

      {!emailConfigurado() && (
        <div className="aviso" style={{ margin: 0, borderColor: 'var(--linha-forte)', color: 'var(--texto-3)' }}>
          O disparo automático está desligado, mas convidar funciona normalmente:{' '}
          <strong>Abrir e-mail</strong> abre o Gmail numa aba nova com a mensagem pronta e já marca o convite como
          enviado — você só confere e aperta Enviar. Para disparar a turma inteira de uma vez, configure{' '}
          <code>GMAIL_USER</code> e <code>GMAIL_APP_PASSWORD</code> no servidor (veja <code>DEPLOY.md</code>).
        </div>
      )}

      <Convidados convidados={convidados} emailPronto={emailConfigurado()} />

      <Convites convites={links} />

      <GerenciarUsuarios usuarios={ordenados} ator={{ id: ator.id, cargo: ator.cargo }} />
    </div>
  );
}
