/**
 * Tradução de erro para a tela, num lugar só.
 *
 * A regra é uma: o que o usuário lê nunca é a mensagem crua. Mensagem crua do
 * Supabase vem em inglês, fala de `profiles`, de `row-level security`, de
 * `NEXT_PUBLIC_SUPABASE_URL` e do host do projeto — tudo isso é desenho interno
 * do sistema e não ajuda quem está olhando a tela. Pior: conta a quem não devia
 * como o banco está montado.
 *
 * Então: os casos que o usuário consegue resolver sozinho (senha errada, e-mail
 * já cadastrado, link expirado) ganham frase própria em português; TODO o resto
 * cai numa frase só, e o detalhe vai para o log do servidor via registrarErro().
 *
 * Este arquivo é importável dos dois lados (client e servidor) de propósito:
 * se a tradução morasse só no servidor, cada formulário do navegador voltaria a
 * inventar a sua. Por isso não há import nenhum aqui, nem 'use client', nem
 * 'use server', nem leitura de env.
 */

/** O fallback. Toda mensagem não prevista termina aqui. */
export const ERRO_GENERICO =
  'Algo deu errado. Tente de novo; se persistir, avise a diretoria.';

/** Falha de rede/infra: não é culpa de quem está usando, e vai passar. */
export const ERRO_CONEXAO =
  'Não foi possível conectar. Tente novamente mais tarde.';

/**
 * Casos reconhecidos, na ordem em que são testados.
 *
 * `codigo` casa com error.code (Postgres/PostgREST/Supabase Auth) e `texto` com
 * error.message. Os dois são opcionais; o primeiro que casar ganha. A ordem
 * importa: conexão vem antes de tudo, porque uma falha de rede no login não é
 * "senha errada", e `rate limit` vem antes de `invalid` para não ser engolido.
 */
const CASOS = [
  // ---- infra: nada chegou ao servidor ----
  {
    nome: 'conexao',
    codigo: /^(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT)$/i,
    texto: /failed to fetch|fetch failed|network ?error|networkerror|load failed|getaddrinfo|socket hang up|timeout|upstream connect|service unavailable|bad gateway|502|503|504/i,
    mensagem: ERRO_CONEXAO,
  },
  // A biblioteca do Supabase marca o que vale retentar com um nome próprio.
  // TypeError de propósito fora daqui: `fetch` que não sai do navegador lança
  // TypeError, mas o texto ("Failed to fetch") já é pego acima — e um TypeError
  // qualquer é bug nosso, que não deve virar "tente mais tarde".
  { nome: 'conexao', erroNome: /AuthRetryableFetchError|AbortError|FetchError/i, mensagem: ERRO_CONEXAO },
  // Build sem as env vars do Supabase: para quem usa a tela é indistinguível
  // de servidor fora do ar, e o nome da variável não é da conta dele.
  { nome: 'conexao', texto: /supabase não (está )?configurad|credenciais do supabase/i, mensagem: ERRO_CONEXAO },

  // ---- autenticação ----
  { nome: 'credenciais', texto: /invalid login credentials|invalid_credentials/i, mensagem: 'E-mail ou senha incorretos.' },
  {
    nome: 'limite',
    codigo: /^over_(email|sms|request)_(send_)?rate_limit$/i,
    texto: /rate ?limit|too many requests|security purposes/i,
    mensagem: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
  },
  { nome: 'nao-confirmado', texto: /email not confirmed|email_not_confirmed/i, mensagem: 'Este e-mail ainda não foi confirmado. Procure o link na caixa de entrada.' },
  { nome: 'ja-existe', texto: /already registered|already been registered|email_exists|user already/i, mensagem: 'Já existe uma conta com esse e-mail.' },
  { nome: 'email-invalido', texto: /invalid email|email_address_invalid|validation_failed.*email/i, mensagem: 'Esse e-mail não parece válido. Confira e tente de novo.' },
  { nome: 'senha-curta', texto: /password should be at least|weak[_ ]password|password.*too short|minimum.*characters/i, mensagem: 'A senha é curta demais. Use pelo menos 8 caracteres.' },
  { nome: 'senha-igual', texto: /should be different|same[_ ]password|different from the old/i, mensagem: 'A nova senha precisa ser diferente da atual.' },
  // Sem `session` nem `jwt` soltos: casariam com frase nossa que fale em
  // "sessão". Só os textos que o Supabase realmente emite.
  { nome: 'sessao', texto: /auth session missing|session[_ ]not[_ ]found|refresh[_ ]token[_ ]not[_ ]found|invalid (refresh token|jwt)|jwt expired|bad_jwt/i, mensagem: 'Sua sessão expirou. Entre de novo.' },
  // `sessao` vem antes de propósito: "JWT expired" casaria com o /expired/ do
  // caso abaixo e viraria "peça um novo link", mandando quem só precisa
  // relogar atrás de um e-mail que não existe.
  { nome: 'link-velho', texto: /token has expired|otp_expired|token_not_found|invalid token|link is invalid or has expired/i, mensagem: 'Este link não vale mais. Peça um novo e tente de novo.' },

  // ---- banco: permissão ----
  // Esta é a mais importante de interceptar: a mensagem crua nomeia a tabela e
  // a política de acesso.
  {
    nome: 'permissao',
    codigo: /^(42501|PGRST301|PGRST302|401|403)$/,
    texto: /row[- ]level security|violates row|permission denied|insufficient|not authorized|forbidden/i,
    mensagem: 'Você não tem permissão para fazer isso.',
  },

  // ---- banco: integridade ----
  { nome: 'duplicado', codigo: /^23505$/, texto: /duplicate key|already exists/i, mensagem: 'Isso já existe. Confira se não foi cadastrado antes.' },
  { nome: 'em-uso', codigo: /^23503$/, texto: /foreign key/i, mensagem: 'Este item está ligado a outros registros e não pode ser removido agora.' },
  { nome: 'obrigatorio', codigo: /^(23502|23514)$/, mensagem: 'Falta preencher um campo obrigatório, ou um valor não é aceito.' },
  { nome: 'grande', codigo: /^(22001|22003|53100)$/, texto: /value too long|payload too large|exceeded the maximum/i, mensagem: 'O conteúdo enviado é grande demais.' },

  // ---- banco: migração não aplicada ----
  // Para quem usa a tela isto é um defeito nosso, não algo a resolver. O nome
  // do arquivo .sql a rodar sai no log, não na tela.
  {
    nome: 'migracao',
    codigo: /^(PGRST204|PGRST205|42P01|42703|42704)$/,
    texto: /schema cache|does not exist|relation .* does not/i,
    mensagem: 'Esta parte do sistema ainda não está pronta. Avise a diretoria.',
  },

  // ---- arquivos ----
  { nome: 'arquivo', texto: /object not found|key not found|no such file|bucket not found/i, mensagem: 'Arquivo não encontrado. Ele pode ter sido removido.' },
  { nome: 'arquivo-grande', texto: /the object exceeded|file size|too large/i, mensagem: 'O arquivo é grande demais para subir.' },
];

/**
 * Erro cuja mensagem FOI escrita para a tela ("Ação restrita aos cargos de
 * gestão.", "Este convite é pessoal…").
 *
 * Sem esta distinção não há como um `catch` saber se o que ele pegou é uma
 * regra nossa, em português e proposital, ou um erro do Postgres que não pode
 * ser mostrado. Era o que acontecia nas actions da gestão: um `catch (e) =>
 * erro(e.message)` servia as duas coisas, e por isso passava a mensagem crua
 * junto com a nossa.
 *
 * `paraUsuario` é uma propriedade, não só a classe: a instância não sobrevive à
 * fronteira entre servidor e cliente, mas o objeto simples atravessa.
 */
export class ErroDeRegra extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroDeRegra';
    this.paraUsuario = true;
  }
}

/** Aceita Error, { code, message } do Supabase, string, ou nada. */
function partes(erro) {
  if (!erro) return { codigo: '', texto: '', nome: '' };
  if (typeof erro === 'string') return { codigo: '', texto: erro, nome: '' };

  const texto = [erro.message, erro.error_description, erro.details, erro.hint, erro.error]
    .filter((v) => typeof v === 'string')
    .join(' · ');

  return {
    codigo: String(erro.code ?? erro.status ?? erro.statusCode ?? ''),
    texto,
    nome: String(erro.name ?? ''),
  };
}

function casar(erro) {
  const { codigo, texto, nome } = partes(erro);

  for (const caso of CASOS) {
    if (caso.codigo && codigo && caso.codigo.test(codigo)) return caso;
    if (caso.texto && texto && caso.texto.test(texto)) return caso;
    if (caso.erroNome && nome && caso.erroNome.test(nome)) return caso;
  }
  return null;
}

/**
 * A frase que vai para a tela.
 *
 *   mensagemDeErro(error)                        → frase do caso, ou a genérica
 *   mensagemDeErro(error, { acao: 'salvar' })    → "Não foi possível salvar. …"
 *
 * `acao` só entra no fallback e nada mais: nos casos reconhecidos a frase
 * própria já é mais específica do que "não foi possível salvar".
 */
export function mensagemDeErro(erro, { acao } = {}) {
  // Mensagem nossa passa inteira: é a única que já está em português e foi
  // escrita sabendo o que a pessoa está vendo na tela.
  if (erro?.paraUsuario && typeof erro.message === 'string' && erro.message) return erro.message;

  const caso = casar(erro);
  if (caso) return caso.mensagem;
  if (acao) return `Não foi possível ${acao}. Tente de novo; se persistir, avise a diretoria.`;
  return ERRO_GENERICO;
}

/** O rótulo do caso reconhecido ('permissao', 'conexao'…), ou null. */
export function tipoDeErro(erro) {
  return casar(erro)?.nome ?? null;
}

/** Foi falha de conexão? Quem chama às vezes quer reagir, não só avisar. */
export function ehErroDeConexao(erro) {
  return tipoDeErro(erro) === 'conexao';
}

/**
 * O detalhe no log, nunca na tela.
 *
 * Contrapartida de esconder a mensagem crua: ela tem de sobrar em algum lugar,
 * senão depurar em produção fica impossível. No servidor isto cai no log da
 * Vercel/Render; no navegador, no console de quem está com a página aberta.
 *
 * Devolve a mensagem amigável, para dar para escrever
 * `return erro(registrarErro('salvar perfil', error, { acao: 'salvar' }))`.
 */
export function registrarErro(contexto, erro, opcoes) {
  // Regra de negócio não é defeito: "ação restrita à gestão" no log de erro, com
  // stack, só atrapalharia quem está procurando o que quebrou de verdade.
  if (erro?.paraUsuario) return mensagemDeErro(erro, opcoes);

  const { codigo, texto, nome } = partes(erro);
  const detalhe = [nome, codigo, texto].filter(Boolean).join(' | ') || String(erro);

  try {
    console.error(`[erro] ${contexto}: ${detalhe}`);
    // A stack é o que diz ONDE quebrou; sem ela o log acima raramente basta.
    if (erro?.stack) console.error(erro.stack);
  } catch {}

  return mensagemDeErro(erro, opcoes);
}

/**
 * Código curto para o usuário citar quando avisar a diretoria.
 *
 * O `digest` que o Next gera para um erro de servidor é um hash longo; os 8
 * primeiros caracteres já são suficientes para achar a linha no log e cabem
 * numa mensagem de WhatsApp. Sem digest (erro do cliente), não há o que citar.
 */
export function codigoCurto(digest) {
  if (typeof digest !== 'string' || !digest) return null;
  return digest.slice(0, 8).toUpperCase();
}
