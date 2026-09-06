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

export function Campo({ label, ajuda, children, id }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{label}</label>
      {children}
      {ajuda && <div className="ajuda">{ajuda}</div>}
    </div>
  );
}
