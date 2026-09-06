import { ehGestao } from '@/lib/cargos';
import { exigirUsuario } from '@/lib/auth';
import { criarClienteServidor } from '@/lib/supabase/server';
import GerenciarEntregas from './GerenciarEntregas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Trainee · IQF' };

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * '2026-03-14' vira uma data no fuso LOCAL.
 * new Date('2026-03-14') seria interpretado como UTC e, no Brasil, exibiria
 * 13 de março — a entrega apareceria um dia antes do prazo real.
 */
function comoData(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function hojeLocal() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

function diasRestantes(iso) {
  return Math.round((comoData(iso) - hojeLocal()) / 86400000);
}

function rotuloPrazo(dias) {
  if (dias < 0) return { texto: `encerrada há ${Math.abs(dias)} dia${Math.abs(dias) > 1 ? 's' : ''}`, cor: 'var(--texto-3)' };
  if (dias === 0) return { texto: 'entrega hoje', cor: '#E8B4B8' };
  if (dias === 1) return { texto: 'amanhã', cor: '#E8B4B8' };
  if (dias <= 7) return { texto: `em ${dias} dias`, cor: 'var(--azul)' };
  return { texto: `em ${dias} dias`, cor: 'var(--texto-3)' };
}

function Entrega({ e }) {
  const data = comoData(e.data_limite);
  const dias = diasRestantes(e.data_limite);
  const prazo = rotuloPrazo(dias);
  const passou = dias < 0;

  return (
    <article
      className="painel"
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 24,
        alignItems: 'start',
        opacity: passou ? 0.55 : 1,
      }}
    >
      <div style={{ textAlign: 'center', minWidth: 62 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 34, lineHeight: 1 }}>{data.getDate()}</div>
        <div className="eyebrow" style={{ marginTop: 6, letterSpacing: '0.16em' }}>{MESES[data.getMonth()]}</div>
      </div>

      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: prazo.cor, marginBottom: 8 }}>
          {DIAS[data.getDay()]} · {prazo.texto}
        </div>
        <h3 style={{ fontSize: 21, lineHeight: 1.3, marginBottom: e.descricao ? 8 : 0 }}>{e.titulo}</h3>
        {e.descricao && (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--texto-3)' }}>{e.descricao}</p>
        )}
        {e.url && (
          <a
            href={e.url}
            target="_blank"
            rel="noopener"
            style={{ display: 'inline-block', marginTop: 12, fontSize: 13, color: 'var(--azul)' }}
          >
            Entregar aqui →
          </a>
        )}
      </div>
    </article>
  );
}

function Handout({ m }) {
  const destino = m.tipo === 'link' ? m.url : `/api/materiais/${m.id}/download`;
  const mb = m.arquivo_bytes ? m.arquivo_bytes / (1024 * 1024) : null;
  const tamanho = mb ? (mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(m.arquivo_bytes / 1024)} KB`) : null;

  return (
    <a href={destino} target="_blank" rel="noopener" className="painel" style={{ display: 'block', color: 'inherit' }}>
      <div className="eyebrow" style={{ letterSpacing: '0.16em', marginBottom: 12 }}>
        {m.tipo === 'link' ? 'Link' : 'PDF'}
        {tamanho ? ` · ${tamanho}` : ''}
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.3, marginBottom: 6 }}>{m.titulo}</div>
      {m.descricao && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--texto-3)' }}>{m.descricao}</p>
      )}
    </a>
  );
}

export default async function Trainee() {
  const usuario = await exigirUsuario();
  const gestao = ehGestao(usuario.cargo);
  const supabase = criarClienteServidor();

  const [{ data: entregas }, { data: handouts }] = await Promise.all([
    supabase.from('entregas').select('*').order('data_limite').order('ordem'),
    supabase
      .from('materiais')
      .select('*')
      .eq('categoria', 'Trainee')
      .order('ordem')
      .order('created_at', { ascending: false }),
  ]);

  const lista = entregas ?? [];
  // Entregas passadas continuam visíveis, mas no fim: quem abre a página
  // quer saber o que vem, não o que já foi.
  const proximas = lista.filter((e) => diasRestantes(e.data_limite) >= 0);
  const passadas = lista.filter((e) => diasRestantes(e.data_limite) < 0).reverse();

  return (
    <div style={{ display: 'grid', gap: 48 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Programa de trainee</div>
        <h1 style={{ fontSize: 38, lineHeight: 1.1, marginBottom: 12 }}>Entregas e handouts</h1>
        <p className="p-corpo" style={{ maxWidth: '58ch', margin: 0 }}>
          As datas de entrega do programa e o material de apoio de cada encontro.
        </p>
      </div>

      {gestao && <GerenciarEntregas entregas={lista} />}

      <section>
        <div className="eyebrow" style={{ marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--linha-forte)' }}>
          Próximas entregas · {proximas.length}
        </div>
        {proximas.length === 0 ? (
          <div className="painel" style={{ color: 'var(--texto-3)' }}>
            Nenhuma entrega marcada.
            {gestao ? ' Cadastre as datas do semestre no painel acima.' : ''}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {proximas.map((e) => <Entrega key={e.id} e={e} />)}
          </div>
        )}
      </section>

      {passadas.length > 0 && (
        <section>
          <div className="eyebrow" style={{ marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--linha)' }}>
            Já encerradas · {passadas.length}
          </div>
          <div style={{ display: 'grid', gap: 20 }}>
            {passadas.map((e) => <Entrega key={e.id} e={e} />)}
          </div>
        </section>
      )}

      <section>
        <div className="eyebrow" style={{ marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--linha-forte)' }}>
          Handouts · {(handouts ?? []).length}
        </div>
        {(handouts ?? []).length === 0 ? (
          <div className="painel" style={{ color: 'var(--texto-3)' }}>
            Nenhum handout ainda.
            {gestao
              ? ' Suba os PDFs em Materiais escolhendo a categoria "Trainee" — eles aparecem aqui automaticamente.'
              : ''}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {(handouts ?? []).map((m) => <Handout key={m.id} m={m} />)}
          </div>
        )}
      </section>
    </div>
  );
}
