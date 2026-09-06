'use client';

import { useState } from 'react';
import { criarClienteNavegador } from '@/lib/supabase/client';

/**
 * Troca do próprio e-mail de acesso.
 *
 * O Supabase não muda nada na hora: manda um link de confirmação para o
 * endereço novo (e, por padrão, um aviso para o antigo). O e-mail só troca
 * de fato quando o link é aberto — até lá o login continua pelo antigo.
 * Depois da confirmação, o trigger sincronizar_email_perfil atualiza a linha
 * em profiles, para o quadro de membros não ficar com o endereço velho.
 */
export default function FormularioEmail({ emailAtual }) {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function trocar(e) {
    e.preventDefault();
    const novo = email.trim().toLowerCase();

    if (novo === emailAtual.toLowerCase()) {
      return setEstado({ erro: 'Esse já é o seu e-mail atual.' });
    }

    setSalvando(true);
    setEstado(null);

    const { error } = await criarClienteNavegador().auth.updateUser({ email: novo });

    setSalvando(false);
    if (error) {
      setEstado({
        erro: /already/i.test(error.message)
          ? 'Já existe uma conta com esse e-mail.'
          : `Não foi possível trocar: ${error.message}`,
      });
      return;
    }

    setEmail('');
    setEstado({
      ok: `Enviamos um link de confirmação para ${novo}. O e-mail só muda depois que você abrir esse link — até lá, continue entrando com o atual.`,
    });
  }

  return (
    <form onSubmit={trocar} style={{ display: 'grid', gap: 20 }}>
      {estado?.erro && <div className="aviso aviso--erro">{estado.erro}</div>}
      {estado?.ok && <div className="aviso aviso--ok">{estado.ok}</div>}

      <div className="campo">
        <label htmlFor="email-novo">Novo e-mail</label>
        <input
          id="email-novo"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={emailAtual}
        />
        <div className="ajuda">Atual: {emailAtual}</div>
      </div>

      <button className="btn btn--vazado" type="submit" disabled={salvando} style={{ justifySelf: 'start' }}>
        {salvando ? 'Enviando…' : 'Enviar link de confirmação'}
      </button>
    </form>
  );
}
