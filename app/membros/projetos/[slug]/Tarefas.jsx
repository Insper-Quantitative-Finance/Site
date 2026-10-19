'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { COLUNAS_TAREFA, COR_URGENCIA, formatarData, rotuloPrazo, urgencia } from '@/lib/projetos';
import { reordenarColuna } from '../acoes';
import { BotaoExcluir, InlineData, InlineSelect, InlineTexto, QuickAdd } from './Inline';

/**
 * Quadro de tarefas com arrastar e soltar.
 *
 * O estado das tarefas é local e otimista: ao soltar o cartão ele já aparece
 * na coluna nova, e só depois a action grava. Esperar o servidor para só
 * então mover faria o cartão "voltar" por meio segundo a cada arrasto.
 */

function Cartao({ tarefa, projetoId, equipe, usuarioId, podeEditar, arrastando, aoArrastar, aoSoltarAntes }) {
  const feito = tarefa.status === 'feito';
  const cor = COR_URGENCIA[urgencia(tarefa.prazo, feito)];
  // Borda azul no que é meu: abrir o quadro e achar as próprias tarefas de
  // relance é o uso mais frequente da página.
  const minha = tarefa.responsavel_id === usuarioId;
  const [alvo, setAlvo] = useState(false);

  return (
    <div
      draggable={podeEditar}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        // Firefox só inicia o arrasto se houver dado no dataTransfer.
        e.dataTransfer.setData('text/plain', tarefa.id);
        aoArrastar(tarefa.id);
      }}
      onDragOver={(e) => {
        if (!arrastando || arrastando === tarefa.id) return;
        e.preventDefault();
        e.stopPropagation();
        setAlvo(true);
      }}
      onDragLeave={() => setAlvo(false)}
      onDrop={(e) => {
        if (!arrastando) return;
        e.preventDefault();
        e.stopPropagation();
        setAlvo(false);
        aoSoltarAntes(tarefa.id);
      }}
      style={{
        border: `1px solid ${alvo || minha ? 'var(--azul)' : 'var(--linha-card)'}`,
        borderTop: alvo ? '3px solid var(--azul)' : undefined,
        background: 'var(--carvao)',
        padding: '12px 14px',
        display: 'grid',
        gap: 8,
        opacity: arrastando === tarefa.id ? 0.4 : feito ? 0.7 : 1,
        cursor: podeEditar ? 'grab' : 'default',
      }}
    >
      <InlineTexto
        tabela="projeto_tarefas"
        id={tarefa.id}
        projetoId={projetoId}
        campo="titulo"
        valor={tarefa.titulo}
        podeEditar={podeEditar}
        rotulo="título da tarefa"
        estilo={{ fontSize: 14, color: 'var(--osso)', lineHeight: 1.4, display: 'block' }}
      />

      <InlineTexto
        tabela="projeto_tarefas"
        id={tarefa.id}
        projetoId={projetoId}
        campo="descricao"
        valor={tarefa.descricao}
        podeEditar={podeEditar}
        placeholder="+ detalhes"
        multilinha
        rotulo="detalhes"
        estilo={{ fontSize: 12, color: 'var(--texto-3)', lineHeight: 1.6, display: 'block', minHeight: 0 }}
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 11 }}>
        <InlineSelect
          tabela="projeto_tarefas"
          id={tarefa.id}
          projetoId={projetoId}
          campo="responsavel_id"
          valor={tarefa.responsavel_id}
          opcoes={equipe.map((m) => ({ valor: m.usuario_id, label: m.nome }))}
          vazio="sem responsável"
          podeEditar={podeEditar}
          estilo={{ fontSize: 11, color: 'var(--texto-2)', width: 'auto' }}
        />
        <InlineData
          tabela="projeto_tarefas"
          id={tarefa.id}
          projetoId={projetoId}
          campo="prazo"
          valor={tarefa.prazo}
          podeEditar={podeEditar}
          estilo={{ fontSize: 11, color: cor, width: 'auto' }}
        />
        {tarefa.prazo && !feito && (
          <span style={{ color: cor, fontSize: 11 }}>{rotuloPrazo(tarefa.prazo)}</span>
        )}
        {!podeEditar && tarefa.prazo && (
          <span style={{ color: cor, fontSize: 11 }}>{formatarData(tarefa.prazo)}</span>
        )}
        {podeEditar && (
          <BotaoExcluir
            tabela="projeto_tarefas"
            id={tarefa.id}
            projetoId={projetoId}
            oQue={`a tarefa "${tarefa.titulo}"`}
            estilo={{ marginLeft: 'auto' }}
          />
        )}
      </div>
    </div>
  );
}

export default function Tarefas({ projetoId, tarefas, equipe, usuarioId, podeEditar }) {
  const router = useRouter();
  const [lista, setLista] = useState(tarefas);
  const [arrastando, setArrastando] = useState(null);
  const [, iniciar] = useTransition();

  // O servidor manda a verdade: toda revalidação sobrescreve o otimismo.
  useEffect(() => setLista(tarefas), [tarefas]);

  const porColuna = (status) =>
    lista.filter((t) => t.status === status).sort((a, b) => a.ordem - b.ordem);

  /**
   * Move o cartão para `status`, inserindo antes de `antesDe` (ou no fim).
   * Grava a coluna de destino inteira porque `ordem` é posição relativa:
   * inserir no meio empurra todo mundo abaixo.
   */
  const mover = (id, status, antesDe) => {
    const cartao = lista.find((t) => t.id === id);
    if (!cartao) return;

    const destino = porColuna(status).filter((t) => t.id !== id);
    const posicao = antesDe ? destino.findIndex((t) => t.id === antesDe) : -1;
    const ids = [...destino.map((t) => t.id)];
    ids.splice(posicao === -1 ? ids.length : posicao, 0, id);

    // Nada mudou: não vale um round-trip.
    const atual = porColuna(status).map((t) => t.id);
    if (cartao.status === status && atual.join() === ids.join()) return;

    setLista((antes) =>
      antes.map((t) => {
        if (t.id === id) return { ...t, status, ordem: ids.indexOf(id) };
        const i = ids.indexOf(t.id);
        return i === -1 ? t : { ...t, ordem: i };
      }),
    );

    iniciar(async () => {
      const r = await reordenarColuna({ projetoId, status, ids });
      // Em erro ou sucesso o refresh traz o estado real do banco; o rollback
      // vem de graça pelo useEffect acima.
      if (!r?.ok) alert(r?.erro ?? 'Não foi possível mover a tarefa.');
      router.refresh();
    });
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: `repeat(${COLUNAS_TAREFA.length}, minmax(230px, 1fr))`,
          overflowX: 'auto',
          paddingBottom: 8,
          alignItems: 'start',
        }}
      >
        {COLUNAS_TAREFA.map((coluna) => {
          const daColuna = porColuna(coluna.valor);
          const atrasadas = daColuna.filter(
            (t) => coluna.valor !== 'feito' && urgencia(t.prazo) === 'atrasado',
          ).length;

          return (
            <div
              key={coluna.valor}
              // Soltar na coluna (fora de um cartão) manda para o fim dela.
              onDragOver={(e) => {
                if (arrastando) e.preventDefault();
              }}
              onDrop={(e) => {
                if (!arrastando) return;
                e.preventDefault();
                mover(arrastando, coluna.valor, null);
                setArrastando(null);
              }}
              style={{
                display: 'grid',
                gap: 10,
                alignContent: 'start',
                minHeight: 120,
                padding: 4,
                outline: arrastando ? '1px dashed var(--linha-forte)' : 'none',
                outlineOffset: 4,
              }}
            >
              <div
                className="eyebrow"
                style={{
                  color: 'var(--texto-3)',
                  borderBottom: '1px solid var(--linha-forte)',
                  paddingBottom: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span>{coluna.label}</span>
                <span>
                  {atrasadas > 0 && (
                    <span style={{ color: COR_URGENCIA.atrasado }} title={`${atrasadas} atrasada(s)`}>
                      !{atrasadas}{' '}
                    </span>
                  )}
                  {daColuna.length}
                </span>
              </div>

              {daColuna.map((t) => (
                <Cartao
                  key={t.id}
                  tarefa={t}
                  projetoId={projetoId}
                  equipe={equipe}
                  usuarioId={usuarioId}
                  podeEditar={podeEditar}
                  arrastando={arrastando}
                  aoArrastar={setArrastando}
                  aoSoltarAntes={(antesDe) => {
                    mover(arrastando, coluna.valor, antesDe);
                    setArrastando(null);
                  }}
                />
              ))}

              {podeEditar && (
                <QuickAdd
                  tabela="projeto_tarefas"
                  projetoId={projetoId}
                  extra={{ status: coluna.valor }}
                  placeholder="+ tarefa"
                />
              )}

              {daColuna.length === 0 && !podeEditar && (
                <div style={{ fontSize: 12, color: 'var(--texto-3)', padding: '8px 2px' }}>—</div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
