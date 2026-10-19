import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  COR_URGENCIA,
  corStatus,
  formatarData,
  podeAbrirProjeto,
  podeVerProjetos,
  progressoProjeto,
  rotuloPrazo,
  rotuloStatus,
  urgencia,
} from '@/lib/projetos';
import { exigirUsuario } from '@/lib/auth';
import { criarClienteServidor } from '@/lib/supabase/server';
import NovoProjeto from './NovoProjeto';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Projetos · IQF' };

function Cartao({ projeto, meu }) {
  const prog = progressoProjeto(projeto.tarefas);
  const concluido = projeto.status === 'concluido';
  const prazo = rotuloPrazo(projeto.deadline);
  const cor = COR_URGENCIA[urgencia(projeto.deadline, concluido)];
  const equipe = projeto.equipe ?? [];
  const abertas = projeto.tarefas.filter((t) => t.status !== 'feito').length;

  return (
    <Link
      href={`/membros/projetos/${projeto.slug}`}
      className="painel cartao-projeto"
      style={{ display: 'grid', gap: 16, alignContent: 'start', color: 'inherit' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 18, color: 'var(--osso)', lineHeight: 1.3 }}>{projeto.titulo}</div>
          {projeto.subtitulo && (
            <div style={{ fontSize: 13, color: 'var(--texto-3)', marginTop: 4 }}>{projeto.subtitulo}</div>
          )}
        </div>
        <span className="selo" style={{ borderColor: corStatus(projeto.status), color: corStatus(projeto.status) }}>
          {rotuloStatus(projeto.status)}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ height: 4, background: 'var(--linha-forte)' }}>
          <div style={{ height: '100%', width: `${prog.pct}%`, background: 'var(--azul)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--texto-3)' }}>
          <span>{prog.total === 0 ? 'Sem tarefas' : `${abertas} aberta${abertas === 1 ? '' : 's'} de ${prog.total}`}</span>
          <span>{prog.pct}%</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--texto-3)' }}>
        <span>
          {projeto.deadline ? (
            <strong style={{ color: cor, fontWeight: 400 }}>
              {formatarData(projeto.deadline)}
              {prazo && !concluido && ` · ${prazo}`}
            </strong>
          ) : (
            'sem deadline'
          )}
        </span>
        {meu && <span style={{ color: 'var(--azul)' }}>Você está aqui</span>}
        {!projeto.publicado && <span>fora do site</span>}
      </div>

      {equipe.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--texto-2)', lineHeight: 1.6 }}>
          {equipe.map((m) => (m.papel === 'lider' ? `${m.nome} (líder)` : m.nome)).join(' · ')}
        </div>
      )}
    </Link>
  );
}

function Grade({ titulo, descricao, projetos, idsMeus, vazio }) {
  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 24, margin: 0 }}>{titulo}</h2>
        {descricao && <p style={{ fontSize: 14, color: 'var(--texto-3)', margin: '8px 0 0' }}>{descricao}</p>}
      </div>
      {projetos.length === 0 ? (
        <div className="painel" style={{ color: 'var(--texto-3)', fontSize: 14 }}>{vazio}</div>
      ) : (
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {projetos.map((p) => <Cartao key={p.id} projeto={p} meu={idsMeus.has(p.id)} />)}
        </div>
      )}
    </section>
  );
}

export default async function PaginaProjetos() {
  const usuario = await exigirUsuario();
  if (!podeVerProjetos(usuario.cargo)) redirect('/membros/trainee');

  const supabase = criarClienteServidor();

  // Uma consulta só, com os relacionamentos embutidos: trazer tarefas e
  // equipe junto é o que permite calcular progresso sem N+1 por cartão.
  const { data: brutos } = await supabase
    .from('projetos')
    .select(`
      id, slug, titulo, subtitulo, status, deadline, publicado,
      projeto_membros ( usuario_id, papel, profiles ( nome ) ),
      projeto_tarefas ( id, status )
    `)
    .eq('arquivado', false)
    .order('deadline', { ascending: true, nullsFirst: false });

  const projetos = (brutos ?? []).map((p) => ({
    ...p,
    tarefas: p.projeto_tarefas ?? [],
    equipe: (p.projeto_membros ?? []).map((m) => ({
      usuario_id: m.usuario_id,
      papel: m.papel,
      nome: m.profiles?.nome ?? '—',
    })),
  }));

  const idsMeus = new Set(
    projetos.filter((p) => p.equipe.some((m) => m.usuario_id === usuario.id)).map((p) => p.id),
  );

  const meus = projetos.filter((p) => idsMeus.has(p.id));
  const outros = projetos.filter((p) => !idsMeus.has(p.id));

  // Minhas tarefas abertas em todos os projetos: a visão que responde
  // "o que eu tenho para fazer agora" sem abrir projeto por projeto.
  const { data: minhasTarefas } = await supabase
    .from('projeto_tarefas')
    .select('id, titulo, prazo, projetos ( slug, titulo )')
    .eq('responsavel_id', usuario.id)
    .neq('status', 'feito')
    .order('prazo', { ascending: true, nullsFirst: false })
    .limit(12);

  return (
    <div style={{ display: 'grid', gap: 48 }}>
      <div>
        <h1 style={{ fontSize: 34, lineHeight: 1.15, margin: 0 }}>Projetos</h1>
      </div>

      {podeAbrirProjeto(usuario.cargo) && <NovoProjeto />}

      {(minhasTarefas ?? []).length > 0 && (
        <section style={{ display: 'grid', gap: 16 }}>
          <h2 style={{ fontSize: 24, margin: 0 }}>Suas tarefas abertas</h2>
          <div className="painel" style={{ padding: 0, overflow: 'hidden' }}>
            {minhasTarefas.map((t) => {
              const cor = COR_URGENCIA[urgencia(t.prazo)];
              return (
                <Link
                  key={t.id}
                  href={`/membros/projetos/${t.projetos?.slug ?? ''}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--linha)',
                    color: 'inherit',
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: 'var(--osso)' }}>
                    {t.titulo}
                    <span style={{ color: 'var(--texto-3)', fontSize: 12 }}> · {t.projetos?.titulo}</span>
                  </span>
                  <span style={{ color: cor, fontSize: 12 }}>
                    {t.prazo ? `${formatarData(t.prazo)} · ${rotuloPrazo(t.prazo)}` : 'sem prazo'}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <Grade
        titulo="Seus projetos"
        projetos={meus}
        idsMeus={idsMeus}
        vazio="Você não está alocado em nenhum projeto."
      />

      <Grade
        titulo="Outros projetos"
        projetos={outros}
        idsMeus={idsMeus}
        vazio="Nenhum outro projeto."
      />
    </div>
  );
}
