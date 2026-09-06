import Image from 'next/image';
import Link from 'next/link';
import FormularioLogin from './FormularioLogin';

export const metadata = { title: 'Entrar · Insper Quantitative Finance' };

// Motivos pelos quais /sair devolveu a pessoa para cá.
const MOTIVOS = {
  'sem-perfil':
    'Sua conta existe, mas não está vinculada a nenhum perfil de membro. Fale com a diretoria para concluir o cadastro.',
  inativo: 'Seu acesso foi desativado pela gestão. Fale com a diretoria se isso for engano.',
};

export default function PaginaLogin({ searchParams }) {
  const motivo = MOTIVOS[searchParams?.motivo];

  return (
    <main
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 20px',
        backgroundColor: 'var(--preto-puro)',
        backgroundImage:
          'radial-gradient(50% 50% at 10% 86%, rgba(12,26,78,0.75) 0%, rgba(12,26,78,0) 70%),' +
          'radial-gradient(44% 48% at 90% 16%, rgba(206,24,28,0.55) 0%, rgba(206,24,28,0) 68%),' +
          'radial-gradient(30% 34% at 78% 78%, rgba(16,32,90,0.5) 0%, rgba(16,32,90,0) 70%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <Image src="/assets/logo-mark.png" alt="" width={34} height={34} />
          <span className="eyebrow">Voltar ao site</span>
        </Link>

        <h1 style={{ fontSize: 38, lineHeight: 1.1, marginBottom: 12 }}>Área de membros</h1>
        <p style={{ color: 'var(--texto-3)', fontSize: 15, lineHeight: 1.6, margin: '0 0 32px' }}>
          Acesso restrito aos membros da liga. O cadastro é feito pela gestão — se você ainda não tem login, fale com a
          diretoria.
        </p>

        {motivo && (
          <div className="aviso aviso--erro" style={{ marginBottom: 24 }}>{motivo}</div>
        )}

        <FormularioLogin destino={searchParams?.destino || '/membros'} />
      </div>
    </main>
  );
}
