import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirUsuario } from '@/lib/auth';
import { acharHandout } from '@/lib/handouts';
import { handoutsDisponiveis } from '@/lib/handouts-storage';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }) {
  const handout = acharHandout(params.slug);
  return { title: handout ? `${handout.titulo} · Handout ${handout.numero} · IQF` : 'Handout · IQF' };
}

export default async function PaginaHandout({ params }) {
  await exigirUsuario();

  const handout = acharHandout(params.slug);
  if (!handout) notFound();

  // Anterior/próximo só entre os que têm arquivo — um link para um handout
  // ainda não publicado levaria a uma página vazia.
  const disponiveis = await handoutsDisponiveis();
  const indice = disponiveis.findIndex((h) => h.slug === handout.slug);
  if (indice < 0) notFound();
  const anterior = disponiveis[indice - 1];
  const proximo = disponiveis[indice + 1];
  const fonte = `/api/handouts/${handout.slug}`;

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <div>
        <Link href="/membros/trainee" style={{ fontSize: 13, color: 'var(--texto-3)' }}>
          ← Entregas e handouts
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Handout {String(handout.numero).padStart(2, '0')}
          </div>
          <h1 style={{ fontSize: 34, lineHeight: 1.15, marginBottom: 10 }}>{handout.titulo}</h1>
          <p className="p-corpo" style={{ maxWidth: '58ch', margin: 0 }}>{handout.descricao}</p>
        </div>

        <a href={fonte} target="_blank" rel="noopener" className="btn btn--vazado">
          Abrir em tela cheia
        </a>
      </div>

      {/*
        O handout é uma página inteira, com estilo e scripts próprios. Vai num
        iframe para que o CSS dele não brigue com o do site. `sandbox` sem
        allow-same-origin isolaria de vez, mas também mataria localStorage —
        e os handouts guardam o progresso dos exercícios ali.
      */}
      <iframe
        src={fonte}
        title={`Handout ${handout.numero} — ${handout.titulo}`}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
        style={{
          width: '100%',
          height: 'min(1400px, 85svh)',
          border: '1px solid var(--linha-card)',
          borderRadius: 2,
          background: '#fff',
          display: 'block',
        }}
      />

      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          paddingTop: 20,
          borderTop: '1px solid var(--linha)',
          fontSize: 13,
        }}
      >
        {anterior ? (
          <Link href={`/membros/trainee/handout/${anterior.slug}`} style={{ color: 'var(--azul)' }}>
            ← Handout {anterior.numero} · {anterior.titulo}
          </Link>
        ) : (
          <span />
        )}
        {proximo && (
          <Link href={`/membros/trainee/handout/${proximo.slug}`} style={{ color: 'var(--azul)' }}>
            Handout {proximo.numero} · {proximo.titulo} →
          </Link>
        )}
      </nav>
    </div>
  );
}
