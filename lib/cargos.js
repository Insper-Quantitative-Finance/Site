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

/**
 * Comando de projetos: abre projeto, aloca gente e edita a vitrine do site.
 *
 * Deliberadamente MENOR que CARGOS_GESTAO — o diretor de capacitações é
 * gestão (mexe em usuários, materiais, trainee) mas não manda em projetos.
 * O espelho no banco é is_comando_projetos().
 */
export const CARGOS_PROJETOS = ['presidente', 'vice_presidente', 'diretor_projetos'];

export const ehComandoProjetos = (cargo) => CARGOS_PROJETOS.includes(cargo);

export const ehTrainee = (cargo) => cargo === 'trainee';

/**
 * O trainee vê só o programa dele: entregas e handouts.
 * Quadro de membros, biblioteca geral e os números da liga ficam para quem
 * já foi efetivado. Isto é a fonte da verdade para o menu E para as guardas
 * das rotas — esconder o link sem barrar a rota não esconde nada de fato.
 */
export const podeVerAreaGeral = (cargo) => !ehTrainee(cargo);

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

/**
 * Apagar conta é irreversível e some com a pessoa do quadro, das equipes e das
 * entregas — por isso é mais restrito que editar: só presidente e vice, e nunca
 * a própria conta (ninguém se desloga para sempre por engano, e a liga não fica
 * sem presidência). Para tirar o acesso sem perder o histórico, desative.
 * O espelho no banco é is_presidencia().
 */
export function podeExcluirUsuario(ator, alvo) {
  if (!ehPresidencia(ator?.cargo)) return false;
  if (ator.id === alvo?.id) return false;
  return true;
}

/** Por que o botão de apagar está travado — texto único para UI e action. */
export function motivoNaoExcluir(ator, alvo) {
  if (!ehPresidencia(ator?.cargo)) return 'Apenas presidente e vice-presidente podem apagar contas.';
  if (ator.id === alvo?.id) return 'Você não pode apagar a própria conta.';
  return null;
}

export const rotuloCargo = (cargo) => CARGOS[cargo]?.label ?? cargo;
