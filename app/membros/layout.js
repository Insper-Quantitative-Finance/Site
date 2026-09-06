import Image from 'next/image';
import Link from 'next/link';
import { ehGestao, rotuloCargo } from '@/lib/cargos';
import { exigirUsuario } from '@/lib/auth';
import BotaoSair from '@/components/membros/BotaoSair';
import NavMembros from '@/components/membros/NavMembros';

export const metadata = { title: 'Área de membros · IQF' };

export default async function LayoutMembros({ children }) {
  // exigirUsuario() cobre os três casos: anônimo vai para o login, sessão
  // órfã ou desativada passa por /sair (que limpa o cookie e evita o laço),
  // e falha do Supabase vira erro visível em vez de TypeError.
  const usuario = await exigirUsuario();

  const gestao = ehGestao(usuario.cargo);

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          borderBottom: '1px solid var(--linha-card)',
          background: 'var(--carvao)',
          padding: '18px var(--gutter)',
        }}
      >
        <div
          className="container"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}
        >
          <Link href="/membros" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Image src="/assets/logo-mark.png" alt="" width={30} height={30} />
            <span className="eyebrow" style={{ color: 'var(--osso)' }}>Área de membros</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right', lineHeight: 1.35 }}>
              <div style={{ fontSize: 14 }}>{usuario.nome}</div>
              <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--azul)' }}>
                {rotuloCargo(usuario.cargo)}
              </div>
            </div>
            <BotaoSair />
          </div>
        </div>
      </header>

      <NavMembros gestao={gestao} />

      <main style={{ flex: 1, padding: '48px var(--gutter) 80px' }}>
        <div className="container">{children}</div>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--linha)',
          padding: '24px var(--gutter)',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--texto-3)',
        }}
      >
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <span>© {new Date().getFullYear()} Liga Insper Quantitative Finance</span>
          <Link href="/">Ver o site público</Link>
        </div>
      </footer>
    </div>
  );
}
