/**
 * Regras dos convites de trainee, compartilhadas entre servidor e navegador.
 *
 * O cargo do convite não é parâmetro: é constante. O link de convite só
 * existe para criar trainee — promover alguém continua sendo ato explícito
 * da presidência em /membros/gestao/usuarios.
 */

export const CARGO_CONVITE = 'trainee';

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
 * O e-mail cabe no convite? Domínio vazio libera qualquer um.
 * Compara só o que vem depois do @, sem diferenciar maiúsculas.
 */
export function emailPermitido(email, dominio) {
  if (!dominio) return true;
  const alvo = dominio.trim().replace(/^@/, '').toLowerCase();
  return (email.split('@')[1] ?? '').toLowerCase() === alvo;
}

/** Mensagem única para cada motivo de recusa — usada na página e na action. */
export const MOTIVOS = {
  invalido: 'Este link de convite não existe. Confira se copiou a URL inteira.',
  revogado: 'Este convite foi revogado pela gestão. Peça um link novo.',
  vencido: 'Este convite expirou. Peça um link novo à gestão.',
  esgotado: 'Este convite já atingiu o limite de cadastros. Peça um link novo à gestão.',
};
