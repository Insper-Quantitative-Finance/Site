'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import CampoUpload from '@/components/membros/CampoUpload';
import { BotaoEnviar, Feedback } from '@/components/membros/Formulario';
import { excluirProjeto, salvarProjeto } from '@/app/membros/gestao/acoes';

// Logos que já estão em /public/assets; a gestão também pode colar uma URL.
const LOGOS = [
  { valor: '', label: 'Sem logo' },
  { valor: '/assets/itau-asset.png', label: 'Itaú Asset' },
  { valor: '/assets/lev-asset.png', label: 'LEV Asset Management' },
  { valor: '/assets/vault-capital.png', label: 'Vault Capital' },
  { valor: '/assets/parceiro-giantsteps.png', label: 'Giant Steps Capital' },
  { valor: '/assets/parceiro-xp.png', label: 'XP Inc.' },
  { valor: '/assets/parceiro-b3.png', label: 'B3' },
];

// O banco guarda JSON; o formulário edita como texto, uma linha por item.
const jsonParaTexto = (lista, a, b) =>
  (Array.isArray(lista) ? lista : []).map((o) => `${o[a]} | ${o[b] ?? ''}`).join('\n');

function FormularioProjeto({ projeto, aoFechar }) {
  const router = useRouter();
  const [estado, acao] = useFormState(salvarProjeto, null);

  // Um projeto salvo com paper_path veio de upload; com paper_url só, é link.
  const [paperTipo, setPaperTipo] = useState(
    projeto?.paper_path ? 'arquivo' : projeto?.paper_url ? 'link' : 'nenhum',
  );
  const [paper, setPaper] = useState(
    projeto?.paper_path
      ? { path: projeto.paper_path, nome: projeto.paper_nome, url: projeto.paper_url }
      : null,
  );

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  return (
    <form action={acao} className="painel" style={{ display: 'grid', gap: 20 }}>
      <h2 style={{ fontSize: 22, margin: 0 }}>{projeto?.id ? `Editar ${projeto.titulo}` : 'Novo projeto'}</h2>
      <Feedback estado={estado} />
      {projeto?.id && <input type="hidden" name="id" value={projeto.id} />}

      <div className="campo">
        <label htmlFor="pj-titulo">Título</label>
        <input id="pj-titulo" name="titulo" required defaultValue={projeto?.titulo ?? ''} />
      </div>

      <div className="campo">
        <label htmlFor="pj-subtitulo">Subtítulo técnico</label>
        <input id="pj-subtitulo" name="subtitulo" defaultValue={projeto?.subtitulo ?? ''}
               placeholder="Alocação de portfólio por grafos dinâmicos" />
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="pj-selo">Selo</label>
          <input id="pj-selo" name="selo" defaultValue={projeto?.selo ?? ''} placeholder="2º lugar" />
        </div>
        <div className="campo">
          <label htmlFor="pj-contexto">Contexto</label>
          <input id="pj-contexto" name="contexto" defaultValue={projeto?.contexto ?? ''}
                 placeholder="Projeto mentorado · 2026.1" />
        </div>
        <div className="campo">
          <label htmlFor="pj-ano">Ano</label>
          <input id="pj-ano" name="ano" defaultValue={projeto?.ano ?? ''} placeholder="2026.1" />
        </div>
      </div>

      <div className="campo">
        <label htmlFor="pj-resumo">Resumo</label>
        <textarea id="pj-resumo" name="resumo" required defaultValue={projeto?.resumo ?? ''} style={{ minHeight: 140 }} />
      </div>

      <div className="campo">
        <label htmlFor="pj-detalhes">Detalhes técnicos</label>
        <textarea
          id="pj-detalhes"
          name="detalhes"
          style={{ minHeight: 140, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
          defaultValue={jsonParaTexto(projeto?.detalhes, 'rotulo', 'texto')}
          placeholder={'Filtro TMFG | Reduz as 2.500 ligações possíveis às 144 mais informativas.'}
        />
        <div className="ajuda">Uma linha por item, no formato <code>Rótulo | explicação</code>.</div>
      </div>

      <div className="campo">
        <label htmlFor="pj-metricas">Métricas</label>
        <textarea
          id="pj-metricas"
          name="metricas"
          style={{ minHeight: 100, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
          defaultValue={jsonParaTexto(projeto?.metricas, 'valor', 'rotulo')}
          placeholder={'188,6% | retorno acumulado'}
        />
        <div className="ajuda">Uma linha por número, no formato <code>Valor | rótulo</code>.</div>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="pj-parceiro">Parceiro</label>
          <input id="pj-parceiro" name="parceiro_nome" defaultValue={projeto?.parceiro_nome ?? ''} />
        </div>
        <div className="campo">
          <label htmlFor="pj-logo">Logo do parceiro</label>
          <select id="pj-logo" name="parceiro_logo" defaultValue={projeto?.parceiro_logo ?? ''}>
            {LOGOS.map((l) => <option key={l.valor} value={l.valor}>{l.label}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="pj-prefixo">Texto acima do logo</label>
          <input id="pj-prefixo" name="parceiro_prefixo"
                 defaultValue={projeto?.parceiro_prefixo ?? 'Projeto mentorado por'} />
        </div>
      </div>

      <fieldset style={{ border: '1px solid var(--linha-forte)', padding: '20px 22px', display: 'grid', gap: 20 }}>
        <legend className="eyebrow" style={{ padding: '0 8px' }}>Paper do projeto</legend>

        <div className="campo">
          <label htmlFor="pj-paper-tipo">Anexar paper</label>
          <select id="pj-paper-tipo" name="paper_tipo" value={paperTipo} onChange={(e) => setPaperTipo(e.target.value)}>
            <option value="nenhum">Sem paper</option>
            <option value="link">Link externo (Drive, arXiv, SSRN…)</option>
            <option value="arquivo">Enviar PDF</option>
          </select>
        </div>

        {paperTipo === 'link' && (
          <>
            <div className="campo">
              <label htmlFor="pj-paper-link">URL do paper</label>
              <input id="pj-paper-link" name="paper_link" type="url" defaultValue={projeto?.paper_url ?? ''}
                     placeholder="https://…" />
            </div>
            <div className="campo">
              <label htmlFor="pj-paper-rotulo">Rótulo do link</label>
              <input id="pj-paper-rotulo" name="paper_rotulo" defaultValue={projeto?.paper_nome ?? ''}
                     placeholder="Paper completo (PDF)" />
            </div>
          </>
        )}

        {paperTipo === 'arquivo' && (
          <CampoUpload
            bucket="papers"
            publico
            prefixoCampos="paper"
            label="PDF do paper"
            aceita=".pdf,application/pdf"
            valor={paper}
            aoEnviar={setPaper}
            ajuda="Atenção: o bucket de papers é público — qualquer visitante da landing consegue baixar. Para material restrito, use a biblioteca de Materiais, que é privada."
          />
        )}
      </fieldset>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="campo">
          <label htmlFor="pj-slug">Identificador (slug)</label>
          <input id="pj-slug" name="slug" defaultValue={projeto?.slug ?? ''} placeholder="gerado a partir do título" />
        </div>
        <div className="campo">
          <label htmlFor="pj-ordem">Ordem</label>
          <input id="pj-ordem" name="ordem" type="number" defaultValue={projeto?.ordem ?? 0} />
          <div className="ajuda">Menor aparece primeiro.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--texto-2)' }}>
          <input type="checkbox" name="destaque" defaultChecked={projeto?.destaque ?? true} />
          Destaque (aparece antes do “Carregar mais”)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--texto-2)' }}>
          <input type="checkbox" name="publicado" defaultChecked={projeto?.publicado ?? true} />
          Publicado no site
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <BotaoEnviar>{projeto?.id ? 'Salvar alterações' : 'Criar projeto'}</BotaoEnviar>
        <button type="button" className="btn btn--vazado" onClick={aoFechar}>Fechar</button>
      </div>
    </form>
  );
}

function BotaoExcluir({ id, titulo }) {
  const router = useRouter();
  const [estado, acao] = useFormState(excluirProjeto, null);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!confirm(`Excluir "${titulo}" definitivamente? Para só tirar do site, desmarque "Publicado".`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <BotaoEnviar variante="vazado" carregando="Excluindo…">Excluir</BotaoEnviar>
    </form>
  );
}

export default function GerenciarProjetos({ projetos }) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null);

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn--solido" onClick={() => { setEditando(null); setCriando((c) => !c); }}>
          {criando ? 'Fechar' : 'Novo projeto'}
        </button>
      </div>

      {criando && <FormularioProjeto aoFechar={() => setCriando(false)} />}
      {editando && (
        <FormularioProjeto key={editando.id} projeto={editando} aoFechar={() => setEditando(null)} />
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="tabela">
          <thead>
            <tr>
              <th>Projeto</th>
              <th>Contexto</th>
              <th>Ordem</th>
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {projetos.map((p) => (
              <tr key={p.id} style={{ opacity: p.publicado ? 1 : 0.55 }}>
                <td style={{ color: 'var(--osso)' }}>
                  {p.titulo}
                  {p.subtitulo && <div style={{ fontSize: 12, color: 'var(--texto-3)' }}>{p.subtitulo}</div>}
                </td>
                <td>{p.contexto || p.ano || '—'}</td>
                <td>{p.ordem}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {p.destaque && <span className="selo selo--gestao">Destaque</span>}
                    <span className={`selo ${p.publicado ? '' : 'selo--inativo'}`}>
                      {p.publicado ? 'No site' : 'Rascunho'}
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn--vazado btn--pequeno"
                      onClick={() => { setCriando(false); setEditando(p); }}
                    >
                      Editar
                    </button>
                    <BotaoExcluir id={p.id} titulo={p.titulo} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {projetos.length === 0 && (
        <div className="painel" style={{ color: 'var(--texto-3)' }}>
          Nenhum projeto cadastrado. Rode o <code>seed.sql</code> para trazer os quatro que já estavam no site.
        </div>
      )}
    </div>
  );
}
