'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PAPEIS, rotuloPapel } from '@/lib/projetos';
import { rotuloCargo } from '@/lib/cargos';
import { alocarMembro, desalocarMembro, mudarPapel } from '../acoes';

/**
 * Equipe alocada.
 *
 * Alocar e desalocar é exclusividade do comando de projetos (presidência e
 * diretor de projetos) — quem entra em qual projeto é decisão de diretoria.
 * O papel de "líder" marca quem responde pelo projeto; não dá poder extra.
 */
export default function Equipe({ projetoId, equipe, candidatos, usuarioId, podeGerir }) {
  const router = useRouter();
  const [escolhido, setEscolhido] = useState('');
  const [papel, setPapel] = useState('membro');
  const [erro, setErro] = useState(null);
  const [pendente, iniciar] = useTransition();

  const jaEstao = new Set(equipe.map((m) => m.usuario_id));
  const disponiveis = candidatos.filter((c) => !jaEstao.has(c.id));

  // Líder primeiro, depois alfabético: a ordem em que se procura alguém.
  const ordenada = [...equipe].sort(
    (a, b) => (a.papel === b.papel ? a.nome.localeCompare(b.nome) : a.papel === 'lider' ? -1 : 1),
  );

  const rodar = (fn, args) => {
    setErro(null);
    iniciar(async () => {
      const r = await fn(args);
      if (!r?.ok) return setErro(r?.erro ?? 'Não foi possível concluir.');
      setEscolhido('');
      router.refresh();
    });
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {podeGerir ? (
        <div className="painel" style={{ display: 'grid', gap: 14 }}>
          <div
            style={{
              display: 'grid',
              gap: 12,
              // min(…, 100%) para a linha poder encolher abaixo do piso no
              // celular — sem isso os 330px fixos estouram a tela.
              gridTemplateColumns: 'minmax(min(200px, 100%), 2fr) minmax(min(130px, 100%), 1fr) auto',
              alignItems: 'end',
            }}
          >
            <div className="campo">
              <label htmlFor="eq-quem">Alocar quem</label>
              <select id="eq-quem" value={escolhido} onChange={(e) => setEscolhido(e.target.value)}>
                <option value="">Escolha…</option>
                {disponiveis.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome} — {rotuloCargo(p.cargo)}</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="eq-papel">Papel</label>
              <select id="eq-papel" value={papel} onChange={(e) => setPapel(e.target.value)}>
                {PAPEIS.map((p) => <option key={p.valor} value={p.valor}>{p.label}</option>)}
              </select>
            </div>
            <button
              className="btn btn--solido btn--pequeno"
              disabled={pendente || !escolhido}
              onClick={() => rodar(alocarMembro, { projetoId, usuarioId: escolhido, papel })}
            >
              {pendente ? '…' : 'Alocar'}
            </button>
          </div>

          {erro && <div className="aviso aviso--erro">{erro}</div>}
        </div>
      ) : null}

      {equipe.length === 0 ? (
        <div className="painel" style={{ color: 'var(--texto-3)', fontSize: 14 }}>Ninguém alocado.</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
          {ordenada.map((m) => (
            <li
              key={m.usuario_id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                flexWrap: 'wrap',
                padding: '14px 0',
                borderBottom: '1px solid var(--linha)',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 15, color: 'var(--osso)' }}>
                  {m.nome}
                  {m.usuario_id === usuarioId && <span style={{ color: 'var(--azul)', fontSize: 11 }}> · você</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--texto-3)' }}>
                  {rotuloCargo(m.cargo)}
                  {m.area && ` · ${m.area}`}
                  {m.email && ` · ${m.email}`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {podeGerir ? (
                  <select
                    value={m.papel}
                    disabled={pendente}
                    onChange={(e) => rodar(mudarPapel, { projetoId, usuarioId: m.usuario_id, papel: e.target.value })}
                    className="inline-edit"
                    style={{
                      background: 'transparent',
                      border: '1px solid transparent',
                      color: m.papel === 'lider' ? 'var(--azul)' : 'var(--texto-2)',
                      font: 'inherit',
                      fontSize: 13,
                      padding: '4px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    {PAPEIS.map((p) => <option key={p.valor} value={p.valor}>{p.label}</option>)}
                  </select>
                ) : (
                  <span className={`selo ${m.papel === 'lider' ? 'selo--gestao' : ''}`}>{rotuloPapel(m.papel)}</span>
                )}

                {podeGerir && (
                  <button
                    className="btn-icone"
                    disabled={pendente}
                    title={`Desalocar ${m.nome}`}
                    onClick={() => {
                      if (!confirm(`Desalocar ${m.nome}? As tarefas abertas dele ficam sem responsável.`)) return;
                      rodar(desalocarMembro, { projetoId, usuarioId: m.usuario_id });
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
