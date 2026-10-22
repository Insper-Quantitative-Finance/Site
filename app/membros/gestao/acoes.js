'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import {
  CARGOS,
  cargosAtribuiveis,
  ehGestao,
  motivoNaoExcluir,
  podeAlterarCargo,
  podeEditarUsuario,
  rotuloCargo,
} from '@/lib/cargos';
import {
  DOMINIO_PERMITIDO,
  MOTIVO_DOMINIO,
  cargoConvite,
  emailPermitido,
  linkConvite,
  rotuloCargoConvite,
  situacaoConvite,
} from '@/lib/convites';
import { enviarEmail, montarConvite } from '@/lib/email';
import { acharHandout, comoInstante } from '@/lib/handouts';
import { lerConvidados } from '@/lib/planilha';
import { usuarioOuNulo } from '@/lib/auth';
import { criarClienteAdmin, criarClienteServidor } from '@/lib/supabase/server';
import { ErroDeRegra, registrarErro } from '@/lib/erros';

/** Toda action passa por aqui: sem gestão, nada acontece. */
async function exigirGestao() {
  const ator = await usuarioOuNulo();
  if (!ator || !ehGestao(ator.cargo)) {
    throw new ErroDeRegra('Ação restrita aos cargos de gestão.');
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
 *
 * Sem senha. A conta nasce SEM senha utilizável e a pessoa define a dela pelo
 * link que sai por e-mail — o mesmo fluxo do "esqueci minha senha".
 *
 * Antes havia um campo "senha inicial", e ele errava de três maneiras ao mesmo
 * tempo: era `type="text"`, então a senha ficava legível na tela de quem
 * cadastrava; o texto de ajuda mandava repassá-la para a pessoa, o que na
 * prática significa WhatsApp; e nada obrigava a troca depois, então a senha que
 * passou pela mensagem continuava valendo por tempo indeterminado. Nenhum dos
 * três tem conserto enquanto a gestão escolhe a senha de outra pessoa.
 *
 * O que se perde: a conta não entra "pronta para usar". O que se ganha: em
 * nenhum momento existe uma senha que duas pessoas conhecem.
 */
export async function criarUsuario(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: criarUsuario', e));
  }

  const email = texto(formData, 'email')?.toLowerCase();
  const nome = texto(formData, 'nome');
  const cargo = texto(formData, 'cargo') || 'trainee';
  const origem = texto(formData, 'origem');

  if (!email || !nome) return erro('Nome e e-mail são obrigatórios.');
  // A mesma trava do convite: não há caminho para criar conta fora do domínio.
  if (!emailPermitido(email)) return erro(MOTIVO_DOMINIO);
  if (!CARGOS[cargo]) return erro('Cargo inválido.');
  if (!cargosAtribuiveis(ator.cargo).some((c) => c.valor === cargo)) {
    return erro('Só a presidência pode criar usuários em cargos de gestão.');
  }

  const admin = criarClienteAdmin();

  // Sem `password`: o Supabase cria a conta sem senha utilizável. Até a pessoa
  // abrir o link e definir a dela, não existe senha que sirva para entrar.
  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    email_confirm: true, // cadastro é interno; não faz sentido exigir confirmação
    user_metadata: { nome },
  });

  if (erroAuth) {
    return erro(
      erroAuth.message.includes('already registered')
        ? 'Já existe um usuário com esse e-mail.'
        : registrarErro('gestao: criarUsuario', erroAuth, { acao: 'criar o usuário' }),
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
    return erro(registrarErro('gestao: criarUsuario', erroPerfil, { acao: 'criar o perfil' }));
  }

  // O link de definir senha. Se o envio falhar, a conta continua criada e
  // válida — a gestão reenvia pelo botão "Enviar link de senha" na lista. Por
  // isso a falha vira aviso no texto de sucesso, e não erro da action: desfazer
  // a conta por causa de um e-mail que não saiu seria pior.
  let avisoEnvio = '';
  const { error: erroLink } = await criarClienteServidor().auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/membros/conta/redefinir`,
  });
  if (erroLink) {
    registrarErro('gestao: criarUsuario/enviar link', erroLink);
    avisoEnvio = ' O e-mail com o link não saiu — use “Enviar link de senha” na lista abaixo.';
  }

  await registrar(ator, 'criar_usuario', 'profiles', criado.user.id, { email, cargo });
  revalidatePath('/membros/gestao/usuarios');
  revalidatePath('/membros/quadro');
  return sucesso(
    `${nome} foi cadastrado. Enviamos um e-mail para ${email} com o link para definir a senha.${avisoEnvio}`,
  );
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
    return erro(registrarErro('gestao: editarUsuario', e));
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

  if (error) return erro(registrarErro('gestao: editarUsuario', error, { acao: 'salvar' }));

  await registrar(ator, 'editar_usuario', 'profiles', id, { cargo: cargoFinal, ativo });
  revalidatePath('/membros/gestao/usuarios');
  revalidatePath('/membros/quadro');
  return sucesso('Usuário atualizado.');
}

/**
 * Apaga a conta de vez: o delete no auth cascateia para profiles, e de lá para
 * equipes/entregas (cascade) e autorias (set null, o histórico sobrevive sem dono).
 *
 * Restrito à presidência e nunca à própria conta — ver podeExcluirUsuario.
 * Pede o e-mail digitado como confirmação: um clique errado na lista não apaga
 * ninguém, e o e-mail é o que está visível na linha.
 */
export async function excluirUsuario(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: excluirUsuario', e));
  }

  const id = texto(formData, 'id');
  const confirmacao = texto(formData, 'confirmacao')?.toLowerCase();
  if (!id) return erro('Dados incompletos.');

  const admin = criarClienteAdmin();
  const { data: alvo } = await admin.from('profiles').select('id, nome, email, cargo').eq('id', id).single();
  if (!alvo) return erro('Usuário não encontrado.');

  const motivo = motivoNaoExcluir(ator, alvo);
  if (motivo) return erro(motivo);

  if (confirmacao !== alvo.email.toLowerCase()) {
    return erro(`Para confirmar, digite exatamente o e-mail ${alvo.email}.`);
  }

  // Auditoria antes do delete: depois dele, ator_id continua válido mas o alvo
  // não existe mais para consultar — o nome e o cargo ficam registrados aqui.
  await registrar(ator, 'excluir_usuario', 'profiles', alvo.id, {
    email: alvo.email,
    nome: alvo.nome,
    cargo: alvo.cargo,
  });

  const { error } = await admin.auth.admin.deleteUser(alvo.id);
  if (error) return erro(registrarErro('gestao: excluirUsuario', error, { acao: 'apagar a conta' }));

  revalidatePath('/membros/gestao/usuarios');
  revalidatePath('/membros/quadro');
  return sucesso(`A conta de ${alvo.nome} foi apagada.`);
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
    return erro(registrarErro('gestao: enviarRedefinicaoSenha', e));
  }

  const email = texto(formData, 'email');
  const origem = texto(formData, 'origem');
  if (!email) return erro('E-mail ausente.');

  const supabase = criarClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/membros/conta/redefinir`,
  });
  if (error) return erro(registrarErro('gestao: enviarRedefinicaoSenha', error, { acao: 'enviar' }));

  await registrar(ator, 'enviar_redefinicao', 'profiles', null, { email });
  return sucesso(`Link de redefinição enviado para ${email}.`);
}

/* ==================================================================
   CONVITES (TRAINEE E MEMBRO)
   ================================================================== */

/**
 * O ator pode emitir convite para este cargo?
 *
 * Duas travas em série: cargoConvite() limita a trainee|membro (diretoria e
 * presidência não se convidam, só se promovem), e cargosAtribuiveis() repete
 * aqui a mesma regra que vale para criar usuário à mão. O banco é a terceira,
 * pelo CHECK da coluna.
 */
function cargoConvidavel(cargoAtor, pedido) {
  const cargo = cargoConvite(pedido);
  return cargosAtribuiveis(cargoAtor).some((c) => c.valor === cargo) ? cargo : null;
}

/**
 * Gera um link de cadastro de turma (um token, N cadastros).
 *
 * O cargo é fixado AQUI, na linha do convite, por quem cria o link — a action
 * pública que consome o token nem lê cargo do formulário. Assim um link vazado
 * no WhatsApp da turma, no pior caso, cria um trainee (ou membro) a mais —
 * nunca um diretor.
 */
export async function criarConvite(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: criarConvite', e));
  }

  const cargo = cargoConvidavel(ator.cargo, texto(formData, 'cargo'));
  if (!cargo) return erro('Convite só cria trainee ou membro; outros cargos vêm por promoção.');

  const rotulo = texto(formData, 'rotulo') || `${rotuloCargoConvite(cargo)}s ${new Date().getFullYear()}`;

  // Vazio/0 = ilimitado; a coluna aceita null e o CHECK recusa zero.
  const brutoUsos = formData.get('usos_max');
  const usosMax = Number(brutoUsos) > 0 ? Number(brutoUsos) : null;

  /*
   * Prazo de validade.
   *
   * A coluna `expira_em` sempre existiu, e tanto o consumir_convite() quanto o
   * situacaoConvite() já a respeitavam — mas NADA a preenchia. Resultado: todo
   * link de turma nascia eterno, e um link eterno é uma chave que não se perde
   * nunca: qualquer e-mail @al.insper.edu.br que o recebesse, em qualquer ano,
   * criaria conta até alguém lembrar de revogar manualmente.
   *
   * O default é 30 dias porque convite de turma serve a uma janela de entrada,
   * não ao semestre inteiro. "Sem prazo" continua disponível, mas agora é uma
   * escolha explícita em vez do que acontece sozinho.
   */
  const dias = Number(formData.get('validade_dias'));
  const expiraEm =
    Number.isFinite(dias) && dias > 0
      ? new Date(Date.now() + dias * 86400000).toISOString()
      : null;

  // 32 bytes: adivinhar um token por força bruta é inviável, e ele é a
  // única coisa que separa um estranho de uma conta na área de membros.
  const token = randomBytes(32).toString('base64url');

  const { data, error } = await criarClienteAdmin()
    .from('convites')
    .insert({
      token,
      rotulo,
      cargo,
      // Gravado na linha, não pedido no formulário: é o mesmo domínio para
      // todo mundo, e a action pública revalida por emailPermitido().
      dominio_email: DOMINIO_PERMITIDO,
      usos_max: usosMax,
      expira_em: expiraEm,
      criado_por: ator.id,
    })
    .select('token')
    .single();

  if (error) return erro(registrarErro('gestao: criarConvite', error, { acao: 'criar o convite' }));

  await registrar(ator, 'criar_convite', 'convites', null, { rotulo, cargo, usosMax, expiraEm });
  revalidatePath('/membros/gestao/usuarios');
  return {
    ok: true,
    mensagem: `Convite de ${rotuloCargoConvite(cargo).toLowerCase()} criado. Copie o link e envie à turma.`,
    token: data.token,
  };
}

/** Desliga um link já enviado. Quem já criou a conta continua com ela. */
export async function revogarConvite(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: revogarConvite', e));
  }

  const id = texto(formData, 'id');
  if (!id) return erro('Convite não informado.');

  const { error } = await criarClienteAdmin()
    .from('convites')
    .update({ revogado: true })
    .eq('id', id);

  if (error) return erro(registrarErro('gestao: revogarConvite', error, { acao: 'revogar' }));

  await registrar(ator, 'revogar_convite', 'convites', id, null);
  revalidatePath('/membros/gestao/usuarios');
  return sucesso('Convite revogado.');
}

/* ==================================================================
   CONVITES PESSOAIS (um a um ou por planilha)

   Um convite pessoal é um token amarrado a um e-mail, com usos_max = 1.
   É o caminho para entrar gente no sistema pedindo só nome e e-mail: a
   senha quem define é a própria pessoa, no link que recebe.
   ================================================================== */

/**
 * Insere um convite pessoal por pessoa aprovada, rechecando o banco antes.
 *
 * A recheca não é paranoia: entre a prévia da planilha e o clique alguém pode
 * ter criado a conta — ou a mesma planilha pode ter sido importada duas vezes.
 * O índice único de convite pendente recusaria o insert do lote INTEIRO, e aí
 * uma linha repetida derrubaria a turma toda.
 *
 * Convite pessoal não tem prazo: ele vale para um e-mail e para um cadastro
 * só, e a gestão desliga pelo botão Revogar. Prazo aqui só criaria o caso de
 * "mandei o link e a pessoa demorou uma semana para abrir".
 *
 * Devolve { convites, criados, ignoradas } ou { erro }.
 */
async function inserirConvitesPessoais(admin, { pessoas, cargo, rotulo, lote, atorId }) {
  const emails = pessoas.map((p) => String(p.email).toLowerCase());

  const [{ data: perfis }, { data: pendentes }] = await Promise.all([
    admin.from('profiles').select('email').in('email', emails),
    admin.from('convites').select('email').in('email', emails).eq('revogado', false),
  ]);
  const bloqueados = new Set([
    ...(perfis ?? []).map((p) => p.email.toLowerCase()),
    ...(pendentes ?? []).map((c) => c.email?.toLowerCase()),
  ]);

  const novas = pessoas.filter(
    (p) =>
      p.email &&
      p.nome &&
      emailPermitido(String(p.email).toLowerCase()) &&
      !bloqueados.has(String(p.email).toLowerCase()),
  );
  const ignoradas = pessoas.length - novas.length;

  if (novas.length === 0) {
    return { erro: 'Nenhuma pessoa elegível: já têm conta, convite pendente ou e-mail fora do domínio.' };
  }

  const { data: criados, error } = await admin
    .from('convites')
    .insert(
      novas.map((p) => ({
        // 32 bytes: adivinhar um token por força bruta é inviável, e ele é a
        // única coisa que separa um estranho de uma conta na área de membros.
        token: randomBytes(32).toString('base64url'),
        rotulo,
        cargo,
        nome: String(p.nome).trim(),
        email: String(p.email).toLowerCase(),
        dominio_email: DOMINIO_PERMITIDO,
        lote,
        usos_max: 1, // convite pessoal: uma conta, e acabou
        criado_por: atorId,
      })),
    )
    .select('id, token, nome, email');

  if (error) return { erro: registrarErro('gestao: revogarConvite', error, { acao: 'criar os convites' }) };

  return { convites: criados, criados: criados.length, ignoradas };
}

/**
 * Convida UMA pessoa: nome, e-mail, e nada mais.
 *
 * Existe ao lado da planilha porque uma pessoa só é o caso comum fora do
 * processo seletivo (alguém que entrou no meio do semestre), e passar por
 * "cole a planilha → leia → revise → crie o lote" para uma linha é atrito puro.
 *
 * Devolve o link pronto para copiar e, se pedido, já dispara o e-mail — são as
 * duas formas de entregar o convite, e qual serve depende de a pessoa estar na
 * sua frente ou não.
 */
export async function criarConvidado(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: criarConvidado', e));
  }

  const nome = texto(formData, 'nome');
  const email = texto(formData, 'email')?.toLowerCase();
  if (!nome || !email) return erro('Preencha nome e e-mail.');
  if (!emailPermitido(email)) return erro(MOTIVO_DOMINIO);

  const cargo = cargoConvidavel(ator.cargo, texto(formData, 'cargo'));
  if (!cargo) return erro('Convite só cria trainee ou membro; outros cargos vêm por promoção.');

  const admin = criarClienteAdmin();

  const resultado = await inserirConvitesPessoais(admin, {
    pessoas: [{ nome, email }],
    cargo,
    rotulo: `${rotuloCargoConvite(cargo)}s avulsos`,
    lote: null, // avulso: não pertence a nenhum lote de planilha
    atorId: ator.id,
  });

  if (resultado.erro) {
    // Com uma pessoa só, "nenhuma pessoa elegível" não diz nada; nomeia o caso.
    return erro(
      resultado.erro.startsWith('Nenhuma')
        ? `${email} já tem conta ou um convite pendente.`
        : resultado.erro,
    );
  }

  const convite = resultado.convites[0];
  await registrar(ator, 'criar_convidado', 'convites', convite.id, { email, cargo });

  // Enviar é opcional e no mesmo passo: com a caixa marcada, criar o convite
  // e avisar a pessoa é um clique. Falha de envio não desfaz o convite — o
  // link continua na tela para copiar e mandar na mão.
  let envio = null;
  if (formData.get('enviar_email') === 'on') {
    const origem = texto(formData, 'origem');
    envio = origem
      ? await dispararConvite(admin, convite.id, origem)
      : erro('Não consegui descobrir o endereço do site para montar o link.');
    if (envio.ok) await registrar(ator, 'enviar_convite', 'convites', convite.id, { email });
  }

  revalidatePath('/membros/gestao/usuarios');

  return {
    ok: true,
    id: convite.id,
    token: convite.token,
    nome: convite.nome,
    email: convite.email,
    envio,
    mensagem:
      `Convite de ${rotuloCargoConvite(cargo).toLowerCase()} criado para ${nome}.` +
      (envio?.ok ? ` E-mail enviado para ${email}.` : ''),
  };
}

/**
 * Lê a planilha e devolve a prévia. NÃO escreve nada.
 *
 * Este passo existe para a conferência acontecer antes de qualquer efeito:
 * criar convite é barato de desfazer, mas e-mail enviado não volta. Aqui a
 * gestão vê quem já tem conta, quem já foi convidado e que linha está torta.
 */
export async function prepararConvidados(_estadoAnterior, formData) {
  try {
    await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: prepararConvidados', e));
  }

  const linhas = lerConvidados(formData.get('planilha'));
  if (linhas.length === 0) {
    return erro('Não encontrei nenhuma linha. Cole a planilha (nome e e-mail) ou escolha um arquivo CSV.');
  }

  const emails = linhas.filter((l) => l.email).map((l) => l.email);
  const admin = criarClienteAdmin();

  // Duas consultas em lote, não uma por linha: uma planilha de 60 pessoas
  // viraria 120 idas ao banco e estouraria o tempo da action.
  const [{ data: perfis }, { data: pendentes }] = await Promise.all([
    admin.from('profiles').select('email, nome, cargo').in('email', emails),
    admin.from('convites').select('email').in('email', emails).eq('revogado', false),
  ]);

  const jaTemConta = new Map((perfis ?? []).map((p) => [p.email.toLowerCase(), p]));
  const jaConvidado = new Set((pendentes ?? []).map((c) => c.email?.toLowerCase()));

  const revisadas = linhas.map((l) => {
    if (l.erro) return { ...l, situacao: 'erro' };
    if (!emailPermitido(l.email)) {
      return { ...l, situacao: 'erro', erro: `Não é um e-mail @${DOMINIO_PERMITIDO}.` };
    }
    const perfil = jaTemConta.get(l.email);
    if (perfil) {
      return { ...l, situacao: 'tem-conta', aviso: `Já tem conta (${rotuloCargo(perfil.cargo)}).` };
    }
    if (jaConvidado.has(l.email)) {
      return { ...l, situacao: 'convidado', aviso: 'Já existe um convite pendente para este e-mail.' };
    }
    return { ...l, situacao: 'novo' };
  });

  const conta = (s) => revisadas.filter((l) => l.situacao === s).length;

  return {
    ok: true,
    linhas: revisadas,
    resumo: {
      novos: conta('novo'),
      temConta: conta('tem-conta'),
      convidados: conta('convidado'),
      erros: conta('erro'),
    },
    mensagem: `${revisadas.length} linha(s) lidas. Confira antes de criar os convites.`,
  };
}

/**
 * Cria um convite pessoal por linha aprovada. Ainda NÃO envia e-mail —
 * enviar é um segundo clique, para a prévia valer de alguma coisa.
 */
export async function criarConvitesLote(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: criarConvitesLote', e));
  }

  const cargo = cargoConvidavel(ator.cargo, texto(formData, 'cargo'));
  if (!cargo) return erro('Convite só cria trainee ou membro; outros cargos vêm por promoção.');

  // Sem nome de lote, o cargo e a data dão um rótulo bom o bastante — o campo
  // existe para a gestão se achar na tabela depois, não para ser obrigatório.
  const rotulo =
    texto(formData, 'rotulo') ||
    `${rotuloCargoConvite(cargo)}s ${new Date().toLocaleDateString('pt-BR')}`;

  // O cliente manda de volta a prévia aprovada; o servidor não confia nela
  // como verdade sobre o banco — só como seleção de quem enviar.
  let selecionadas;
  try {
    selecionadas = JSON.parse(formData.get('linhas') ?? '[]');
  } catch {
    return erro('Não consegui ler a seleção. Refaça a importação.');
  }
  if (!Array.isArray(selecionadas) || selecionadas.length === 0) {
    return erro('Nenhuma pessoa selecionada.');
  }

  const resultado = await inserirConvitesPessoais(criarClienteAdmin(), {
    pessoas: selecionadas,
    cargo,
    rotulo,
    lote: `${rotulo} · ${new Date().toISOString().slice(0, 10)}`,
    atorId: ator.id,
  });

  if (resultado.erro) return erro(resultado.erro);

  await registrar(ator, 'criar_convites_lote', 'convites', null, {
    rotulo,
    cargo,
    total: resultado.criados,
  });
  revalidatePath('/membros/gestao/usuarios');

  return {
    ok: true,
    ids: resultado.convites.map((c) => c.id),
    mensagem:
      `${resultado.criados} convite(s) de ${rotuloCargoConvite(cargo).toLowerCase()} criados` +
      (resultado.ignoradas > 0
        ? `; ${resultado.ignoradas} ignorado(s) por já ter conta, convite pendente ou e-mail fora do domínio.`
        : '.') +
      ' Agora envie os e-mails.',
  };
}

/**
 * Monta e dispara o e-mail de um convite, gravando o resultado na linha.
 *
 * Separado da action para o convite individual poder criar e enviar num
 * clique só, sem duplicar a lógica de montagem, de trava de situação nem de
 * registro do erro de envio.
 */
async function dispararConvite(admin, id, origem) {
  const { data: convite } = await admin.from('convites').select('*').eq('id', id).maybeSingle();

  if (!convite) return erro('Convite não encontrado.');
  if (!convite.email) return erro('Este convite é um link de turma, não tem destinatário.');

  const situacao = situacaoConvite(convite);
  if (situacao.valor !== 'ativo') return erro(`Convite ${situacao.label.toLowerCase()}; não faz sentido enviar.`);

  const { assunto, html, texto: corpo } = montarConvite({
    nome: convite.nome,
    rotulo: convite.rotulo,
    link: linkConvite(origem, convite.token),
  });

  const resultado = await enviarEmail({ para: convite.email, assunto, html, texto: corpo });

  // O resultado fica gravado: é o que a tabela mostra como "enviado" ou
  // "falhou", inclusive depois de recarregar a página.
  await admin
    .from('convites')
    .update({
      enviado_em: resultado.ok ? new Date().toISOString() : convite.enviado_em,
      erro_envio: resultado.ok ? null : resultado.erro,
    })
    .eq('id', id);

  if (!resultado.ok) return erro(resultado.erro);
  return sucesso(`Enviado para ${convite.email}.`);
}

/**
 * Marca um convite como enviado à mão.
 *
 * Existe porque o envio manual (abrir o Gmail com a mensagem pronta) é o
 * caminho enquanto o disparo automático não está configurado — e sem registrar
 * nada, uma turma de 60 vira "de quem eu já mandei?". Grava o mesmo campo do
 * envio automático, então a tabela e o contador de pendentes não precisam
 * saber por qual caminho o convite saiu.
 *
 * Não envia nada: é bookkeeping. Quem garante que a mensagem saiu é você, no
 * Gmail — e dá para clicar de novo para reabrir a mensagem a qualquer momento.
 */
export async function marcarConviteEnviado(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: marcarConviteEnviado', e));
  }

  const id = texto(formData, 'id');
  if (!id) return erro('Convite não informado.');

  const { error } = await criarClienteAdmin()
    .from('convites')
    .update({ enviado_em: new Date().toISOString(), erro_envio: null })
    .eq('id', id);

  if (error) return erro(registrarErro('gestao: marcarConviteEnviado', error, { acao: 'marcar' }));

  await registrar(ator, 'marcar_convite_enviado', 'convites', id, null);
  revalidatePath('/membros/gestao/usuarios');
  return sucesso('Marcado como enviado.');
}

/**
 * Envia (ou reenvia) o e-mail de um convite.
 *
 * É uma action por pessoa de propósito: o botão "enviar todos" chama esta
 * mesma função em sequência, então reenviar para quem falhou usa exatamente
 * o caminho já testado, e uma caixa postal inválida não derruba o lote.
 */
export async function enviarConvite(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: enviarConvite', e));
  }

  const id = texto(formData, 'id');
  const origem = texto(formData, 'origem');
  if (!id) return erro('Convite não informado.');
  if (!origem) return erro('Não consegui descobrir o endereço do site.');

  const resultado = await dispararConvite(criarClienteAdmin(), id, origem);
  revalidatePath('/membros/gestao/usuarios');

  if (!resultado.ok) return resultado;

  await registrar(ator, 'enviar_convite', 'convites', id, { id });
  return resultado;
}

/* ==================================================================
   PROJETOS

   Projetos saíram daqui. Cadastro, vitrine do site, equipe, deadline,
   tarefas e anexos vivem todos em /membros/projetos, numa página só por
   projeto — ter duas telas editando o mesmo registro era o atrito que
   essa mudança resolveu. As actions estão em app/membros/projetos/acoes.js.
   ================================================================== */

/* ==================================================================
   MATERIAIS DE ESTUDO
   ================================================================== */

export async function salvarMaterial(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: salvarMaterial', e));
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

  if (error) return erro(registrarErro('gestao: salvarMaterial', error, { acao: 'salvar' }));

  await registrar(ator, id ? 'editar_material' : 'criar_material', 'materiais', id, { titulo });
  revalidatePath('/membros/materiais');
  return sucesso(id ? 'Material atualizado.' : 'Material adicionado.');
}

export async function excluirMaterial(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: excluirMaterial', e));
  }

  const id = texto(formData, 'id');
  if (!id) return erro('Material não informado.');

  const admin = criarClienteAdmin();
  const { data: material } = await admin.from('materiais').select('arquivo_path').eq('id', id).single();

  const { error } = await admin.from('materiais').delete().eq('id', id);
  if (error) return erro(registrarErro('gestao: excluirMaterial', error, { acao: 'excluir' }));

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
    return erro(registrarErro('gestao: salvarEntrega', e));
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

  if (error) return erro(registrarErro('gestao: salvarEntrega', error, { acao: 'salvar' }));

  await registrar(ator, id ? 'editar_entrega' : 'criar_entrega', 'entregas', id, { titulo });
  revalidatePath('/membros/trainee');
  return sucesso(id ? 'Entrega atualizada.' : 'Entrega adicionada.');
}

export async function excluirEntrega(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: excluirEntrega', e));
  }

  const id = texto(formData, 'id');
  if (!id) return erro('Entrega não informada.');

  const { error } = await criarClienteAdmin().from('entregas').delete().eq('id', id);
  if (error) return erro(registrarErro('gestao: excluirEntrega', error, { acao: 'excluir' }));

  await registrar(ator, 'excluir_entrega', 'entregas', id, null);
  revalidatePath('/membros/trainee');
  return sucesso('Entrega excluída.');
}

/**
 * Marca (ou tira) a data em que um handout abre para a turma.
 *
 * O catálogo dos handouts está no código; o que se edita aqui é só o quando.
 * Campo vazio = sem tranca, liberado na hora — é assim que a gestão desfaz um
 * agendamento sem precisar de um botão separado.
 */
export async function salvarLiberacaoHandout(_estadoAnterior, formData) {
  let ator;
  try {
    ator = await exigirGestao();
  } catch (e) {
    return erro(registrarErro('gestao: salvarLiberacaoHandout', e));
  }

  const slug = texto(formData, 'slug');
  if (!slug) return erro('Handout não informado.');
  if (!acharHandout(slug)) return erro('Handout desconhecido.');

  const local = texto(formData, 'liberado_em');
  const instante = local ? comoInstante(local) : null;
  if (local && !instante) return erro('Data inválida. Use o seletor de data e hora.');

  const { error } = await criarClienteAdmin()
    .from('handouts')
    .upsert(
      { slug, liberado_em: instante, autor_id: ator.id, atualizado_em: new Date().toISOString() },
      { onConflict: 'slug' },
    );

  if (error) return erro(registrarErro('gestao: salvarLiberacaoHandout', error, { acao: 'salvar' }));

  await registrar(ator, 'liberar_handout', 'handouts', slug, { liberado_em: instante });
  revalidatePath('/membros/trainee');
  return sucesso(instante ? 'Data de liberação salva.' : 'Handout liberado para a turma.');
}
