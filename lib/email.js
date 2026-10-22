/**
 * Envio de e-mail pelo Gmail da liga, por SMTP.
 *
 * Por que o Gmail e não um serviço de entrega: mandar em nome de um domínio
 * (convites@iqf.com.br) exige verificar esse domínio por DNS, e a liga não tem
 * domínio próprio. O Gmail resolve isso sem comprar nada — e o remetente fica
 * sendo a conta institucional, que é o que a turma reconhece.
 *
 * O preço é o limite: ~500 destinatários por dia numa conta comum. Uma turma
 * cabe com folga; um disparo para a liga inteira, várias vezes no dia, não.
 * Se um dia a liga tiver domínio, trocar isto por um Resend/SES da vida é
 * reescrever só este arquivo — o resto do código só conhece enviarEmail().
 *
 * Ambiente:
 *   GMAIL_USER          — insperqfc@gmail.com
 *   GMAIL_APP_PASSWORD  — senha de app de 16 caracteres (Conta Google →
 *                         Segurança → Senhas de app). NÃO é a senha normal da
 *                         conta: a senha normal não funciona em SMTP, e uma
 *                         senha de app dá para revogar sozinha se vazar.
 *   EMAIL_NOME          — nome exibido na caixa de entrada (opcional)
 */

import nodemailer from 'nodemailer';
import { registrarErro } from '@/lib/erros';

const NOME_PADRAO = 'Insper Quantitative Finance';

/** O painel do Google mostra a senha em grupos de 4; o SMTP quer ela limpa. */
const senhaApp = () => process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '') || '';

export const emailConfigurado = () => Boolean(process.env.GMAIL_USER && senhaApp());

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
  const usuario = process.env.GMAIL_USER;
  const senha = senhaApp();

  if (!usuario) return { ok: false, erro: 'GMAIL_USER não definido no ambiente do servidor.' };
  if (!senha) return { ok: false, erro: 'GMAIL_APP_PASSWORD não definida no ambiente do servidor.' };

  // O Gmail ignora qualquer From que não seja a conta autenticada (ou um alias
  // verificado nela), então só o nome de exibição é nosso para escolher.
  const remetente = `${process.env.EMAIL_NOME || NOME_PADRAO} <${usuario}>`;

  try {
    const transporte = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // TLS desde o primeiro byte, sem passar por STARTTLS
      auth: { user: usuario, pass: senha },
    });

    await transporte.sendMail({ from: remetente, to: para, subject: assunto, html, text: texto });
    return { ok: true };
  } catch (e) {
    // Erro de autenticação é o caso comum e tem conserto específico; vale
    // dizer qual é, em vez de deixar "535-5.7.8" na tela da gestão.
    if (e.responseCode === 535 || /invalid login|username and password/i.test(e.message ?? '')) {
      return {
        ok: false,
        erro:
          'O Gmail recusou o login. Confira GMAIL_USER e use uma senha de app ' +
          '(Conta Google → Segurança → Senhas de app), não a senha normal da conta.',
      };
    }
    // Fora do 535, a mensagem do nodemailer/Gmail costuma citar host, porta e
    // a conta usada — detalhe de infra que não é da conta de quem convida.
    return { ok: false, erro: registrarErro('email: enviar pelo Gmail', e, { acao: 'enviar o e-mail' }) };
  }
}

/** Corpo do convite. Um link, uma frase, nada para interpretar. */
export function montarConvite({ nome, link, rotulo }) {
  const primeiroNome = escapar(String(nome ?? '').split(' ')[0]);

  const texto =
    `Olá, ${primeiroNome}!\n\n` +
    `Você foi convidado para a área de membros da Insper Quantitative Finance (${rotulo}).\n` +
    `Crie sua conta neste link:\n\n${link}\n\n` +
    'Este link é pessoal — não repasse. Nele você confirma seu nome e escolhe sua própria senha.\n\n' +
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
  <p style="color:#555;font-size:13px">Este link é pessoal — não repasse. Nele você confirma seu nome e escolhe sua própria senha.</p>
  <p style="color:#555;font-size:13px">Insper Quantitative Finance</p>
</div>`;

  return { assunto: 'Seu acesso à área de membros da IQF', html, texto };
}
