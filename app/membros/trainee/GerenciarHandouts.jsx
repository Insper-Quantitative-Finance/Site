'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { BotaoEnviar, Feedback } from '@/components/membros/Formulario';
import { salvarLiberacaoHandout } from '@/app/membros/gestao/acoes';
import { comoLocal } from '@/lib/handouts';

/** Uma linha por handout: o estado atual e o campo que muda a data. */
function LinhaHandout({ h }) {
  const router = useRouter();
  const [estado, acao] = useFormState(salvarLiberacaoHandout, null);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  const situacao = !h.abrivel
    ? { texto: 'sem arquivo', cor: 'var(--texto-3)' }
    : h.liberado
      ? { texto: 'aberto para a turma', cor: 'var(--azul)' }
      : { texto: 'fechado até a data', cor: '#E8B4B8' };

  return (
    <form
      action={acao}
      style={{
        background: 'var(--preto)',
        padding: '16px 18px',
        display: 'grid',
        gap: 12,
      }}
    >
      <input type="hidden" name="slug" value={h.slug} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15 }}>
            {String(h.numero).padStart(2, '0')} · {h.titulo}
          </div>
          <div style={{ fontSize: 12, color: situacao.cor }}>
            {situacao.texto}
            {h.hospedado ? ' · no bucket' : h.urlPublica ? ' · versão publicada' : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="campo" style={{ margin: 0 }}>
            <label htmlFor={`liberado-${h.slug}`} style={{ fontSize: 11 }}>
              Abre em (horário de Brasília)
            </label>
            <input
              id={`liberado-${h.slug}`}
              name="liberado_em"
              type="datetime-local"
              defaultValue={comoLocal(h.liberadoEm)}
            />
          </div>
          <BotaoEnviar variante="vazado">Salvar</BotaoEnviar>
        </div>
      </div>

      <Feedback estado={estado} />
    </form>
  );
}

export default function GerenciarHandouts({ handouts }) {
  return (
    <section className="painel" style={{ display: 'grid', gap: 20 }}>
      <div>
        <div className="eyebrow">Liberação dos handouts</div>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--texto-3)' }}>
          Cada handout abre para os trainees na data marcada. Campo vazio libera na hora. A gestão
          enxerga todos, inclusive os fechados — os trainees não veem nem o card nem a URL.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 1, background: 'var(--linha-card)' }}>
        {handouts.map((h) => <LinhaHandout key={h.slug} h={h} />)}
      </div>
    </section>
  );
}
