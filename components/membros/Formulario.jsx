'use client';

import { useFormStatus } from 'react-dom';

/** Botão que se desabilita sozinho enquanto a server action está rodando. */
export function BotaoEnviar({ children, carregando = 'Salvando…', variante = 'solido', ...resto }) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn btn--${variante}`} type="submit" disabled={pending} {...resto}>
      {pending ? carregando : children}
    </button>
  );
}

/** Renderiza o retorno padrão das actions: { ok, mensagem } ou { ok:false, erro }. */
export function Feedback({ estado }) {
  if (!estado) return null;
  if (estado.ok) return <div className="aviso aviso--ok">{estado.mensagem}</div>;
  if (estado.erro) return <div className="aviso aviso--erro">{estado.erro}</div>;
  return null;
}

/** Mínimo de caracteres da senha. Um número só, usado na regra e no texto. */
export const SENHA_MINIMA = 8;

/**
 * O requisito de senha, que reage ao que já foi digitado.
 *
 * Antes era um `<div class="ajuda">Mínimo de 8 caracteres.</div>` parado: ele
 * dizia a regra mas nunca dizia se ela já valia, então a pessoa digitava e
 * ficava contando letra por letra para saber se podia enviar. Agora o estado é
 * visível — cinza com "○" enquanto falta, azul com "✓" quando cumpre.
 *
 * `aria-live="polite"` para quem usa leitor de tela ouvir a mudança sem ser
 * interrompido a cada tecla.
 */
export function RequisitoSenha({ senha, minimo = SENHA_MINIMA }) {
  const ok = String(senha ?? '').length >= minimo;
  return (
    <div className="requisito" data-ok={ok ? 'sim' : 'nao'} aria-live="polite">
      {ok ? `Senha com ${minimo} caracteres ou mais.` : `Use pelo menos ${minimo} caracteres.`}
    </div>
  );
}

export function Campo({ label, ajuda, children, id }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{label}</label>
      {children}
      {ajuda && <div className="ajuda">{ajuda}</div>}
    </div>
  );
}
