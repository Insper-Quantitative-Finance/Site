'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { BotaoEnviar, Feedback } from '@/components/membros/Formulario';
import { excluirEntrega, salvarEntrega } from '@/app/membros/gestao/acoes';

function FormularioEntrega({ entrega, aoConcluir }) {
  const router = useRouter();
  const [estado, acao] = useFormState(salvarEntrega, null);

  useEffect(() => {
    if (!estado?.ok) return;
    const t = setTimeout(() => {
      router.refresh();
      aoConcluir?.();
    }, 800);
    return () => clearTimeout(t);
  }, [estado, router, aoConcluir]);

  return (
    <form action={acao} style={{ display: 'grid', gap: 20 }}>
      <Feedback estado={estado} />
      {entrega?.id && <input type="hidden" name="id" value={entrega.id} />}

      <div className="campo">
        <label htmlFor="titulo">Título</label>
        <input id="titulo" name="titulo" required defaultValue={entrega?.titulo} />
      </div>

      <div className="campo">
        <label htmlFor="descricao">Descrição</label>
        <textarea
          id="descricao"
          name="descricao"
          defaultValue={entrega?.descricao ?? ''}
          placeholder="O que precisa ser entregue e em que formato."
        />
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="data_limite">Data de entrega</label>
          <input
            id="data_limite"
            name="data_limite"
            type="date"
            required
            defaultValue={entrega?.data_limite ?? ''}
          />
        </div>

        <div className="campo">
          <label htmlFor="periodo">Semestre</label>
          <input id="periodo" name="periodo" defaultValue={entrega?.periodo ?? ''} placeholder="2026.2" />
          <div className="ajuda">Agrupa as entregas por turma.</div>
        </div>

        <div className="campo">
          <label htmlFor="ordem">Ordem</label>
          <input id="ordem" name="ordem" type="number" defaultValue={entrega?.ordem ?? 0} />
          <div className="ajuda">Desempate quando duas caem no mesmo dia.</div>
        </div>
      </div>

      <div className="campo">
        <label htmlFor="url">Link de entrega</label>
        <input id="url" name="url" type="url" defaultValue={entrega?.url ?? ''} placeholder="https://…" />
        <div className="ajuda">Formulário, drive ou repositório. Opcional.</div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <BotaoEnviar>{entrega?.id ? 'Salvar alterações' : 'Adicionar entrega'}</BotaoEnviar>
        {aoConcluir && (
          <button type="button" className="btn btn--vazado" onClick={aoConcluir}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function BotaoExcluir({ id, titulo }) {
  const router = useRouter();
  const [estado, acao] = useFormState(excluirEntrega, null);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  return (
    <form
      action={acao}
      onSubmit={(e) => {
        // Excluir some com a entrega para todos os trainees; confirmar aqui
        // custa um clique e evita o acidente.
        if (!confirm(`Excluir a entrega "${titulo}"?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <BotaoEnviar variante="vazado" carregando="Excluindo…">Excluir</BotaoEnviar>
    </form>
  );
}

export default function GerenciarEntregas({ entregas }) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null);

  return (
    <section className="painel" style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div className="eyebrow">Gestão das entregas</div>
        {!criando && !editando && (
          <button type="button" className="btn btn--solido" onClick={() => setCriando(true)}>
            Nova entrega
          </button>
        )}
      </div>

      {criando && <FormularioEntrega aoConcluir={() => setCriando(false)} />}

      {editando && (
        <FormularioEntrega
          entrega={entregas.find((e) => e.id === editando)}
          aoConcluir={() => setEditando(null)}
        />
      )}

      {!criando && !editando && (
        entregas.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--texto-3)' }}>
            Nenhuma entrega cadastrada. A cada semestre, adicione as datas da nova turma aqui.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 1, background: 'var(--linha-card)' }}>
            {entregas.map((e) => (
              <div
                key={e.id}
                style={{
                  background: 'var(--preto)',
                  padding: '16px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: 15 }}>{e.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--texto-3)' }}>
                    {e.data_limite}
                    {e.periodo ? ` · ${e.periodo}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn--vazado" onClick={() => setEditando(e.id)}>
                    Editar
                  </button>
                  <BotaoExcluir id={e.id} titulo={e.titulo} />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </section>
  );
}
