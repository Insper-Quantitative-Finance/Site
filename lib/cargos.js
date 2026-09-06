// Cargos da liga e o que cada um pode fazer.
// Fonte única da verdade no front; o espelho no banco são is_gestao()/is_presidencia().

export const CARGOS = {
  presidente:           { label: 'Presidente',                nivel: 100 },
  vice_presidente:      { label: 'Vice-presidente',           nivel: 90 },
  diretor_projetos:     { label: 'Diretor de Projetos',       nivel: 80 },
  diretor_capacitacoes: { label: 'Diretor de Capacitações',   nivel: 80 },
  membro:               { label: 'Membro',                    nivel: 20 },
  trainee:              { label: 'Trainee',                   nivel: 10 },
};

export const CARGOS_LISTA = Object.entries(CARGOS).map(([valor, c]) => ({ valor, ...c }));

/** Cargos de gestão: administram usuários, projetos e materiais. */
export const CARGOS_GESTAO = [
  'presidente',
  'vice_presidente',
  'diretor_projetos',
  'diretor_capacitacoes',
];

export const ehGestao = (cargo) => CARGOS_GESTAO.includes(cargo);

/** Só a presidência mexe em outra presidência — evita um diretor rebaixar o presidente. */
export const ehPresidencia = (cargo) => cargo === 'presidente' || cargo === 'vice_presidente';

/** Alterar cargo é exclusividade da presidência. Diretores não promovem ninguém. */
export const podeAlterarCargo = (cargoAtor) => ehPresidencia(cargoAtor);

/**
 * Cargos que este ator pode atribuir ao CRIAR um usuário.
 * Presidência atribui qualquer um; diretor só cria membro e trainee, já que
 * atribuir cargo de gestão é uma forma de mudar cargo.
 */
export function cargosAtribuiveis(cargoAtor) {
  if (ehPresidencia(cargoAtor)) return CARGOS_LISTA;
  if (ehGestao(cargoAtor)) return CARGOS_LISTA.filter((c) => !ehGestao(c.valor));
  return [];
}

/**
 * Um ator de gestão pode editar os DADOS (não o cargo) deste usuário?
 * Diretor não mexe em ninguém da presidência; presidência mexe em todos.
 */
export function podeEditarUsuario(cargoAtor, cargoAlvo) {
  if (!ehGestao(cargoAtor)) return false;
  if (ehPresidencia(cargoAtor)) return true;
  return !ehPresidencia(cargoAlvo);
}

export const rotuloCargo = (cargo) => CARGOS[cargo]?.label ?? cargo;
