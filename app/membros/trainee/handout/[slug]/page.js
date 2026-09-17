import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirUsuario } from '@/lib/auth';
import { ehGestao } from '@/lib/cargos';
import { acharHandout, formatarLiberacao, partirHandout } from '@/lib/handouts';
import { baixarHandout, handoutsVisiveis } from '@/lib/handouts-storage';
import ComportamentoHandout from './ComportamentoHandout';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }) {
  const handout = acharHandout(params.slug);
  return { title: handout ? `${handout.titulo} · Handout ${handout.numero} · IQF` : 'Handout · IQF' };
}

export default async function PaginaHandout({ params }) {
  const usuario = await exigirUsuario();
  const gestao = ehGestao(usuario.cargo);

  const handout = acharHandout(params.slug);
  if (!handout) notFound();

  // handoutsVisiveis() já aplica a data de liberação, então um trainee com o
  // link de uma aula que não abriu cai em 404 igual a quem inventou a URL.
  const disponiveis = (await handoutsVisiveis(gestao)).filter((h) => h.hospedado);
  const indice = disponiveis.findIndex((h) => h.slug === handout.slug);
  if (indice < 0) notFound();
  const atual = disponiveis[indice];
  const anterior = disponiveis[indice - 1];
  const proximo = disponiveis[indice + 1];

  // O handout é escrito pela gestão e guardado em bucket privado com escrita
  // restrita — é conteúdo nosso, não entrada de usuário, e por isso vai direto
  // na página. O CSS dele é todo escopado em `.handout` (ver _estilo.css), o
  // que impede o estilo da aula de vazar para o resto da área de membros.
  const partes = partirHandout(await baixarHandout(handout));

  if (!partes) {
    return (
      <div style={{ display: 'grid', gap: 24 }}>
        <Link href="/membros/trainee" style={{ fontSize: 13, color: 'var(--texto-3)' }}>
          ← Entregas e handouts
        </Link>
        <div className="painel" style={{ color: 'var(--texto-3)' }}>
          Não foi possível ler este handout. O arquivo no bucket não está no formato que a página
          espera{gestao ? ' — remonte com conteudo/handouts/_montar.mjs e suba de novo.' : '.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <div>
        <Link href="/membros/trainee" style={{ fontSize: 13, color: 'var(--texto-3)' }}>
          ← Entregas e handouts
        </Link>
      </div>

      {/* Gestão chega aqui antes da turma; o aviso evita achar que já abriu. */}
      {!atual.liberado && (
        <div className="painel" style={{ fontSize: 14, color: 'var(--texto-3)', borderColor: 'var(--azul)' }}>
          Ainda fechado para os trainees — abre em {formatarLiberacao(atual.liberadoEm)}. Você está
          vendo como gestão.
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: partes.estilo }} />
      <div dangerouslySetInnerHTML={{ __html: partes.corpo }} />
      <ComportamentoHandout />

      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          paddingTop: 20,
          borderTop: '1px solid var(--linha)',
          fontSize: 13,
        }}
      >
        {anterior ? (
          <Link href={`/membros/trainee/handout/${anterior.slug}`} style={{ color: 'var(--azul)' }}>
            ← Handout {anterior.numero} · {anterior.titulo}
          </Link>
        ) : (
          <span />
        )}
        {proximo && (
          <Link href={`/membros/trainee/handout/${proximo.slug}`} style={{ color: 'var(--azul)' }}>
            Handout {proximo.numero} · {proximo.titulo} →
          </Link>
        )}
      </nav>
    </div>
  );
}
