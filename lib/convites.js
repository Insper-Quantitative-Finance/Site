/**
 * Regras dos convites, compartilhadas entre servidor e navegador.
 *
 * O cargo do convite é escolhido por quem CRIA o convite e fica gravado na
 * linha — nunca vem do formulário de quem clica no link. E a lista de cargos
 * convidáveis é curta de propósito: trainee e membro. Diretoria e presidência
 * só por promoção explícita em /membros/gestao/usuarios, onde fica registrado
 * quem promoveu quem. O espelho disso no banco é o CHECK da coluna `cargo`
 * (ver supabase/migracao-convites-cargo.sql).
 */

export const CARGOS_CONVITE = [
  { valor: 'trainee', label: 'Trainee', plural: 'Trainees' },
  { valor: 'membro', label: 'Membro', plural: 'Membros' },
];

/** Default no cargo de MENOR privilégio: o esquecimento não promove ninguém. */
export const CARGO_CONVITE_PADRAO = 'trainee';

/**
 * Normaliza o cargo pedido para um valor convidável.
 * Qualquer coisa fora da lista (inclusive adulteração do formulário) cai no
 * default — o banco recusaria de todo jeito, mas não dependemos disso.
 */
export function cargoConvite(valor) {
  return CARGOS_CONVITE.some((c) => c.valor === valor) ? valor : CARGO_CONVITE_PADRAO;
}

export const rotuloCargoConvite = (valor) =>
  CARGOS_CONVITE.find((c) => c.valor === valor)?.label ?? 'Trainee';

/** Monta a URL que a gestão copia e envia para a turma. */
export const linkConvite = (origem, token) => `${origem}/convite/${token}`;

/**
 * Situação legível de um convite, na ordem em que uma trava vence a outra:
 * revogado > vencido > esgotado > ativo.
 */
export function situacaoConvite(convite, agora = new Date()) {
  if (convite.revogado) return { valor: 'revogado', label: 'Revogado' };
  if (convite.expira_em && new Date(convite.expira_em) <= agora) {
    return { valor: 'vencido', label: 'Vencido' };
  }
  if (convite.usos_max != null && convite.usos >= convite.usos_max) {
    return { valor: 'esgotado', label: 'Esgotado' };
  }
  return { valor: 'ativo', label: 'Ativo' };
}

/**
 * Único domínio que pode ter conta no sistema.
 *
 * Não é configurável por convite e não é um campo de formulário: a liga é do
 * Insper, e conta aqui é conta de aluno. Deixar isso como opção abria a porta
 * para um convite criado às pressas, sem domínio preenchido, aceitar gmail.
 */
export const DOMINIO_PERMITIDO = 'al.insper.edu.br';

const dominioDoEmail = (email) => (String(email ?? '').split('@')[1] ?? '').toLowerCase();

/**
 * O e-mail pode criar conta por este convite?
 *
 * Duas camadas: o domínio institucional, que vale para TODO cadastro, e um
 * domínio ainda mais estreito gravado na linha do convite, se houver. Convites
 * antigos, criados sem domínio, passam a valer só para o institucional.
 */
export function emailPermitido(email, dominioDoConvite) {
  const dominio = dominioDoEmail(email);
  if (dominio !== DOMINIO_PERMITIDO) return false;

  const estreito = dominioDoConvite?.trim().replace(/^@/, '').toLowerCase();
  return !estreito || dominio === estreito;
}

/** Recusa de domínio, na mesma frase na tela, no e-mail e na action. */
export const MOTIVO_DOMINIO = `Só e-mails @${DOMINIO_PERMITIDO} podem criar conta na área de membros.`;

/** Mensagem única para cada motivo de recusa — usada na página e na action. */
export const MOTIVOS = {
  invalido: 'Este link de convite não existe. Confira se copiou a URL inteira.',
  revogado: 'Este convite foi revogado pela gestão. Peça um link novo.',
  vencido: 'Este convite expirou. Peça um link novo à gestão.',
  esgotado: 'Este convite já atingiu o limite de cadastros. Peça um link novo à gestão.',
};
