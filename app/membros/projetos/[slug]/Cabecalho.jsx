'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  COR_URGENCIA,
  STATUS_PROJETO_LISTA,
  corStatus,
  progressoProjeto,
  rotuloPrazo,
  urgencia,
} from '@/lib/projetos';
import { atualizarCampo, excluirProjeto } from '../acoes';
import { InlineData, InlineSelect, InlineTexto } from './Inline';

function Dado({ rotulo, children }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div className="eyebrow" style={{ color: 'var(--texto-3)' }}>{rotulo}</div>
      <div style={{ fontSize: 15, color: 'var(--osso)' }}>{children}</div>
    </div>
  );
}

/** Arquivar e excluir: ações raras, fora do caminho do dia a dia. */
function Perigo({ projeto }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  const arquivar = () => {
    const valor = !projeto.arquivado;
    if (valor && !confirm('Arquivar tira o projeto da lista. Nada é apagado e o site não muda. Continuar?')) return;
    iniciar(async () => {
      const r = await atualizarCampo({
        tabela: 'projetos',
        id: projeto.id,
        projetoId: projeto.id,
        campo: 'arquivado',
        valor,
      });
      if (!r?.ok) return alert(r?.erro ?? 'Não foi possível arquivar.');
      router.refresh();
    });
  };

  const excluir = () => {
    if (!confirm(`Excluir "${projeto.titulo}" definitivamente? Tarefas, metas, marcos e reuniões vão com ele.`)) return;
    iniciar(async () => {
      const r = await excluirProjeto({ projetoId: projeto.id });
      if (!r?.ok) return alert(r?.erro ?? 'Não foi possível excluir.');
      router.push('/membros/projetos');
    });
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn-icone" onClick={arquivar} disabled={pendente}>
        {projeto.arquivado ? 'reabrir' : 'arquivar'}
      </button>
      <button className="btn-icone" onClick={excluir} disabled={pendente}>excluir</button>
    </div>
  );
}

export default function Cabecalho({ projeto, tarefas, equipe, podeEditar, podeVitrine }) {
  const prog = progressoProjeto(tarefas);
  const concluido = projeto.status === 'concluido';
  const corPrazo = COR_URGENCIA[urgencia(projeto.deadline, concluido)];
  const prazo = rotuloPrazo(projeto.deadline);
  const lider = equipe.find((m) => m.papel === 'lider');

  return (
    <header style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
        <Link href="/membros/projetos" className="eyebrow" style={{ color: 'var(--texto-3)' }}>
          ← Projetos
        </Link>
        {podeVitrine && <Perigo projeto={projeto} />}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <InlineTexto
          tabela="projetos"
          id={projeto.id}
          projetoId={projeto.id}
          campo="titulo"
          valor={projeto.titulo}
          podeEditar={podeVitrine}
          rotulo="título do projeto"
          estilo={{ fontSize: 34, lineHeight: 1.15, color: 'var(--osso)', display: 'block' }}
        />
        <InlineTexto
          tabela="projetos"
          id={projeto.id}
          projetoId={projeto.id}
          campo="subtitulo"
          valor={projeto.subtitulo}
          podeEditar={podeVitrine}
          placeholder="+ subtítulo"
          rotulo="subtítulo"
          estilo={{ fontSize: 15, color: 'var(--texto-3)', display: 'block' }}
        />
      </div>

      {projeto.arquivado && (
        <div className="aviso" style={{ borderColor: 'var(--linha-forte)', color: 'var(--texto-3)' }}>
          Projeto arquivado.
        </div>
      )}

      {!podeEditar && (
        <div className="aviso" style={{ borderColor: 'var(--linha-forte)', color: 'var(--texto-3)' }}>
          Modo leitura — você não está alocado neste projeto.
        </div>
      )}

      <div className="painel" style={{ display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
          <Dado rotulo="Status">
            <InlineSelect
              tabela="projetos"
              id={projeto.id}
              projetoId={projeto.id}
              campo="status"
              valor={projeto.status}
              opcoes={STATUS_PROJETO_LISTA.map((s) => ({ valor: s.valor, label: s.label }))}
              podeEditar={podeEditar}
              estilo={{ fontSize: 15, color: corStatus(projeto.status), width: 'auto' }}
            />
          </Dado>

          <Dado rotulo="Início">
            <InlineData
              tabela="projetos"
              id={projeto.id}
              projetoId={projeto.id}
              campo="inicio"
              valor={projeto.inicio}
              podeEditar={podeEditar}
              estilo={{ fontSize: 15, width: 'auto' }}
            />
          </Dado>

          <Dado rotulo="Deadline">
            <div style={{ display: 'grid', gap: 2 }}>
              <InlineData
                tabela="projetos"
                id={projeto.id}
                projetoId={projeto.id}
                campo="deadline"
                valor={projeto.deadline}
                podeEditar={podeEditar}
                estilo={{ fontSize: 15, color: corPrazo, width: 'auto' }}
              />
              {prazo && !concluido && <span style={{ fontSize: 11, color: corPrazo }}>{prazo}</span>}
            </div>
          </Dado>

          <Dado rotulo="Tarefas">{prog.total === 0 ? '—' : `${prog.feitas}/${prog.total}`}</Dado>
          <Dado rotulo="Líder">{lider?.nome ?? '—'}</Dado>
        </div>

        {prog.total > 0 && (
          <div style={{ height: 4, background: 'var(--linha-forte)' }}>
            <div style={{ height: '100%', width: `${prog.pct}%`, background: 'var(--azul)' }} />
          </div>
        )}

        {/* Briefing deixou de ser aba própria: é uma linha de contexto que se
            lê junto com as datas, não uma seção que se visita. */}
        <div style={{ borderTop: '1px solid var(--linha)', paddingTop: 16 }}>
          <InlineTexto
            tabela="projetos"
            id={projeto.id}
            projetoId={projeto.id}
            campo="briefing"
            valor={projeto.briefing}
            podeEditar={podeEditar}
            placeholder="+ objetivo e escopo do projeto"
            multilinha
            rotulo="briefing"
            estilo={{ fontSize: 14, color: 'var(--texto-2)', lineHeight: 1.7, display: 'block' }}
          />
        </div>
      </div>
    </header>
  );
}
