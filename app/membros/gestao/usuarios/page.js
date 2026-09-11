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
        <h1 style={{ fontSize: 38, lineHeight: 1.1, marginBottom: 12 }}>Usuários</h1>
        <p className="p-corpo" style={{ maxWidth: '62ch', margin: 0 }}>
          Cadastre novos membros, ajuste cargos e desative quem saiu da liga. Senhas não aparecem aqui e não podem ser
          editadas por ninguém além do próprio dono da conta — quando alguém esquecer a senha, envie o link de
          redefinição.
        </p>
      </div>

      {!emailConfigurado() && (
        <div className="aviso aviso--erro" style={{ margin: 0 }}>
          O envio de e-mail não está configurado (falta <code>RESEND_API_KEY</code> no ambiente do servidor). Dá para
          importar a planilha e gerar os links, mas o disparo vai falhar — use “Copiar link” até configurar.
        </div>
      )}

      <Convidados convidados={convidados} />

      <Convites convites={links} />

      <GerenciarUsuarios usuarios={ordenados} ator={{ id: ator.id, cargo: ator.cargo }} />
    </div>
  );
}
