import Link from 'next/link';
import { ehGestao, podeVerAreaGeral } from '@/lib/cargos';
import { exigirUsuario } from '@/lib/auth';
import { criarClienteServidor } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function Atalho({ href, titulo, texto }) {
  return (
    <Link href={href} className="painel" style={{ display: 'block', color: 'inherit' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 21, lineHeight: 1.3, marginBottom: 10 }}>{titulo}</div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--texto-3)' }}>{texto}</p>
    </Link>
  );
}

export default async function PainelMembros() {
  const usuario = await exigirUsuario();
  const gestao = ehGestao(usuario.cargo);
  const areaGeral = podeVerAreaGeral(usuario.cargo);

  // Os números da liga são para quem já foi efetivado. Para o trainee, nem
  // consultamos: além de não aparecer, evita três queries por visita.
  let numeros = [];
  if (areaGeral) {
    const supabase = criarClienteServidor();
    const [membros, materiais, projetos] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('materiais').select('id', { count: 'exact', head: true }),
      supabase.from('projetos').select('id', { count: 'exact', head: true }).eq('publicado', true),
    ]);

    numeros = [
      ['Membros ativos', membros.count ?? 0],
      ['Materiais', materiais.count ?? 0],
      ['Projetos no site', projetos.count ?? 0],
    ];
  }

  const primeiroNome = usuario.nome.split(' ')[0];

  return (
    <div style={{ display: 'grid', gap: 48 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Bem-vindo de volta</div>
        <h1 style={{ fontSize: 42, lineHeight: 1.1, marginBottom: 16 }}>Olá, {primeiroNome}.</h1>
        <p className="p-corpo" style={{ maxWidth: '58ch', margin: 0 }}>
          {!areaGeral
            ? 'Aqui ficam as datas de entrega do programa de trainee e o material de apoio de cada encontro.'
            : gestao
              ? 'Além do material de estudo, você administra os usuários da liga e o conteúdo que aparece no site público.'
              : 'Aqui ficam o quadro de membros e a biblioteca de referência e estudo da liga.'}
        </p>
      </div>

      {numeros.length > 0 && (
        <div className="grade-hairline grade-3">
          {numeros.map(([rotulo, valor]) => (
            <div key={rotulo} style={{ padding: '28px 26px' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 34, lineHeight: 1 }}>{valor}</div>
              <div className="eyebrow" style={{ marginTop: 10, letterSpacing: '0.16em' }}>{rotulo}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <Atalho
          href="/membros/trainee"
          titulo="Entregas e handouts"
          texto="As datas do programa de trainee e o material de apoio de cada encontro."
        />
        {areaGeral && (
          <>
            <Atalho
              href="/membros/materiais"
              titulo="Materiais de estudo"
              texto="Apostilas, papers, notebooks e links de referência organizados por tema."
            />
            <Atalho
              href="/membros/quadro"
              titulo="Quadro de membros"
              texto="Quem está na liga hoje, em qual cargo e em qual frente de trabalho."
            />
          </>
        )}
        <Atalho
          href="/membros/conta"
          titulo="Minha conta"
          texto="Atualize seus dados e troque sua senha. Só você pode alterá-la."
        />
        {gestao && (
          <>
            <Atalho
              href="/membros/gestao/usuarios"
              titulo="Usuários"
              texto="Cadastre novos membros, ajuste cargos e desative quem saiu da liga."
            />
            <Atalho
              href="/membros/gestao/projetos"
              titulo="Projetos do site"
              texto="Controle o que aparece na seção de projetos da landing e o que fica no “carregar mais”."
            />
          </>
        )}
      </div>
    </div>
  );
}
