import { redirect } from 'next/navigation';
import { ehGestao, podeVerAreaGeral } from '@/lib/cargos';
import { exigirUsuario } from '@/lib/auth';
import { criarClienteServidor } from '@/lib/supabase/server';
import GerenciarMateriais from './GerenciarMateriais';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Materiais · IQF' };

const formatarTamanho = (bytes) => {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

function Material({ m }) {
  const destino = m.tipo === 'link' ? m.url : `/api/materiais/${m.id}/download`;
  const tamanho = formatarTamanho(m.arquivo_bytes);

  return (
    <a
      href={destino}
      target="_blank"
      rel="noopener"
      className="painel"
      style={{ display: 'block', color: 'inherit', transition: 'border-color .3s ease' }}
    >
      <div className="eyebrow" style={{ letterSpacing: '0.16em', marginBottom: 12 }}>
        {m.tipo === 'link' ? 'Link' : 'Arquivo'}
        {tamanho ? ` · ${tamanho}` : ''}
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 20, lineHeight: 1.3, marginBottom: 8 }}>{m.titulo}</div>
      {m.descricao && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--texto-3)' }}>{m.descricao}</p>
      )}
    </a>
  );
}

export default async function Materiais() {
  const usuario = await exigirUsuario();
  // O trainee tem os handouts dele em /membros/trainee; a biblioteca geral
  // não é para ele. Guarda no servidor, não só o link escondido no menu.
  if (!podeVerAreaGeral(usuario.cargo)) redirect('/membros/trainee');

  const gestao = ehGestao(usuario.cargo);

  const supabase = criarClienteServidor();
  const { data: materiais } = await supabase
    .from('materiais')
    .select('*')
    .order('categoria')
    .order('ordem')
    .order('created_at', { ascending: false });

  // Agrupa por categoria preservando a ordem que veio do banco.
  const porCategoria = (materiais ?? []).reduce((acc, m) => {
    (acc[m.categoria] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div style={{ display: 'grid', gap: 48 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Biblioteca</div>
        <h1 style={{ fontSize: 38, lineHeight: 1.1, marginBottom: 12 }}>Materiais de referência e estudo</h1>
        <p className="p-corpo" style={{ maxWidth: '58ch', margin: 0 }}>
          Apostilas, papers, notebooks e links usados nos treinamentos e projetos da liga.
        </p>
      </div>

      {gestao && <GerenciarMateriais materiais={materiais ?? []} />}

      {Object.keys(porCategoria).length === 0 ? (
        <div className="painel" style={{ color: 'var(--texto-3)' }}>
          Nenhum material cadastrado ainda.
          {gestao ? ' Use o formulário acima para adicionar o primeiro.' : ''}
        </div>
      ) : (
        Object.entries(porCategoria).map(([categoria, itens]) => (
          <section key={categoria}>
            <div
              className="eyebrow"
              style={{ marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--linha-forte)' }}
            >
              {categoria} · {itens.length}
            </div>
            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {itens.map((m) => <Material key={m.id} m={m} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
