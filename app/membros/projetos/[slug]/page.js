import { notFound, redirect } from 'next/navigation';
import { podeEditarProjeto, podeEditarVitrine, podeGerirEquipe, podeVerProjetos } from '@/lib/projetos';
import { exigirUsuario } from '@/lib/auth';
import { criarClienteServidor } from '@/lib/supabase/server';
import Abas from './Abas';
import Cabecalho from './Cabecalho';
import Equipe from './Equipe';
import Metas from './Metas';
import Reunioes from './Reunioes';
import Tarefas from './Tarefas';
import Vitrine from './Vitrine';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const supabase = criarClienteServidor();
  const { data } = await supabase.from('projetos').select('titulo').eq('slug', params.slug).maybeSingle();
  return { title: data ? `${data.titulo} · IQF` : 'Projeto · IQF' };
}

export default async function PaginaProjeto({ params }) {
  const usuario = await exigirUsuario();
  if (!podeVerProjetos(usuario.cargo)) redirect('/membros/trainee');

  const supabase = criarClienteServidor();

  const { data: projeto } = await supabase
    .from('projetos')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!projeto) notFound();

  // Tudo em paralelo: nenhuma destas consultas depende da outra.
  const [
    { data: equipe },
    { data: tarefas },
    { data: metas },
    { data: marcos },
    { data: reunioes },
    { data: candidatos },
  ] = await Promise.all([
    supabase
      .from('projeto_membros')
      .select('usuario_id, papel, profiles ( nome, email, cargo, area )')
      .eq('projeto_id', projeto.id),
    supabase
      .from('projeto_tarefas')
      .select('*, responsavel:profiles!projeto_tarefas_responsavel_id_fkey ( id, nome )')
      .eq('projeto_id', projeto.id)
      .order('ordem'),
    supabase.from('projeto_metas').select('*').eq('projeto_id', projeto.id).order('ordem'),
    supabase.from('projeto_marcos').select('*').eq('projeto_id', projeto.id).order('data', { nullsFirst: false }),
    supabase
      .from('projeto_reunioes')
      .select('*')
      .eq('projeto_id', projeto.id)
      .order('quando', { ascending: false, nullsFirst: false }),
    supabase
      .from('profiles')
      .select('id, nome, cargo, area')
      .eq('ativo', true)
      .neq('cargo', 'trainee')
      .order('nome'),
  ]);

  const membros = (equipe ?? []).map((m) => ({
    usuario_id: m.usuario_id,
    papel: m.papel,
    nome: m.profiles?.nome ?? '—',
    email: m.profiles?.email ?? null,
    cargo: m.profiles?.cargo ?? null,
    area: m.profiles?.area ?? null,
  }));

  const alocacao = membros.find((m) => m.usuario_id === usuario.id) ?? null;
  const podeEditar = podeEditarProjeto(usuario, alocacao);
  const podeVitrine = podeEditarVitrine(usuario);

  const listaTarefas = tarefas ?? [];
  const listaMetas = metas ?? [];
  const listaMarcos = marcos ?? [];
  const listaReunioes = reunioes ?? [];

  const abas = [
    {
      id: 'tarefas',
      label: 'Tarefas',
      contagem: listaTarefas.filter((t) => t.status !== 'feito').length,
      conteudo: (
        <Tarefas
          projetoId={projeto.id}
          tarefas={listaTarefas}
          equipe={membros}
          usuarioId={usuario.id}
          podeEditar={podeEditar}
        />
      ),
    },
    {
      id: 'metas',
      label: 'Metas',
      contagem: listaMetas.filter((m) => !m.concluida).length + listaMarcos.filter((m) => !m.concluido).length,
      conteudo: (
        <Metas projetoId={projeto.id} metas={listaMetas} marcos={listaMarcos} podeEditar={podeEditar} />
      ),
    },
    {
      id: 'reunioes',
      label: 'Reuniões',
      contagem: listaReunioes.length,
      conteudo: <Reunioes projetoId={projeto.id} reunioes={listaReunioes} podeEditar={podeEditar} />,
    },
    {
      id: 'equipe',
      label: 'Equipe',
      contagem: membros.length,
      conteudo: (
        <Equipe
          projetoId={projeto.id}
          equipe={membros}
          candidatos={candidatos ?? []}
          usuarioId={usuario.id}
          podeGerir={podeGerirEquipe(usuario)}
        />
      ),
    },
  ];

  // A vitrine só existe para quem pode editá-la: para o resto seria uma aba
  // inteira de campos travados.
  if (podeVitrine) {
    abas.push({ id: 'vitrine', label: 'Vitrine do site', conteudo: <Vitrine projeto={projeto} /> });
  }

  return (
    <div style={{ display: 'grid', gap: 40 }}>
      <Cabecalho
        projeto={projeto}
        tarefas={listaTarefas}
        equipe={membros}
        podeEditar={podeEditar}
        podeVitrine={podeVitrine}
      />
      {/* Projeto recém-aberto não tem equipe nem tarefa: cair no quadro vazio
          esconderia o próximo passo, que é alocar quem vai trabalhar nele. */}
      <Abas abas={abas} inicial={membros.length === 0 ? 'equipe' : 'tarefas'} />
    </div>
  );
}
