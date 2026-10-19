'use server';

import { revalidatePath } from 'next/cache';
import { ehComandoProjetos } from '@/lib/cargos';
import {
  STATUS_PROJETO,
  STATUS_TAREFA,
  podeAbrirProjeto,
  podeEditarProjeto,
  podeGerirEquipe,
  podeVerProjetos,
} from '@/lib/projetos';
import { usuarioOuNulo } from '@/lib/auth';
import { criarClienteAdmin } from '@/lib/supabase/server';

const erro = (mensagem) => ({ ok: false, erro: mensagem });
const sucesso = (extra) => ({ ok: true, ...extra });

/**
 * Erro do Supabase → mensagem que diz o que fazer.
 *
 * O caso que mais aparece é a migração não ter sido aplicada: o PostgREST
 * devolve "Could not find the 'x' column in the schema cache", que não diz
 * nada a quem está usando a tela. Como todas as tabelas e colunas desta
 * área vêm de um arquivo só, é seguro apontar direto para ele.
 */
function mensagemErro(error, acao = 'salvar') {
  if (!error) return `Não foi possível ${acao}.`;

  const faltando =
    error.code === 'PGRST204' || // coluna ausente no cache do PostgREST
    error.code === '42P01' || // tabela não existe
    error.code === '42703' || // coluna não existe
    error.code === '42704' || // tipo/enum não existe
    /schema cache|does not exist/i.test(error.message ?? '');

  if (faltando) {
    return (
      'O banco ainda não tem as tabelas do acompanhamento de projetos. ' +
      'Rode supabase/migracao-projetos-acompanhamento.sql no SQL Editor do Supabase e tente de novo.'
    );
  }

  if (error.code === '23505') return 'Já existe um projeto com esse identificador (slug).';

  return `Não foi possível ${acao}: ${error.message}`;
}

const limpar = (v) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
};

async function registrar(ator, acao, entidade, entidadeId, detalhes) {
  try {
    await criarClienteAdmin().from('auditoria').insert({
      ator_id: ator.id,
      acao,
      entidade,
      entidade_id: entidadeId ? String(entidadeId) : null,
      detalhes: detalhes ?? null,
    });
  } catch {
    // Auditoria é registro, não pré-requisito: falhar aqui não desfaz a ação.
  }
}

/**
 * Porta de entrada de toda action: resolve ator, projeto e nível de acesso.
 *
 * As actions usam o cliente admin (que ignora RLS), então é esta checagem
 * que de fato vale — o RLS da migração é a segunda camada, para o caso de
 * alguém falar com o Supabase direto.
 */
async function contexto(projetoId, { exigirEquipe = false } = {}) {
  const ator = await usuarioOuNulo();
  if (!ator) throw new Error('Sessão expirada. Entre de novo.');
  if (!podeVerProjetos(ator.cargo)) throw new Error('Área restrita a membros efetivados.');
  if (!projetoId) throw new Error('Projeto não informado.');

  const admin = criarClienteAdmin();

  // As duas consultas em paralelo, não em fila. Cada ida ao Supabase custa
  // centenas de ms; encadeá-las dobrava o tempo de TODA action antes mesmo
  // de a escrita começar. `inicio` e `deadline` vêm junto para a validação
  // de datas não precisar de uma terceira ida.
  const [{ data: projeto }, { data: alocacao }] = await Promise.all([
    admin.from('projetos').select('id, slug, titulo, inicio, deadline').eq('id', projetoId).maybeSingle(),
    admin
      .from('projeto_membros')
      .select('papel')
      .eq('projeto_id', projetoId)
      .eq('usuario_id', ator.id)
      .maybeSingle(),
  ]);

  if (!projeto) throw new Error('Projeto não encontrado.');

  if (exigirEquipe && !podeGerirEquipe(ator)) {
    throw new Error('Só a presidência e o diretor de projetos podem fazer isso.');
  }
  if (!exigirEquipe && !podeEditarProjeto(ator, alocacao)) {
    throw new Error('Você não está alocado neste projeto.');
  }

  return { ator, admin, projeto, alocacao, comando: ehComandoProjetos(ator.cargo) };
}

/**
 * `landing` só quando o que mudou aparece no site público.
 *
 * Regenerar a home custa as consultas dela inteiras (projetos + cache do
 * Instagram). Fazer isso ao renomear uma tarefa interna era puro desperdício
 * no caminho crítico de cada tecla.
 */
function revalidar(projeto, { landing = false } = {}) {
  revalidatePath('/membros/projetos');
  revalidatePath(`/membros/projetos/${projeto.slug}`);
  if (landing) revalidatePath('/');
}

/** Embrulha para o cliente nunca receber um throw cru. */
const proteger = (fn) => async (args) => {
  try {
    return await fn(args);
  } catch (e) {
    return erro(e?.message ?? 'Não foi possível concluir a ação.');
  }
};

/* ==================================================================
   EDIÇÃO INLINE

   Uma action só para todos os campos de todas as tabelas. O que impede
   isso de virar um buraco é a lista fechada abaixo: campo que não está
   aqui não é gravável, e os de `vitrine` exigem o comando de projetos
   mesmo que o ator esteja alocado nele.
   ================================================================== */

const TEXTO = 'texto';
const DATA = 'data';
const BOOL = 'bool';
const NUM = 'num';
const UUID = 'uuid';
const LISTA = 'lista'; // "Rótulo | texto" por linha → jsonb
const DATAHORA = 'datahora'; // reunião é instante, não dia
const URL = 'url';

const CAMPOS = {
  projetos: {
    // Acompanhamento interno: quem está alocado edita.
    equipe: {
      status: { tipo: TEXTO, valida: (v) => Boolean(STATUS_PROJETO[v]) },
      inicio: { tipo: DATA },
      deadline: { tipo: DATA },
      briefing: { tipo: TEXTO },
    },
    // Vitrine da landing: só o comando de projetos, porque isto é a cara
    // pública da liga.
    vitrine: {
      titulo: { tipo: TEXTO, obrigatorio: true },
      subtitulo: { tipo: TEXTO },
      resumo: { tipo: TEXTO, obrigatorio: true },
      selo: { tipo: TEXTO },
      contexto: { tipo: TEXTO },
      ano: { tipo: TEXTO },
      parceiro_nome: { tipo: TEXTO },
      parceiro_logo: { tipo: TEXTO },
      parceiro_prefixo: { tipo: TEXTO },
      paper_url: { tipo: TEXTO },
      paper_nome: { tipo: TEXTO },
      detalhes: { tipo: LISTA, chaves: ['rotulo', 'texto'] },
      metricas: { tipo: LISTA, chaves: ['valor', 'rotulo'] },
      destaque: { tipo: BOOL },
      publicado: { tipo: BOOL },
      ordem: { tipo: NUM },
      arquivado: { tipo: BOOL },
    },
  },
  projeto_tarefas: {
    equipe: {
      titulo: { tipo: TEXTO, obrigatorio: true },
      descricao: { tipo: TEXTO },
      status: { tipo: TEXTO, valida: (v) => STATUS_TAREFA.includes(v) },
      responsavel_id: { tipo: UUID },
      prazo: { tipo: DATA },
      ordem: { tipo: NUM },
    },
  },
  projeto_marcos: {
    equipe: {
      titulo: { tipo: TEXTO, obrigatorio: true },
      descricao: { tipo: TEXTO },
      data: { tipo: DATA },
      concluido: { tipo: BOOL },
      ordem: { tipo: NUM },
    },
  },
  projeto_metas: {
    equipe: {
      titulo: { tipo: TEXTO, obrigatorio: true },
      atual: { tipo: TEXTO },
      alvo: { tipo: TEXTO },
      concluida: { tipo: BOOL },
      ordem: { tipo: NUM },
    },
  },
  projeto_reunioes: {
    equipe: {
      titulo: { tipo: TEXTO, obrigatorio: true },
      quando: { tipo: DATAHORA },
      link: { tipo: URL },
    },
  },
};

/** Texto do formulário → valor do banco, conforme o tipo declarado. */
function converter(regra, valor) {
  switch (regra.tipo) {
    case BOOL:
      return Boolean(valor);
    case NUM: {
      const n = Number(valor);
      return Number.isFinite(n) ? n : 0;
    }
    case DATA: {
      const s = limpar(valor);
      if (!s) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('Data inválida.');
      return s;
    }
    case UUID: {
      const s = limpar(valor);
      if (!s) return null;
      if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error('Referência inválida.');
      return s;
    }
    case DATAHORA: {
      const s = limpar(valor);
      if (!s) return null;
      // O input datetime-local manda "2026-05-20T15:30" sem fuso. Interpretar
      // no fuso de quem digitou é o certo: a pessoa marcou 15h onde ela está.
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) throw new Error('Data e hora inválidas.');
      return d.toISOString();
    }
    case URL: {
      const s = limpar(valor);
      if (!s) return null;
      if (!/^https?:\/\//i.test(s)) throw new Error('O link precisa começar com http:// ou https://.');
      return s;
    }
    case LISTA: {
      const [a, b] = regra.chaves;
      return String(valor ?? '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((linha) => {
          const [primeiro, ...resto] = linha.split('|');
          return { [a]: primeiro.trim(), [b]: resto.join('|').trim() };
        })
        .filter((o) => o[a]);
    }
    default: {
      const s = limpar(valor);
      if (!s && regra.obrigatorio) throw new Error('Este campo não pode ficar vazio.');
      if (regra.valida && !regra.valida(s)) throw new Error('Valor inválido.');
      return s;
    }
  }
}

export const atualizarCampo = proteger(async ({ tabela, id, projetoId, campo, valor }) => {
  const grupo = CAMPOS[tabela];
  if (!grupo) return erro('Tabela não editável.');

  const regra = grupo.equipe?.[campo] ?? grupo.vitrine?.[campo];
  if (!regra) return erro('Campo não editável.');

  const soComando = Boolean(grupo.vitrine?.[campo]);
  const { ator, admin, projeto, comando } = await contexto(projetoId);
  if (soComando && !comando) {
    return erro('Este campo é da vitrine do site: só a presidência e o diretor de projetos editam.');
  }

  const convertido = converter(regra, valor);

  // Deadline antes do início seria um prazo impossível de cumprir. Os dois
  // valores atuais já vieram no contexto(), então isto não custa ida ao banco.
  if (tabela === 'projetos' && (campo === 'inicio' || campo === 'deadline')) {
    const inicio = campo === 'inicio' ? convertido : projeto.inicio;
    const deadline = campo === 'deadline' ? convertido : projeto.deadline;
    if (inicio && deadline && deadline < inicio) {
      return erro('A deadline não pode ser anterior ao início.');
    }
  }

  // Responsável tem de estar alocado: tarefa de quem não está no projeto
  // não aparece na lista dele e por isso nunca anda.
  if (tabela === 'projeto_tarefas' && campo === 'responsavel_id' && convertido) {
    const { data: alocado } = await admin
      .from('projeto_membros')
      .select('usuario_id')
      .eq('projeto_id', projetoId)
      .eq('usuario_id', convertido)
      .maybeSingle();
    if (!alocado) return erro('O responsável precisa estar alocado no projeto.');
  }

  // `projetos` é a própria linha do projeto; as outras são filhas dele e o
  // filtro por projeto_id impede editar item de outro projeto passando o id.
  const consulta = admin.from(tabela).update({ [campo]: convertido }).eq('id', id);

  // Escrita e auditoria em paralelo: este é o caminho mais percorrido da
  // área (cada campo editado passa aqui) e a auditoria em fila dobrava a
  // espera. O registro sai mesmo se a escrita falhar, o que é aceitável —
  // a tabela existe para dizer quem tentou o quê.
  const [{ error }] = await Promise.all([
    tabela === 'projetos' ? consulta : consulta.eq('projeto_id', projetoId),
    registrar(ator, 'editar_campo', tabela, id, { campo }),
  ]);

  if (error) return erro(mensagemErro(error, 'salvar'));

  // Só campo de vitrine muda o site público; o resto é interno.
  revalidar(projeto, { landing: soComando });
  return sucesso();
});

/* ==================================================================
   CRIAR / EXCLUIR ITENS

   Quick add: só o título. O resto é editado inline depois — pedir todos
   os campos de uma vez é o que fazia ninguém registrar tarefa.
   ================================================================== */

const CRIAVEIS = ['projeto_tarefas', 'projeto_marcos', 'projeto_metas', 'projeto_reunioes'];

export const criarItem = proteger(async ({ tabela, projetoId, titulo, extra }) => {
  if (!CRIAVEIS.includes(tabela)) return erro('Item não criável.');

  const nome = limpar(titulo);
  if (!nome) return erro('Dê um título ao item.');

  const { ator, admin, projeto } = await contexto(projetoId);

  const linha = { projeto_id: projetoId, titulo: nome };

  // `extra` só entra pela lista fechada de campos da própria tabela, para
  // o cliente não conseguir injetar coluna arbitrária no insert.
  if (extra && typeof extra === 'object') {
    const permitidos = CAMPOS[tabela]?.equipe ?? {};
    for (const [campo, valor] of Object.entries(extra)) {
      if (permitidos[campo]) linha[campo] = converter(permitidos[campo], valor);
    }
  }

  // Só estas duas guardam quem criou; marcos e metas são do projeto, não
  // de uma pessoa.
  if (tabela === 'projeto_tarefas') linha.autor_id = ator.id;
  if (tabela === 'projeto_reunioes') linha.criado_por = ator.id;

  const { data: criado, error } = await admin.from(tabela).insert(linha).select('id').single();
  if (error) return erro(mensagemErro(error, 'criar'));

  await registrar(ator, 'criar_item', tabela, criado.id, { titulo: nome });
  revalidar(projeto);
  return sucesso({ id: criado.id });
});

export const excluirItem = proteger(async ({ tabela, id, projetoId }) => {
  if (!CRIAVEIS.includes(tabela)) return erro('Item não excluível.');

  const { ator, admin, projeto } = await contexto(projetoId);

  const { error } = await admin.from(tabela).delete().eq('id', id).eq('projeto_id', projetoId);
  if (error) return erro(mensagemErro(error, 'excluir'));

  await registrar(ator, 'excluir_item', tabela, id, null);
  revalidar(projeto);
  return sucesso();
});

/* ==================================================================
   QUADRO: arrastar e soltar
   ================================================================== */

/**
 * Recebe a coluna de destino já na ordem final. Gravar a lista inteira, em
 * vez de só a tarefa movida, é o que mantém `ordem` consistente — mover um
 * cartão para o meio empurra os de baixo.
 */
export const reordenarColuna = proteger(async ({ projetoId, status, ids }) => {
  if (!STATUS_TAREFA.includes(status)) return erro('Coluna inválida.');
  if (!Array.isArray(ids)) return erro('Ordem inválida.');

  const { ator, admin, projeto } = await contexto(projetoId);

  // Uma chamada por cartão, mas sempre filtrando por projeto_id: id de outro
  // projeto não é movido nem reordenado por aqui. Tudo em paralelo, incluindo
  // a auditoria — arrastar um cartão não pode esperar N round-trips em fila.
  const [registro, ...resultados] = await Promise.all([
    registrar(ator, 'reordenar_tarefas', 'projeto_tarefas', projetoId, { status, total: ids.length }),
    ...ids.map((id, i) =>
      admin
        .from('projeto_tarefas')
        .update({ status, ordem: i })
        .eq('id', id)
        .eq('projeto_id', projetoId),
    ),
  ]);
  void registro;

  const falhou = resultados.find((r) => r.error);
  if (falhou) return erro(mensagemErro(falhou.error, 'mover a tarefa'));

  revalidar(projeto);
  return sucesso();
});

/* ==================================================================
   EQUIPE
   ================================================================== */

export const alocarMembro = proteger(async ({ projetoId, usuarioId, papel }) => {
  const { ator, admin, projeto } = await contexto(projetoId, { exigirEquipe: true });

  const alvo = limpar(usuarioId);
  if (!alvo) return erro('Escolha quem alocar.');
  const cargo = papel === 'lider' ? 'lider' : 'membro';

  const { data: pessoa } = await admin
    .from('profiles')
    .select('nome, cargo, ativo')
    .eq('id', alvo)
    .maybeSingle();
  if (!pessoa || !pessoa.ativo) return erro('Membro não encontrado ou inativo.');
  // Trainee não entra: ele não tem acesso à área geral, então seria alocado
  // num projeto que não consegue abrir.
  if (!podeVerProjetos(pessoa.cargo)) return erro('Trainees ainda não podem ser alocados em projetos.');

  const { error } = await admin
    .from('projeto_membros')
    .upsert({ projeto_id: projetoId, usuario_id: alvo, papel: cargo }, { onConflict: 'projeto_id,usuario_id' });
  if (error) return erro(mensagemErro(error, 'alocar'));

  await registrar(ator, 'alocar_membro', 'projeto_membros', projetoId, { usuario_id: alvo, papel: cargo });
  revalidar(projeto);
  return sucesso({ mensagem: `${pessoa.nome} foi alocado.` });
});

export const mudarPapel = proteger(async ({ projetoId, usuarioId, papel }) => {
  const { ator, admin, projeto } = await contexto(projetoId, { exigirEquipe: true });

  const alvo = limpar(usuarioId);
  if (!alvo) return erro('Membro não informado.');
  const cargo = papel === 'lider' ? 'lider' : 'membro';

  const { error } = await admin
    .from('projeto_membros')
    .update({ papel: cargo })
    .eq('projeto_id', projetoId)
    .eq('usuario_id', alvo);
  if (error) return erro(mensagemErro(error, 'salvar'));

  await registrar(ator, 'mudar_papel_projeto', 'projeto_membros', projetoId, { usuario_id: alvo, papel: cargo });
  revalidar(projeto);
  return sucesso();
});

export const desalocarMembro = proteger(async ({ projetoId, usuarioId }) => {
  const { ator, admin, projeto } = await contexto(projetoId, { exigirEquipe: true });

  const alvo = limpar(usuarioId);
  if (!alvo) return erro('Membro não informado.');

  const { error } = await admin
    .from('projeto_membros')
    .delete()
    .eq('projeto_id', projetoId)
    .eq('usuario_id', alvo);
  if (error) return erro(mensagemErro(error, 'desalocar'));

  // As tarefas ficam, mas soltas: desalocar não apaga o profile, então o
  // ON DELETE SET NULL não dispara e a tarefa continuaria com responsável
  // que não está mais no projeto.
  await admin
    .from('projeto_tarefas')
    .update({ responsavel_id: null })
    .eq('projeto_id', projetoId)
    .eq('responsavel_id', alvo)
    .neq('status', 'feito');

  await registrar(ator, 'desalocar_membro', 'projeto_membros', projetoId, { usuario_id: alvo });
  revalidar(projeto);
  return sucesso();
});

/* ==================================================================
   CRIAR E EXCLUIR PROJETO
   ================================================================== */

const gerarSlug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

/**
 * Abrir projeto pede só o título — é o mínimo para a página existir e o
 * resto ser preenchido inline. Restrito ao comando de projetos: abrir
 * projeto é alocar gente e assumir compromisso, não ato individual.
 */
export const criarProjeto = proteger(async ({ titulo }) => {
  const ator = await usuarioOuNulo();
  if (!ator) return erro('Sessão expirada. Entre de novo.');
  if (!podeAbrirProjeto(ator.cargo)) {
    return erro('Só a presidência e o diretor de projetos abrem projetos.');
  }

  const nome = limpar(titulo);
  if (!nome) return erro('Dê um título ao projeto.');

  const admin = criarClienteAdmin();

  // Slug é unique: dois projetos de mesmo nome em semestres diferentes são
  // normais, então desempatamos com sufixo em vez de barrar a criação.
  const base = gerarSlug(nome) || 'projeto';
  let slug = base;
  for (let i = 2; i <= 30; i += 1) {
    const { data: existe } = await admin.from('projetos').select('id').eq('slug', slug).maybeSingle();
    if (!existe) break;
    slug = `${base}-${i}`;
  }

  const { data: criado, error } = await admin
    .from('projetos')
    .insert({
      titulo: nome,
      slug,
      // `resumo` é NOT NULL (a landing depende dele); fica com um texto
      // provisório até a gestão escrever o público.
      resumo: 'Projeto em andamento.',
      status: 'ideacao',
      publicado: false,
      destaque: false,
      criado_por: ator.id,
    })
    .select('id, slug')
    .single();

  if (error) return erro(mensagemErro(error, 'criar'));

  // O projeto nasce SEM equipe, de propósito: quem abre é a diretoria, que
  // em geral não vai trabalhar nele. Auto-alocar o criador poria na equipe
  // alguém que não é do grupo e deixaria o diretor como responsável por
  // tarefa que não é dele. Até alguém ser alocado, só o comando edita —
  // `criado_por` guarda quem abriu, sem implicar alocação.
  await registrar(ator, 'criar_projeto', 'projetos', criado.id, { titulo: nome });
  revalidatePath('/membros/projetos');
  return sucesso({ slug: criado.slug });
});

/** Excluir de vez é da gestão. Para tirar da lista sem perder nada: arquivar. */
export const excluirProjeto = proteger(async ({ projetoId }) => {
  const { ator, admin, projeto, comando } = await contexto(projetoId, { exigirEquipe: true });
  if (!comando) return erro('Só a presidência e o diretor de projetos excluem projeto.');

  const { data: completo } = await admin
    .from('projetos')
    .select('paper_path')
    .eq('id', projetoId)
    .maybeSingle();

  // Os anexos do bucket privado não caem com o ON DELETE CASCADE: o cascade
  // apaga as linhas, não os bytes no Storage.
  const { data: anexos } = await admin
    .from('projeto_arquivos')
    .select('path')
    .eq('projeto_id', projetoId)
    .not('path', 'is', null);

  const { error } = await admin.from('projetos').delete().eq('id', projetoId);
  if (error) return erro(mensagemErro(error, 'excluir'));

  const caminhos = (anexos ?? []).map((a) => a.path).filter(Boolean);
  if (caminhos.length > 0) await admin.storage.from('projetos').remove(caminhos);
  if (completo?.paper_path) await admin.storage.from('papers').remove([completo.paper_path]);

  await registrar(ator, 'excluir_projeto', 'projetos', projetoId, { titulo: projeto.titulo });
  revalidatePath('/membros/projetos');
  revalidatePath('/');
  return sucesso();
});
