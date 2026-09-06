'use client';

import Image from 'next/image';
import { useState } from 'react';

const LOTE = 2; // quantos projetos a mais cada clique revela

function CartaoProjeto({ p }) {
  const detalhes = Array.isArray(p.detalhes) ? p.detalhes : [];
  const metricas = Array.isArray(p.metricas) ? p.metricas : [];

  return (
    <article
      style={{
        background: 'var(--carvao)',
        border: '1px solid rgba(242,242,240,0.16)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: '38px 34px 0',
      }}
    >
      {(p.selo || p.contexto) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 14 }}>
          {p.selo && (
            <div
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 22,
                lineHeight: 1.1,
                borderBottom: '2px solid var(--azul)',
                paddingBottom: 4,
              }}
            >
              {p.selo}
            </div>
          )}
          {p.contexto && <div className="eyebrow" style={{ lineHeight: 1.5 }}>{p.contexto}</div>}
        </div>
      )}

      <div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1.2, marginBottom: 8 }}>{p.titulo}</div>
        {p.subtitulo && (
          <div style={{ fontSize: 14, color: 'var(--texto-2)', lineHeight: 1.5 }}>{p.subtitulo}</div>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'rgba(242,242,240,0.78)' }}>{p.resumo}</p>

      {detalhes.length > 0 && (
        <div style={{ display: 'grid', gap: 14 }}>
          {detalhes.map((d, i) => (
            <div
              key={i}
              className="detalhe-projeto"
              style={{ paddingTop: 14, borderTop: '1px solid rgba(242,242,240,0.1)' }}
            >
              <div className="eyebrow" style={{ letterSpacing: '0.14em', color: 'rgba(169,194,209,0.9)' }}>{d.rotulo}</div>
              <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--texto-2)' }}>{d.texto}</div>
            </div>
          ))}
        </div>
      )}

      {metricas.length > 0 && (
        <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: 28 }}>
          {metricas.map((m, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 24, lineHeight: 1.1 }}>{m.valor}</div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--texto-3)',
                }}
              >
                {m.rotulo}
              </div>
            </div>
          ))}
        </div>
      )}

      {p.paper_url && (
        <a
          href={p.paper_url}
          target="_blank"
          rel="noopener"
          className="eyebrow"
          style={{ letterSpacing: '0.18em', display: 'inline-block' }}
        >
          {p.paper_nome || 'Ler o paper'} →
        </a>
      )}

      {p.parceiro_logo && (
        <div
          style={{
            margin: '28px -34px 0',
            background: 'var(--osso-claro)',
            padding: '18px 34px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            borderTop: '1px solid rgba(10,11,13,0.14)',
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(10,11,13,0.78)',
            }}
          >
            {p.parceiro_prefixo || 'Projeto mentorado por'}
          </span>
          <Image
            src={p.parceiro_logo}
            alt={p.parceiro_nome || ''}
            width={120}
            height={30}
            style={{ height: 30, width: 'auto' }}
            unoptimized={!p.parceiro_logo.startsWith('/')}
          />
        </div>
      )}

      <style jsx>{`
        .detalhe-projeto {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 18px;
          align-items: baseline;
        }
        @media (max-width: 900px) {
          .detalhe-projeto { grid-template-columns: 1fr; gap: 6px; }
        }
      `}</style>
    </article>
  );
}

export default function ListaProjetos({ projetos }) {
  // Destaques primeiro; o resto entra por lotes no "carregar mais".
  const destaques = projetos.filter((p) => p.destaque);
  const restantes = projetos.filter((p) => !p.destaque);
  const [visiveis, setVisiveis] = useState(0);

  const mostrados = [...destaques, ...restantes.slice(0, visiveis)];
  const faltam = restantes.length - visiveis;

  return (
    <>
      <div className="grade-projetos">
        {mostrados.map((p) => <CartaoProjeto key={p.id ?? p.slug} p={p} />)}
      </div>

      {faltam > 0 && (
        <div style={{ marginTop: 44, textAlign: 'center' }}>
          <button className="btn btn--vazado" onClick={() => setVisiveis((v) => v + LOTE)}>
            Carregar mais ({faltam})
          </button>
        </div>
      )}

      <style jsx>{`
        .grade-projetos {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          align-items: stretch;
        }
        @media (max-width: 900px) {
          .grade-projetos { grid-template-columns: 1fr; gap: 20px; }
        }
      `}</style>
    </>
  );
}
