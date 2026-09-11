'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { CARGOS, cargosAtribuiveis, ehGestao, podeAlterarCargo, podeEditarUsuario } from '@/lib/cargos';
import { usuarioOuNulo } from '@/lib/auth';
import { criarClienteAdmin, criarClienteServidor } from '@/lib/supabase/server';

/** Toda action passa por aqui: sem gestão, nada acontece. */
async function exigirGestao() {
  const ator = await usuarioOuNulo();
  if (!ator || !ehGestao(ator.cargo)) {
    throw new Error('Ação restrita aos cargos de gestão.');
  }
  return ator;
}

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

const texto = (fd, campo) => {
  const v = fd.get(campo);
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
};

const erro = (mensagem) => ({ ok: false, erro: mensagem });
const sucesso = (mensagem) => ({ ok: true, mensagem });

/* ==================================================================
   USUÁRIOS
   ================================================================== */

/**
 * Cria o usuário no auth do Supabase e o perfil correspondente.
 * A senha inicial é definida aqui e o membro a troca depois em /membros/conta —
 * a gestão nunca consegue ler nem reeditar a senha de ninguém.
 */
export async function criarUsuario(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(e.message);
  }

  const email = texto(formData, 'email')?.toLowerCase();
  const nome = texto(formData, 'nome');
  const cargo = texto(formData, 'cargo') || 'trainee';
  const senha = formData.get('senha');

  if (!email || !nome) return erro('Nome e e-mail são obrigatórios.');
  if (!CARGOS[cargo]) return erro('Cargo inválido.');
  if (typeof senha !== 'string' || senha.length < 8) {
    return erro('A senha inicial precisa ter pelo menos 8 caracteres.');
  }
  if (!cargosAtribuiveis(ator.cargo).some((c) => c.valor === cargo)) {
    return erro('Só a presidência pode criar usuários em cargos de gestão.');
  }

  const admin = criarClienteAdmin();

  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true, // cadastro é interno; não faz sentido exigir confirmação
    user_metadata: { nome },
  });

  if (erroAuth) {
    return erro(
      erroAuth.message.includes('already registered')
        ? 'Já existe um usuário com esse e-mail.'
        : `Não foi possível criar o usuário: ${erroAuth.message}`,
    );
  }

  const { error: erroPerfil } = await admin.from('profiles').insert({
    id: criado.user.id,
    email,
    nome,
    cargo,
    area: texto(formData, 'area'),
    turma: texto(formData, 'turma'),
    linkedin: texto(formData, 'linkedin'),
  });

  if (erroPerfil) {
    // Sem perfil o login existiria sem identidade: desfaz o usuário do auth.
    await admin.auth.admin.deleteUser(criado.user.id);
    return erro(`Não foi possível criar o perfil: ${erroPerfil.message}`);
  }

  await registrar(ator, 'criar_usuario', 'profiles', criado.user.id, { email, cargo });
  revalidatePath('/membros/gestao/usuarios');
  revalidatePath('/membros/quadro');
  return sucesso(`${nome} foi cadastrado. Avise para trocar a senha no primeiro acesso.`);
}

/**
 * Edita os dados de um usuário. Deliberadamente NÃO toca em senha:
 * nenhum campo de senha é lido aqui, então nem por engano ela é sobrescrita.
 */
export async function editarUsuario(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(e.message);
  }

  const id = texto(formData, 'id');
  const nome = texto(formData, 'nome');
  if (!id || !nome) return erro('Dados incompletos.');

  const admin = criarClienteAdmin();
  const { data: alvo } = await admin.from('profiles').select('*').eq('id', id).single();
  if (!alvo) return erro('Usuário não encontrado.');

  if (!podeEditarUsuario(ator.cargo, alvo.cargo)) {
    return erro('Só a presidência pode editar perfis da presidência.');
  }

  // Cargo é campo à parte: só a presidência mexe, e nunca no próprio.
  // Para os demais, o valor do formulário é ignorado e o atual é mantido.
  const cargoPedido = texto(formData, 'cargo');
  let cargoFinal = alvo.cargo;
  if (cargoPedido && cargoPedido !== alvo.cargo) {
    if (!podeAlterarCargo(ator.cargo)) {
      return erro('Apenas presidente e vice-presidente podem alterar cargos.');
    }
    if (ator.id === id) return erro('Você não pode alterar o próprio cargo.');
    if (!CARGOS[cargoPedido]) return erro('Cargo inválido.');
    cargoFinal = cargoPedido;
  }

  const ativo = formData.get('ativo') === 'on';
  if (ator.id === id && !ativo) return erro('Você não pode desativar a própria conta.');

  const { error } = await admin
    .from('profiles')
    .update({
      nome,
      cargo: cargoFinal,
      area: texto(formData, 'area'),
      turma: texto(formData, 'turma'),
      linkedin: texto(formData, 'linkedin'),
      bio: texto(formData, 'bio'),
      ativo,
    })
    .eq('id', id);

  if (error) return erro(`Não foi possível salvar: ${error.message}`);

  await registrar(ator, 'editar_usuario', 'profiles', id, { cargo: cargoFinal, ativo });
  revalidatePath('/membros/gestao/usuarios');
  revalidatePath('/membros/quadro');
  return sucesso('Usuário atualizado.');
}

/**
 * Dispara o e-mail de redefinição para o usuário.
 * É o único caminho pelo qual a gestão "mexe" em senha — e mesmo assim quem
 * define a nova é o próprio dono da conta, pelo link no e-mail.
 */
export async function enviarRedefinicaoSenha(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(e.message);
  }

  const email = texto(formData, 'email');
  const origem = texto(formData, 'origem');
  if (!email) return erro('E-mail ausente.');

  const supabase = criarClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/membros/conta/redefinir`,
  });
  if (error) return erro(`Não foi possível enviar: ${error.message}`);

  await registrar(ator, 'enviar_redefinicao', 'profiles', null, { email });
  return sucesso(`Link de redefinição enviado para ${email}.`);
}

/* ==================================================================
   CONVITES DE TRAINEE
   ================================================================== */

/**
 * Gera um link de cadastro para trainees.
 *
 * Não recebe cargo: o convite cria trainee e só trainee — o banco tem um
 * CHECK que recusa qualquer outro valor, e a action pública que consome o
 * token nem lê cargo do formulário. Assim um link vazado no WhatsApp da
 * turma, no pior caso, cria um trainee a mais — nunca um diretor.
 */
export async function criarConvite(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(e.message);
  }

  const rotulo = texto(formData, 'rotulo');
  if (!rotulo) return erro('Dê um nome ao convite (ex.: “Trainees 2026.1”).');

  // Vazio/0 = ilimitado; a coluna aceita null e o CHECK recusa zero.
  const brutoUsos = formData.get('usos_max');
  const usosMax = Number(brutoUsos) > 0 ? Number(brutoUsos) : null;

  const dias = Number(formData.get('validade_dias'));
  const expiraEm =
    dias > 0 ? new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString() : null;

  // 32 bytes: adivinhar um token por força bruta é inviável, e ele é a
  // única coisa que separa um estranho de uma conta na área de membros.
  const token = randomBytes(32).toString('base64url');

  const { data, error } = await criarClienteAdmin()
    .from('convites')
    .insert({
      token,
      rotulo,
      cargo: 'trainee',
      turma: texto(formData, 'turma'),
      area: texto(formData, 'area'),
      dominio_email: texto(formData, 'dominio_email')?.toLowerCase().replace(/^@/, '') ?? null,
      usos_max: usosMax,
      expira_em: expiraEm,
      criado_por: ator.id,
    })
    .select('token')
    .single();

  if (error) return erro(`Não foi possível criar o convite: ${error.message}`);

  await registrar(ator, 'criar_convite', 'convites', null, { rotulo, usosMax });
  revalidatePath('/membros/gestao/usuarios');
  return { ok: true, mensagem: 'Convite criado. Copie o link e envie aos trainees.', token: data.token };
}

/** Desliga um link já enviado. Quem já criou a conta continua com ela. */
export async function revogarConvite(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(e.message);
  }

  const id = texto(formData, 'id');
  if (!id) return erro('Convite não informado.');

  const { error } = await criarClienteAdmin()
    .from('convites')
    .update({ revogado: true })
    .eq('id', id);

  if (error) return erro(`Não foi possível revogar: ${error.message}`);

  await registrar(ator, 'revogar_convite', 'convites', id, null);
  revalidatePath('/membros/gestao/usuarios');
  return sucesso('Convite revogado.');
}

/* ==================================================================
   PROJETOS DO SITE
   ================================================================== */

// Os campos ricos chegam como texto e viram JSON: uma linha por item,
// "Rótulo | texto" para detalhes e "Valor | rótulo" para métricas.
function linhasParaJson(bruto, chaveA, chaveB) {
  if (!bruto) return [];
  return bruto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linha) => {
      const [a, ...resto] = linha.split('|');
      return { [chaveA]: a.trim(), [chaveB]: resto.join('|').trim() };
    })
    .filter((o) => o[chaveA]);
}

const gerarSlug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tira os acentos separados pelo NFD
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

export async function salvarProjeto(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(e.message);
  }

  const id = texto(formData, 'id');
  const titulo = texto(formData, 'titulo');
  const resumo = texto(formData, 'resumo');
  if (!titulo || !resumo) return erro('Título e resumo são obrigatórios.');

  const dados = {
    titulo,
    resumo,
    slug: texto(formData, 'slug') || gerarSlug(titulo),
    subtitulo: texto(formData, 'subtitulo'),
    selo: texto(formData, 'selo'),
    contexto: texto(formData, 'contexto'),
    ano: texto(formData, 'ano'),
    parceiro_nome: texto(formData, 'parceiro_nome'),
    parceiro_logo: texto(formData, 'parceiro_logo'),
    parceiro_prefixo: texto(formData, 'parceiro_prefixo') || 'Projeto mentorado por',
    detalhes: linhasParaJson(texto(formData, 'detalhes'), 'rotulo', 'texto'),
    metricas: linhasParaJson(texto(formData, 'metricas'), 'valor', 'rotulo'),
    destaque: formData.get('destaque') === 'on',
    publicado: formData.get('publicado') === 'on',
    ordem: Number(formData.get('ordem')) || 0,
  };

  // Paper: link externo OU PDF enviado ao bucket público "papers".
  // O upload já aconteceu no navegador; aqui só gravamos a referência.
  const paperTipo = texto(formData, 'paper_tipo') || 'nenhum';
  if (paperTipo === 'link') {
    dados.paper_url = texto(formData, 'paper_link');
    dados.paper_path = null;
    dados.paper_nome = texto(formData, 'paper_rotulo');
  } else if (paperTipo === 'arquivo') {
    const url = texto(formData, 'paper_url');
    const caminho = texto(formData, 'paper_path');
    if (!url || !caminho) return erro('Envie o PDF do paper antes de salvar.');
    dados.paper_url = url;
    dados.paper_path = caminho;
    dados.paper_nome = texto(formData, 'paper_nome');
  } else {
    dados.paper_url = null;
    dados.paper_path = null;
    dados.paper_nome = null;
  }

  const admin = criarClienteAdmin();

  // Guarda o paper antigo para apagar do Storage se ele foi trocado/removido.
  let paperAntigo = null;
  if (id) {
    const { data } = await admin.from('projetos').select('paper_path').eq('id', id).single();
    paperAntigo = data?.paper_path ?? null;
  }

  const { error } = id
    ? await admin.from('projetos').update(dados).eq('id', id)
    : await admin.from('projetos').insert(dados);

  if (error) {
    return erro(
      error.code === '23505'
        ? 'Já existe um projeto com esse identificador (slug). Escolha outro.'
        : `Não foi possível salvar: ${error.message}`,
    );
  }

  if (paperAntigo && paperAntigo !== dados.paper_path) {
    await admin.storage.from('papers').remove([paperAntigo]);
  }

  await registrar(ator, id ? 'editar_projeto' : 'criar_projeto', 'projetos', id, { titulo });
  revalidatePath('/membros/gestao/projetos');
  revalidatePath('/');
  return sucesso(id ? 'Projeto atualizado.' : 'Projeto criado.');
}

export async function excluirProjeto(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(e.message);
  }

  const id = texto(formData, 'id');
  if (!id) return erro('Projeto não informado.');

  const admin = criarClienteAdmin();
  const { data: projeto } = await admin.from('projetos').select('paper_path').eq('id', id).single();

  const { error } = await admin.from('projetos').delete().eq('id', id);
  if (error) return erro(`Não foi possível excluir: ${error.message}`);

  // Não deixa o PDF órfão ocupando espaço no Storage.
  if (projeto?.paper_path) {
    await admin.storage.from('papers').remove([projeto.paper_path]);
  }

  await registrar(ator, 'excluir_projeto', 'projetos', id, null);
  revalidatePath('/membros/gestao/projetos');
  revalidatePath('/');
  return sucesso('Projeto excluído.');
}

/* ==================================================================
   MATERIAIS DE ESTUDO
   ================================================================== */

export async function salvarMaterial(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(e.message);
  }

  const titulo = texto(formData, 'titulo');
  const tipo = texto(formData, 'tipo') || 'link';
  if (!titulo) return erro('O título é obrigatório.');

  const dados = {
    titulo,
    descricao: texto(formData, 'descricao'),
    categoria: texto(formData, 'categoria') || 'Geral',
    tipo,
    ordem: Number(formData.get('ordem')) || 0,
    autor_id: ator.id,
  };

  if (tipo === 'link') {
    const url = texto(formData, 'url');
    if (!url) return erro('Informe a URL do material.');
    dados.url = url;
    dados.arquivo_path = null;
  } else {
    // O upload em si acontece no navegador (direto no Storage); aqui só
    // gravamos a referência que o formulário devolveu.
    const caminho = texto(formData, 'arquivo_path');
    if (!caminho) return erro('Envie o arquivo antes de salvar.');
    dados.arquivo_path = caminho;
    dados.arquivo_nome = texto(formData, 'arquivo_nome');
    dados.arquivo_bytes = Number(formData.get('arquivo_bytes')) || null;
    dados.url = null;
  }

  const id = texto(formData, 'id');
  const admin = criarClienteAdmin();
  const { error } = id
    ? await admin.from('materiais').update(dados).eq('id', id)
    : await admin.from('materiais').insert(dados);

  if (error) return erro(`Não foi possível salvar: ${error.message}`);

  await registrar(ator, id ? 'editar_material' : 'criar_material', 'materiais', id, { titulo });
  revalidatePath('/membros/materiais');
  return sucesso(id ? 'Material atualizado.' : 'Material adicionado.');
}

export async function excluirMaterial(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(e.message);
  }

  const id = texto(formData, 'id');
  if (!id) return erro('Material não informado.');

  const admin = criarClienteAdmin();
  const { data: material } = await admin.from('materiais').select('arquivo_path').eq('id', id).single();

  const { error } = await admin.from('materiais').delete().eq('id', id);
  if (error) return erro(`Não foi possível excluir: ${error.message}`);

  // Remove o arquivo do Storage para não deixar órfão ocupando espaço.
  if (material?.arquivo_path) {
    await admin.storage.from('materiais').remove([material.arquivo_path]);
  }

  await registrar(ator, 'excluir_material', 'materiais', id, null);
  revalidatePath('/membros/materiais');
  return sucesso('Material excluído.');
}

/* ==================================================================
   ENTREGAS DO TRAINEE
   ================================================================== */

export async function salvarEntrega(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(e.message);
  }

  const titulo = texto(formData, 'titulo');
  const dataLimite = texto(formData, 'data_limite');

  if (!titulo) return erro('O título é obrigatório.');
  if (!dataLimite) return erro('Informe a data de entrega.');
  // O input type="date" já entrega YYYY-MM-DD, mas o formulário pode ser
  // enviado por outro caminho; uma data torta viraria erro cru do Postgres.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLimite)) {
    return erro('Data inválida. Use o seletor de data.');
  }

  const dados = {
    titulo,
    descricao: texto(formData, 'descricao'),
    data_limite: dataLimite,
    url: texto(formData, 'url'),
    periodo: texto(formData, 'periodo') ?? '',
    ordem: Number(formData.get('ordem')) || 0,
    autor_id: ator.id,
  };

  const id = texto(formData, 'id');
  const admin = criarClienteAdmin();
  const { error } = id
    ? await admin.from('entregas').update(dados).eq('id', id)
    : await admin.from('entregas').insert(dados);

  if (error) return erro(`Não foi possível salvar: ${error.message}`);

  await registrar(ator, id ? 'editar_entrega' : 'criar_entrega', 'entregas', id, { titulo });
  revalidatePath('/membros/trainee');
  return sucesso(id ? 'Entrega atualizada.' : 'Entrega adicionada.');
}

export async function excluirEntrega(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(e.message);
  }

  const id = texto(formData, 'id');
  if (!id) return erro('Entrega não informada.');

  const { error } = await criarClienteAdmin().from('entregas').delete().eq('id', id);
  if (error) return erro(`Não foi possível excluir: ${error.message}`);

  await registrar(ator, 'excluir_entrega', 'entregas', id, null);
  revalidatePath('/membros/trainee');
  return sucesso('Entrega excluída.');
}
