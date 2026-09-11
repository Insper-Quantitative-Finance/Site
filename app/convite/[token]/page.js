import Image from 'next/image';
import Link from 'next/link';
import { MOTIVOS, situacaoConvite } from '@/lib/convites';
import { criarClienteAdmin } from '@/lib/supabase/server';
import FormularioConvite from './FormularioConvite';

export const dynamic = 'force-dynamic';
// O token é um segredo: nenhum buscador deve indexar (nem guardar) esta URL.
export const metadata = {
  title: 'Criar conta de trainee · IQF',
  robots: { index: false, follow: false },
};

const FUNDO = {
  minHeight: '100svh',
  display: 'grid',
  placeItems: 'center',
  padding: '48px 20px',
  backgroundColor: 'var(--preto-puro)',
  backgroundImage:
    'radial-gradient(50% 50% at 10% 86%, rgba(12,26,78,0.75) 0%, rgba(12,26,78,0) 70%),' +
    'radial-gradient(44% 48% at 90% 16%, rgba(206,24,28,0.55) 0%, rgba(206,24,28,0) 68%),' +
    'radial-gradient(30% 34% at 78% 78%, rgba(16,32,90,0.5) 0%, rgba(16,32,90,0) 70%)',
};

function Moldura({ children }) {
  return (
    <main style={FUNDO}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <Image src="/assets/logo-mark.png" alt="" width={34} height={34} />
          <span className="eyebrow">Insper Quantitative Finance</span>
        </Link>
        {children}
      </div>
    </main>
  );
}

export default async function PaginaConvite({ params }) {
  // Cliente admin porque a tabela de convites não é legível por ninguém
  // (nem anon, nem authenticated) — ver migracao-convites.sql.
  const { data: convite } = await criarClienteAdmin()
    .from('convites')
    .select('rotulo, turma, nome, email, dominio_email, usos, usos_max, expira_em, revogado')
    .eq('token', params.token)
    .maybeSingle();

  const situacao = convite ? situacaoConvite(convite) : { valor: 'invalido' };

  if (situacao.valor !== 'ativo') {
    return (
      <Moldura>
        <h1 style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 16 }}>Convite indisponível</h1>
        <div className="aviso aviso--erro" style={{ marginBottom: 28 }}>{MOTIVOS[situacao.valor]}</div>
        <Link className="btn btn--vazado" href="/login">Ir para o login</Link>
      </Moldura>
    );
  }

  return (
    <Moldura>
      <div className="eyebrow" style={{ marginBottom: 16 }}>{convite.rotulo}</div>
      <h1 style={{ fontSize: 34, lineHeight: 1.1, marginBottom: 12 }}>Criar sua conta de trainee</h1>
      <p style={{ color: 'var(--texto-3)', fontSize: 15, lineHeight: 1.6, margin: '0 0 32px' }}>
        {convite.email
          ? 'Confira seus dados e escolha uma senha. A senha fica só com você — nem a diretoria consegue vê-la.'
          : 'Escolha seu e-mail e sua senha. A senha fica só com você — nem a diretoria consegue vê-la.'}
        {!convite.email && convite.dominio_email ? ` Use seu e-mail @${convite.dominio_email}.` : ''}
      </p>

      <FormularioConvite
        token={params.token}
        dominio={convite.dominio_email}
        nome={convite.nome}
        email={convite.email}
      />

      <p style={{ color: 'var(--texto-3)', fontSize: 13, lineHeight: 1.6, marginTop: 28 }}>
        Já tem conta? <Link href="/login" style={{ color: 'var(--azul)' }}>Entrar</Link>
      </p>
    </Moldura>
  );
}
