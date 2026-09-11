/**
 * Envio de e-mail pela API do Resend.
 *
 * Via fetch, sem SDK: é uma chamada HTTP só, e uma dependência a menos é uma
 * dependência a menos para atualizar. A chave nunca sai do servidor.
 *
 * Ambiente:
 *   RESEND_API_KEY   — chave do painel (re_…)
 *   EMAIL_REMETENTE  — 'IQF <convites@seudominio.com>'. O domínio precisa
 *                      estar verificado no Resend; sem verificar, a API só
 *                      aceita 'onboarding@resend.dev' e só entrega para o
 *                      e-mail dono da conta (serve para testar).
 */

const API = 'https://api.resend.com/emails';

export const emailConfigurado = () => Boolean(process.env.RESEND_API_KEY);

/** Escapa texto antes de interpolar no HTML — nome vem de planilha. */
const escapar = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

/**
 * Dispara um e-mail. Devolve { ok } ou { ok:false, erro } — nunca lança,
 * porque um disparo em lote não pode morrer na primeira caixa postal cheia.
 */
export async function enviarEmail({ para, assunto, html, texto }) {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;

  if (!chave) return { ok: false, erro: 'RESEND_API_KEY não definida no ambiente do servidor.' };
  if (!remetente) return { ok: false, erro: 'EMAIL_REMETENTE não definido no ambiente do servidor.' };

  let resposta;
  try {
    resposta = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: remetente, to: [para], subject: assunto, html, text: texto }),
    });
  } catch (e) {
    return { ok: false, erro: `Falha de rede ao falar com o Resend: ${e.message}` };
  }

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '');
    let detalhe = corpo;
    try { detalhe = JSON.parse(corpo).message ?? corpo; } catch {}
    return { ok: false, erro: `Resend recusou (${resposta.status}): ${detalhe}` };
  }

  return { ok: true };
}

/** Corpo do convite de trainee. Um link, uma frase, nada para interpretar. */
export function montarConvite({ nome, link, rotulo }) {
  const primeiroNome = escapar(String(nome ?? '').split(' ')[0]);

  const texto =
    `Olá, ${primeiroNome}!\n\n` +
    `Você foi convidado para a área de membros da Insper Quantitative Finance (${rotulo}).\n` +
    `Crie sua conta neste link:\n\n${link}\n\n` +
    'Este link é pessoal — não repasse. Nele você escolhe sua própria senha.\n\n' +
    'Insper Quantitative Finance';

  const html = `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
  <p>Olá, ${primeiroNome}!</p>
  <p>Você foi convidado para a área de membros da <strong>Insper Quantitative Finance</strong> (${escapar(rotulo)}).</p>
  <p style="margin:28px 0">
    <a href="${escapar(link)}"
       style="background:#0C1A4E;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;display:inline-block">
      Criar minha conta
    </a>
  </p>
  <p style="color:#555;font-size:13px">
    Se o botão não funcionar, copie este endereço:<br>
    <span style="word-break:break-all">${escapar(link)}</span>
  </p>
  <p style="color:#555;font-size:13px">Este link é pessoal — não repasse. Nele você escolhe sua própria senha.</p>
  <p style="color:#555;font-size:13px">Insper Quantitative Finance</p>
</div>`;

  return { assunto: 'Seu acesso à área de membros da IQF', html, texto };
}
