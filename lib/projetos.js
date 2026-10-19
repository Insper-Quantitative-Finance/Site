// Domínio do acompanhamento de projetos.
// Fonte única da verdade dos status e das regras de quem edita o quê —
// o espelho no banco são pode_editar_projeto()/lidera_projeto().

import { ehComandoProjetos, ehTrainee } from '@/lib/cargos';

export const STATUS_PROJETO = {
  ideacao:      { label: 'Ideação',      cor: 'var(--texto-3)', nivel: 0 },
  em_andamento: { label: 'Em andamento', cor: 'var(--azul)',    nivel: 1 },
  em_revisao:   { label: 'Em revisão',   cor: '#E2C98B',        nivel: 2 },
  concluido:    { label: 'Concluído',    cor: '#9FD1A8',        nivel: 3 },
  pausado:      { label: 'Pausado',      cor: '#D6A1A1',        nivel: 4 },
};

export const STATUS_PROJETO_LISTA = Object.entries(STATUS_PROJETO).map(([valor, s]) => ({ valor, ...s }));

export const rotuloStatus = (s) => STATUS_PROJETO[s]?.label ?? s;
export const corStatus = (s) => STATUS_PROJETO[s]?.cor ?? 'var(--texto-3)';

/** As quatro colunas do quadro de tarefas, na ordem em que aparecem. */
export const COLUNAS_TAREFA = [
  { valor: 'a_fazer', label: 'A fazer' },
  { valor: 'fazendo', label: 'Fazendo' },
  { valor: 'revisao', label: 'Em revisão' },
  { valor: 'feito',   label: 'Feito' },
];

export const STATUS_TAREFA = COLUNAS_TAREFA.map((c) => c.valor);
export const rotuloStatusTarefa = (s) => COLUNAS_TAREFA.find((c) => c.valor === s)?.label ?? s;

export const PAPEIS = [
  { valor: 'lider',  label: 'Líder' },
  { valor: 'membro', label: 'Membro' },
];

export const rotuloPapel = (p) => PAPEIS.find((x) => x.valor === p)?.label ?? p;

/* ------------------------------------------------------------------ acesso */

/** Quem enxerga a área de projetos: membro efetivado (trainee não). */
export const podeVerProjetos = (cargo) => !ehTrainee(cargo);

/**
 * Abrir projeto novo: só o comando de projetos (presidência + diretor de
 * projetos). Projeto é alocação de gente e compromisso com parceiro — não
 * é algo que cada membro abre por conta.
 */
export const podeAbrirProjeto = (cargo) => ehComandoProjetos(cargo);

/**
 * Pode editar tarefas, marcos, atas, arquivos e o acompanhamento deste projeto?
 * Alocado edita o próprio projeto; o comando de projetos edita qualquer um.
 * `alocacao` é a linha de projeto_membros do usuário, ou null.
 */
export const podeEditarProjeto = (usuario, alocacao) =>
  Boolean(usuario) && (ehComandoProjetos(usuario.cargo) || Boolean(alocacao));

/**
 * Alocar/desalocar gente, trocar papel, arquivar e excluir.
 *
 * Exclusivo do comando de projetos — nem o líder do projeto aloca, porque
 * quem entra em qual projeto é decisão de diretoria, não do squad. O papel
 * de "líder" segue existindo como quem responde pelo projeto.
 */
export const podeGerirEquipe = (usuario) => Boolean(usuario) && ehComandoProjetos(usuario.cargo);

/** Editar a vitrine da landing (título, resumo, métricas, publicar). */
export const podeEditarVitrine = (usuario) => Boolean(usuario) && ehComandoProjetos(usuario.cargo);

/* -------------------------------------------------------------- progresso */

/**
 * Progresso pelas tarefas concluídas. Deliberadamente não conta marcos:
 * misturar as duas escalas daria um número que não quer dizer nada.
 */
export function progressoProjeto(tarefas) {
  const lista = Array.isArray(tarefas) ? tarefas : [];
  if (lista.length === 0) return { feitas: 0, total: 0, pct: 0 };
  const feitas = lista.filter((t) => t.status === 'feito').length;
  return { feitas, total: lista.length, pct: Math.round((feitas / lista.length) * 100) };
}

/* ------------------------------------------------------------------ datas */

/**
 * Compara datas em UTC puro. As colunas são `date` ("2026-05-20"), sem fuso;
 * usar new Date() local faria o prazo virar ontem para quem está a oeste.
 */
const hojeUTC = () => {
  const agora = new Date();
  return Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
};

const comoUTC = (data) => {
  if (!data) return null;
  const [a, m, d] = String(data).slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return null;
  return Date.UTC(a, m - 1, d);
};

/** Dias até a data: negativo = atrasado, 0 = hoje, null = sem data. */
export function diasAte(data) {
  const alvo = comoUTC(data);
  if (alvo === null) return null;
  return Math.round((alvo - hojeUTC()) / 86400000);
}

/** Texto curto de prazo: "em 3 dias", "hoje", "2 dias de atraso". */
export function rotuloPrazo(data) {
  const d = diasAte(data);
  if (d === null) return null;
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanhã';
  if (d === -1) return '1 dia de atraso';
  if (d < 0) return `${-d} dias de atraso`;
  return `em ${d} dias`;
}

/** Urgência de um prazo, para colorir. Concluído nunca é urgente. */
export function urgencia(data, concluido = false) {
  if (concluido) return 'ok';
  const d = diasAte(data);
  if (d === null) return 'neutro';
  if (d < 0) return 'atrasado';
  if (d <= 3) return 'proximo';
  return 'neutro';
}

export const COR_URGENCIA = {
  atrasado: '#E8A0A0',
  proximo:  '#E2C98B',
  ok:       '#9FD1A8',
  neutro:   'var(--texto-3)',
};

/** "2026-05-20" → "20/05/2026". Sem Date, para não escorregar de fuso. */
export function formatarData(data) {
  if (!data) return '—';
  const [a, m, d] = String(data).slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : String(data);
}
