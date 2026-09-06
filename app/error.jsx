'use client';

/**
 * Fronteira de erro global. Substitui o "Application error: a client-side
 * exception has occurred" por algo que diz o que aconteceu e o que fazer.
 */
export default function Erro({ error, reset }) {
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
        <div className="eyebrow" style={{ marginBottom: 16 }}>Erro</div>
        <h1 style={{ fontSize: 34, lineHeight: 1.15, marginBottom: 16 }}>Algo quebrou por aqui.</h1>
        <p style={{ color: 'var(--texto-2)', lineHeight: 1.7, margin: '0 0 24px' }}>
          A página não conseguiu carregar. Se o problema continuar, avise a diretoria com a mensagem abaixo.
        </p>

        {error?.message && (
          <pre
            style={{
              background: 'var(--carvao)',
              border: '1px solid var(--linha-forte)',
              padding: '14px 16px',
              fontSize: 13,
              lineHeight: 1.6,
              color: '#F2B8B8',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: '0 0 28px',
            }}
          >
            {error.message}
          </pre>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn--solido" onClick={reset}>Tentar de novo</button>
          <a className="btn btn--vazado" href="/">Voltar para a home</a>
        </div>
      </div>
    </main>
  );
}
