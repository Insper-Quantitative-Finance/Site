'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { criarClienteNavegador } from '@/lib/supabase/client';

/**
 * "Failed to fetch" é o que o navegador diz quando nem chegou ao Supabase —
 * DNS errado, projeto pausado ou offline. Sem tradução, parece senha errada.
 */
function traduzirErro(error) {
  const msg = error?.message ?? '';

  if (/failed to fetch|network|load failed/i.test(msg)) {
    const host = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(não configurado)';
    return (
      `Não foi possível falar com o servidor de autenticação (${host}). ` +
      'Verifique se NEXT_PUBLIC_SUPABASE_URL aponta para o projeto certo, se o projeto ' +
      'do Supabase não está pausado e se você está online. Lembre: essa variável é lida ' +
      'no build — mudá-la exige rodar o build de novo.'
    );
  }
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Este e-mail ainda não foi confirmado.';
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';

  return `Não foi possível entrar: ${msg}`;
}

export default function FormularioLogin({ destino }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);

    let error;
    try {
      ({ error } = await criarClienteNavegador().auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      }));
    } catch (e) {
      // criarClienteNavegador() lança quando o build saiu sem as env vars.
      setErro(e.message);
      setEnviando(false);
      return;
    }

    if (error) {
      setErro(traduzirErro(error));
      setEnviando(false);
      return;
    }

    // refresh() faz o middleware reler a sessão nova antes da navegação.
    router.replace(destino);
    router.refresh();
  }

  async function recuperarSenha() {
    if (!email.trim()) {
      setErro('Escreva seu e-mail no campo acima para receber o link de redefinição.');
      return;
    }
    setErro(null);
    setEnviando(true);

    try {
      const { error } = await criarClienteNavegador().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/membros/conta/redefinir`,
      });
      setEnviando(false);
      if (error) setErro(traduzirErro(error));
      else setAviso('Se esse e-mail estiver cadastrado, o link de redefinição chegou na caixa de entrada.');
    } catch (e) {
      setEnviando(false);
      setErro(e.message);
    }
  }

  return (
    <form onSubmit={entrar} style={{ display: 'grid', gap: 20 }}>
      {erro && <div className="aviso aviso--erro">{erro}</div>}
      {aviso && <div className="aviso aviso--ok">{aviso}</div>}

      <div className="campo">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="campo">
        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>

      <button className="btn btn--solido" type="submit" disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>

      <button
        type="button"
        onClick={recuperarSenha}
        disabled={enviando}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          color: 'var(--azul)',
          fontFamily: 'inherit',
          fontSize: 13,
          cursor: 'pointer',
          justifySelf: 'start',
        }}
      >
        Esqueci minha senha
      </button>
    </form>
  );
}
