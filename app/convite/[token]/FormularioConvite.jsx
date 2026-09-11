'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { BotaoEnviar, Feedback } from '@/components/membros/Formulario';
import { criarClienteNavegador } from '@/lib/supabase/client';
import { aceitarConvite } from '@/app/convite/acoes';

export default function FormularioConvite({ token, dominio }) {
  const router = useRouter();
  const [estado, acao] = useFormState(aceitarConvite, null);
  const [entrando, setEntrando] = useState(false);
  const [erroLogin, setErroLogin] = useState(null);

  // Guardados para o login automático: a action roda no servidor e não pode
  // devolver a senha de volta ao cliente.
  const credenciais = useRef({ email: '', senha: '' });

  useEffect(() => {
    if (!estado?.ok || entrando) return;
    setEntrando(true);

    (async () => {
      const { email, senha } = credenciais.current;
      try {
        const { error } = await criarClienteNavegador().auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) throw error;
        router.replace('/membros');
        router.refresh();
      } catch (e) {
        // A conta existe de qualquer forma; só o login automático falhou.
        setErroLogin(`Sua conta foi criada, mas o acesso automático falhou (${e.message}). Entre pelo login.`);
        setEntrando(false);
      }
    })();
  }, [estado, entrando, router]);

  if (estado?.ok) {
    return (
      <div style={{ display: 'grid', gap: 20 }}>
        <div className="aviso aviso--ok">Conta criada. {entrando ? 'Entrando…' : ''}</div>
        {erroLogin && (
          <>
            <div className="aviso aviso--erro">{erroLogin}</div>
            <a className="btn btn--solido" href="/login">Ir para o login</a>
          </>
        )}
      </div>
    );
  }

  return (
    <form
      action={acao}
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        credenciais.current = { email: String(fd.get('email')).trim(), senha: String(fd.get('senha')) };
      }}
      style={{ display: 'grid', gap: 20 }}
    >
      <Feedback estado={estado} />

      <input type="hidden" name="token" value={token} />

      <div className="campo">
        <label htmlFor="c-nome">Nome completo</label>
        <input id="c-nome" name="nome" required autoComplete="name" />
      </div>

      <div className="campo">
        <label htmlFor="c-email">E-mail</label>
        <input
          id="c-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={dominio ? `voce@${dominio}` : undefined}
        />
        {dominio && <div className="ajuda">Este convite aceita apenas e-mails @{dominio}.</div>}
      </div>

      <div className="campo">
        <label htmlFor="c-senha">Senha</label>
        <input id="c-senha" name="senha" type="password" minLength={8} required autoComplete="new-password" />
        <div className="ajuda">Mínimo de 8 caracteres.</div>
      </div>

      <div className="campo">
        <label htmlFor="c-senha2">Repita a senha</label>
        <input id="c-senha2" name="senha_confirmacao" type="password" minLength={8} required autoComplete="new-password" />
      </div>

      <div className="campo">
        <label htmlFor="c-linkedin">LinkedIn (opcional)</label>
        <input id="c-linkedin" name="linkedin" type="url" placeholder="https://www.linkedin.com/in/…" />
      </div>

      <BotaoEnviar carregando="Criando conta…">Criar conta</BotaoEnviar>
    </form>
  );
}
