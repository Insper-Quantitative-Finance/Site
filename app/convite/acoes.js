'use server';

import { CARGO_CONVITE, MOTIVOS, emailPermitido, situacaoConvite } from '@/lib/convites';
import { criarClienteAdmin } from '@/lib/supabase/server';

const erro = (mensagem) => ({ ok: false, erro: mensagem });

const texto = (fd, campo) => {
  const v = fd.get(campo);
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
};

/**
 * Cria a conta de um trainee a partir de um convite.
 *
 * Esta é a única action do sistema que qualquer pessoa na internet pode
 * chamar, então ela é deliberadamente estreita:
 *
 *   - o cargo é a constante CARGO_CONVITE; nenhum campo do formulário
 *     influencia o cargo, nem por engano, nem por adulteração;
 *   - o convite é consumido por RPC atômica antes de qualquer escrita, para
 *     que dois cliques simultâneos não furem o limite de usos;
 *   - se a criação falhar depois disso, o uso é devolvido — senão um erro
 *     de rede queimaria vagas do convite.
 */
export async function aceitarConvite(_estadoAnterior, formData) {
  const token = texto(formData, 'token');
  const nome = texto(formData, 'nome');
  const email = texto(formData, 'email')?.toLowerCase();
  const senha = formData.get('senha');

  if (!token) return erro(MOTIVOS.invalido);
  if (!nome || !email) return erro('Preencha nome e e-mail.');
  if (typeof senha !== 'string' || senha.length < 8) {
    return erro('A senha precisa ter pelo menos 8 caracteres.');
  }
  if (senha !== formData.get('senha_confirmacao')) {
    return erro('As duas senhas não são iguais.');
  }

  const admin = criarClienteAdmin();

  // Leitura só para dar a mensagem certa (vencido? revogado?) e conferir o
  // domínio. A decisão de valer ou não é da RPC logo abaixo.
  const { data: convite } = await admin
    .from('convites')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!convite) return erro(MOTIVOS.invalido);

  const situacao = situacaoConvite(convite);
  if (situacao.valor !== 'ativo') return erro(MOTIVOS[situacao.valor]);

  // Convite pessoal: o token vale para uma caixa postal só. Sem isto, um
  // link repassado no grupo da turma criaria conta para quem não foi chamado.
  if (convite.email && convite.email.toLowerCase() !== email) {
    return erro('Este convite é pessoal e foi emitido para outro e-mail. Use o endereço que recebeu o convite.');
  }

  if (!emailPermitido(email, convite.dominio_email)) {
    return erro(`Este convite aceita apenas e-mails @${convite.dominio_email}.`);
  }

  const { data: consumido, error: erroConsumo } = await admin.rpc('consumir_convite', {
    p_token: token,
  });

  if (erroConsumo) return erro(`Não foi possível validar o convite: ${erroConsumo.message}`);
  // Sem linha de volta: alguém consumiu a última vaga entre a leitura e agora.
  if (!consumido) return erro(MOTIVOS.esgotado);

  const devolver = () => admin.rpc('devolver_convite', { p_token: token });

  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true, // o convite já é a prova de que a pessoa foi chamada
    user_metadata: { nome },
  });

  if (erroAuth) {
    await devolver();
    return erro(
      /already registered|already been registered/i.test(erroAuth.message)
        ? 'Já existe uma conta com esse e-mail. Entre pelo login — se esqueceu a senha, use “Esqueci minha senha”.'
        : `Não foi possível criar a conta: ${erroAuth.message}`,
    );
  }

  const { error: erroPerfil } = await admin.from('profiles').insert({
    id: criado.user.id,
    email,
    nome,
    cargo: CARGO_CONVITE, // constante: o convite não negocia cargo
    turma: convite.turma,
    area: convite.area,
    linkedin: texto(formData, 'linkedin'),
    ativo: true,
  });

  if (erroPerfil) {
    // Conta de auth sem perfil viraria login sem identidade: desfaz tudo.
    await admin.auth.admin.deleteUser(criado.user.id);
    await devolver();
    return erro(`Não foi possível criar o perfil: ${erroPerfil.message}`);
  }

  try {
    await admin.from('auditoria').insert({
      ator_id: criado.user.id,
      acao: 'aceitar_convite',
      entidade: 'convites',
      entidade_id: String(convite.id),
      detalhes: { email, rotulo: convite.rotulo },
    });
  } catch {
    // Auditoria é registro, não pré-requisito.
  }

  return { ok: true, mensagem: 'Conta criada.' };
}
