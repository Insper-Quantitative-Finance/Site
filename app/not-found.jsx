import Link from 'next/link';

/**
 * 404 global. Sem este arquivo o Next cai na página crua dele — fundo branco,
 * fonte do sistema — que não parece o site. Vale tanto para URL digitada
 * errada quanto para o notFound() das rotas dinâmicas (projeto, handout,
 * convite) quando o slug não existe.
 */
export const metadata = { title: 'Página não encontrada · IQF' };

export default function NaoEncontrada() {
  return (
    <main
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 20px',
        background: 'var(--preto-puro)',
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Erro 404</div>
        <h1 style={{ fontSize: 34, lineHeight: 1.15, marginBottom: 16 }}>Esta página não existe.</h1>
        <p style={{ color: 'var(--texto-2)', lineHeight: 1.7, margin: '0 0 28px' }}>
          O endereço pode ter mudado, ou o link que te trouxe está velho. Se você esperava encontrar algo aqui,
          avise a diretoria.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="btn btn--solido" href="/">Voltar para a home</Link>
          <Link className="btn btn--vazado" href="/membros">Área de membros</Link>
        </div>
      </div>
    </main>
  );
}
