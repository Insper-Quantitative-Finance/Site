'use client';

import { COR_URGENCIA, rotuloPrazo, urgencia } from '@/lib/projetos';
import { BotaoExcluir, InlineCheck, InlineData, InlineTexto, QuickAdd } from './Inline';

/**
 * Metas e marcos na mesma aba, porque respondem à mesma pergunta — "onde o
 * projeto tem de chegar" — mas com eixos diferentes:
 *   meta  → alvo que anda ("Sharpe 1,2 de 1,5")
 *   marco → entrega com data ("backtest rodando")
 */

function Meta({ meta, projetoId, podeEditar }) {
  return (
    <li
      style={{
        display: 'flex',
        gap: 14,
        padding: '14px 0',
        borderBottom: '1px solid var(--linha)',
        alignItems: 'center',
      }}
    >
      <InlineCheck
        tabela="projeto_metas"
        id={meta.id}
        projetoId={projetoId}
        campo="concluida"
        valor={meta.concluida}
        podeEditar={podeEditar}
        titulo={meta.concluida ? 'Reabrir' : 'Concluir'}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <InlineTexto
          tabela="projeto_metas"
          id={meta.id}
          projetoId={projetoId}
          campo="titulo"
          valor={meta.titulo}
          podeEditar={podeEditar}
          rotulo="meta"
          estilo={{
            fontSize: 15,
            color: 'var(--osso)',
            display: 'block',
            textDecoration: meta.concluida ? 'line-through' : 'none',
            opacity: meta.concluida ? 0.7 : 1,
          }}
        />
      </div>

      {/* atual / alvo lado a lado: é a leitura que importa num relance. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
        <InlineTexto
          tabela="projeto_metas"
          id={meta.id}
          projetoId={projetoId}
          campo="atual"
          valor={meta.atual}
          podeEditar={podeEditar}
          placeholder="—"
          rotulo="valor atual"
          estilo={{ color: 'var(--azul)', minWidth: 46, textAlign: 'right', display: 'inline-block' }}
        />
        <span style={{ color: 'var(--texto-3)' }}>/</span>
        <InlineTexto
          tabela="projeto_metas"
          id={meta.id}
          projetoId={projetoId}
          campo="alvo"
          valor={meta.alvo}
          podeEditar={podeEditar}
          placeholder="alvo"
          rotulo="alvo"
          estilo={{ color: 'var(--texto-2)', minWidth: 46, display: 'inline-block' }}
        />
      </div>

      {podeEditar && (
        <BotaoExcluir tabela="projeto_metas" id={meta.id} projetoId={projetoId} oQue={`a meta "${meta.titulo}"`} />
      )}
    </li>
  );
}

function Marco({ marco, projetoId, podeEditar }) {
  const cor = COR_URGENCIA[urgencia(marco.data, marco.concluido)];

  return (
    <li
      style={{
        display: 'flex',
        gap: 14,
        padding: '14px 0',
        borderBottom: '1px solid var(--linha)',
        alignItems: 'center',
      }}
    >
      <InlineCheck
        tabela="projeto_marcos"
        id={marco.id}
        projetoId={projetoId}
        campo="concluido"
        valor={marco.concluido}
        podeEditar={podeEditar}
        titulo={marco.concluido ? 'Reabrir' : 'Concluir'}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <InlineTexto
          tabela="projeto_marcos"
          id={marco.id}
          projetoId={projetoId}
          campo="titulo"
          valor={marco.titulo}
          podeEditar={podeEditar}
          rotulo="marco"
          estilo={{
            fontSize: 15,
            color: 'var(--osso)',
            display: 'block',
            textDecoration: marco.concluido ? 'line-through' : 'none',
            opacity: marco.concluido ? 0.7 : 1,
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <InlineData
          tabela="projeto_marcos"
          id={marco.id}
          projetoId={projetoId}
          campo="data"
          valor={marco.data}
          podeEditar={podeEditar}
          estilo={{ fontSize: 12, color: cor, width: 'auto' }}
        />
        {marco.data && !marco.concluido && (
          <span style={{ fontSize: 11, color: cor, whiteSpace: 'nowrap' }}>{rotuloPrazo(marco.data)}</span>
        )}
      </div>

      {podeEditar && (
        <BotaoExcluir
          tabela="projeto_marcos"
          id={marco.id}
          projetoId={projetoId}
          oQue={`o marco "${marco.titulo}"`}
        />
      )}
    </li>
  );
}

function Secao({ titulo, children }) {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h3 className="eyebrow" style={{ color: 'var(--texto-3)', margin: 0 }}>{titulo}</h3>
      {children}
    </section>
  );
}

export default function Metas({ projetoId, metas, marcos, podeEditar }) {
  return (
    <div style={{ display: 'grid', gap: 40 }}>
      <Secao titulo="Metas">
        {metas.length === 0 ? (
          <div className="painel" style={{ color: 'var(--texto-3)', fontSize: 14 }}>Nenhuma meta definida.</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {metas.map((m) => <Meta key={m.id} meta={m} projetoId={projetoId} podeEditar={podeEditar} />)}
          </ul>
        )}
        {podeEditar && (
          <div style={{ maxWidth: 420 }}>
            <QuickAdd tabela="projeto_metas" projetoId={projetoId} placeholder="+ meta" />
          </div>
        )}
      </Secao>

      <Secao titulo="Marcos">
        {marcos.length === 0 ? (
          <div className="painel" style={{ color: 'var(--texto-3)', fontSize: 14 }}>Nenhum marco definido.</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {marcos.map((m) => <Marco key={m.id} marco={m} projetoId={projetoId} podeEditar={podeEditar} />)}
          </ul>
        )}
        {podeEditar && (
          <div style={{ maxWidth: 420 }}>
            <QuickAdd tabela="projeto_marcos" projetoId={projetoId} placeholder="+ marco" />
          </div>
        )}
      </Secao>
    </div>
  );
}
