'use client';

import { useState } from 'react';

/**
 * Abas da página do projeto.
 *
 * O conteúdo de todas chega pronto do servidor e fica montado — trocar de
 * aba é só mostrar/esconder. Custa um pouco mais de HTML na primeira carga
 * e em troca a troca é instantânea, sem buscar nada. Também preserva o que
 * estava sendo digitado numa aba quando se passa pela outra.
 */
export default function Abas({ abas, inicial }) {
  const [ativa, setAtiva] = useState(inicial ?? abas[0]?.id);

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 24,
          borderBottom: '1px solid var(--linha-card)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {abas.map((aba) => {
          const atual = aba.id === ativa;
          return (
            <button
              key={aba.id}
              role="tab"
              aria-selected={atual}
              onClick={() => setAtiva(aba.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${atual ? 'var(--azul)' : 'transparent'}`,
                color: atual ? 'var(--osso)' : 'var(--texto-3)',
                padding: '14px 0',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                font: 'inherit',
                fontWeight: 400,
              }}
            >
              {aba.label}
              {aba.contagem > 0 && (
                <span style={{ color: 'var(--texto-3)', marginLeft: 6 }}>{aba.contagem}</span>
              )}
            </button>
          );
        })}
      </div>

      {abas.map((aba) => (
        <div key={aba.id} role="tabpanel" hidden={aba.id !== ativa}>
          {aba.conteudo}
        </div>
      ))}
    </div>
  );
}
