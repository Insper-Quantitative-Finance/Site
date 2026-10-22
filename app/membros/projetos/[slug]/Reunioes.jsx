'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { atualizarCampo } from '../acoes';
import { avisarErro } from './Aviso';
import { BotaoExcluir, InlineTexto, QuickAdd } from './Inline';

/** "2026-05-20T18:30:00Z" → "20/05 15:30" no fuso de quem está lendo. */
function quandoLegivel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** O input datetime-local precisa de "AAAA-MM-DDTHH:mm" no fuso local. */
function paraInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Campo de data e hora que grava no onChange, como os outros inline. */
function QuandoInline({ reuniao, projetoId, podeEditar }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const legivel = quandoLegivel(reuniao.quando);

  if (!podeEditar) {
    return <span style={{ fontSize: 13, color: 'var(--texto-2)' }}>{legivel ?? 'sem data'}</span>;
  }

  return (
    <input
      type="datetime-local"
      defaultValue={paraInput(reuniao.quando)}
      className="inline-edit"
      style={{
        background: 'transparent',
        border: '1px solid transparent',
        color: 'var(--texto-2)',
        font: 'inherit',
        fontSize: 13,
        padding: '4px 8px',
        width: 'auto',
      }}
      onChange={(e) => {
        iniciar(async () => {
          const r = await atualizarCampo({
            tabela: 'projeto_reunioes',
            id: reuniao.id,
            projetoId,
            campo: 'quando',
            valor: e.target.value,
          });
          if (!r?.ok) return avisarErro(r?.erro);
          router.refresh();
        });
      }}
    />
  );
}

/**
 * Link da reunião.
 *
 * O botão "Criar no Meet" abre meet.new numa aba nova: o Google cria a sala
 * na conta de quem clicou e a pessoa cola a URL de volta aqui. Criar a sala
 * pelo servidor exigiria OAuth do Google por membro (ou conta de serviço com
 * Workspace), e isso é infraestrutura que este projeto ainda não tem — então
 * esta versão entrega o link compartilhado com a equipe sem credencial
 * nenhuma. Zoom e Teams entram pelo mesmo campo.
 */
function LinkReuniao({ reuniao, projetoId, podeEditar }) {
  const router = useRouter();
  const [colando, setColando] = useState(false);
  const [url, setUrl] = useState('');
  const [, iniciar] = useTransition();

  const gravar = (valor) => {
    iniciar(async () => {
      const r = await atualizarCampo({
        tabela: 'projeto_reunioes',
        id: reuniao.id,
        projetoId,
        campo: 'link',
        valor,
      });
      if (!r?.ok) return avisarErro(r?.erro);
      setColando(false);
      setUrl('');
      router.refresh();
    });
  };

  if (reuniao.link) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <a
          href={reuniao.link}
          target="_blank"
          rel="noreferrer"
          className="btn btn--vazado btn--pequeno"
        >
          Entrar
        </a>
        {podeEditar && (
          <button className="btn-icone" title="Remover o link" onClick={() => gravar(null)}>
            ✕
          </button>
        )}
      </div>
    );
  }

  if (!podeEditar) return <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>sem link</span>;

  if (colando) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && url.trim()) gravar(url.trim());
            if (e.key === 'Escape') setColando(false);
          }}
          placeholder="https://meet.google.com/…"
          style={{
            background: 'var(--preto)',
            border: '1px solid var(--azul)',
            color: 'var(--osso)',
            font: 'inherit',
            fontSize: 12,
            padding: '6px 10px',
            width: 230,
          }}
        />
        <button className="btn btn--solido btn--pequeno" disabled={!url.trim()} onClick={() => gravar(url.trim())}>
          Salvar
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <a
        href="https://meet.new"
        target="_blank"
        rel="noreferrer"
        className="btn btn--vazado btn--pequeno"
        // Abrir o Meet e já deixar o campo pronto: quando a pessoa voltar,
        // é só colar — sem procurar onde cola.
        onClick={() => setColando(true)}
      >
        Criar no Meet
      </a>
      <button className="btn-icone" title="Colar um link existente" onClick={() => setColando(true)}>
        colar link
      </button>
    </div>
  );
}

export default function Reunioes({ projetoId, reunioes, podeEditar }) {
  const agora = Date.now();

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {podeEditar && (
        <div style={{ maxWidth: 420 }}>
          <QuickAdd tabela="projeto_reunioes" projetoId={projetoId} placeholder="+ reunião" />
        </div>
      )}

      {reunioes.length === 0 ? (
        <div className="painel" style={{ color: 'var(--texto-3)', fontSize: 14 }}>Nenhuma reunião marcada.</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {reunioes.map((r) => {
            // Reunião passada fica apagada: a lista é sobre o que vem.
            const passou = r.quando && new Date(r.quando).getTime() < agora;
            return (
              <li
                key={r.id}
                style={{
                  display: 'flex',
                  gap: 16,
                  flexWrap: 'wrap',
                  padding: '16px 0',
                  borderBottom: '1px solid var(--linha)',
                  alignItems: 'center',
                  opacity: passou ? 0.55 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 180 }}>
                  <InlineTexto
                    tabela="projeto_reunioes"
                    id={r.id}
                    projetoId={projetoId}
                    campo="titulo"
                    valor={r.titulo}
                    podeEditar={podeEditar}
                    rotulo="reunião"
                    estilo={{ fontSize: 15, color: 'var(--osso)', display: 'block' }}
                  />
                </div>

                <QuandoInline reuniao={r} projetoId={projetoId} podeEditar={podeEditar} />
                <LinkReuniao reuniao={r} projetoId={projetoId} podeEditar={podeEditar} />

                {podeEditar && (
                  <BotaoExcluir
                    tabela="projeto_reunioes"
                    id={r.id}
                    projetoId={projetoId}
                    oQue={`a reunião "${r.titulo}"`}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
