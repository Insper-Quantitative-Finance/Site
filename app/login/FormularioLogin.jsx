'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { criarClienteNavegador } from '@/lib/supabase/client';
import { registrarErro } from '@/lib/erros';

/**
 * A tradução mora em lib/erros.js, não aqui. Antes esta tela tinha a sua
 * própria: ela acertava os casos comuns, mas o fallback era
 * `'Não foi possível entrar: ' + msg` — o que punha frase do Supabase em inglês
 * na tela — e o caso de rede imprimia a URL do projeto e o nome das env vars.
 */
export default function FormularioLogin({ destino }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  // Orientação é um terceiro estado, separado de erro e de sucesso: "preencha
  // o e-mail para receber o link" não é falha de ninguém, e em vermelho era
  // lido como se a pessoa tivesse feito algo errado.
  const [orientacao, setOrientacao] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setOrientacao(null);
    setEnviando(true);

    let error;
    try {
      ({ error } = await criarClienteNavegador().auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      }));
    } catch (e) {
      // criarClienteNavegador() lança quando o build saiu sem as env vars —
      // indistinguível, para quem usa, de servidor fora do ar.
      setErro(registrarErro('login: criar client', e, { acao: 'entrar' }));
      setEnviando(false);
      return;
    }

    if (error) {
      setErro(registrarErro('login: signInWithPassword', error, { acao: 'entrar' }));
      setEnviando(false);
      return;
    }

    // refresh() faz o middleware reler a sessão nova antes da navegação.
    router.replace(destino);
    router.refresh();
  }

  async function recuperarSenha() {
    if (!email.trim()) {
      // Sem referência a posição ("campo acima"/"abaixo"): este bloco é
      // renderizado no topo do formulário, então qualquer direção que ele
      // desse estaria errada para metade dos casos. O campo é nomeado.
      setErro(null);
      setAviso(null);
      setOrientacao('Escreva seu e-mail no campo "E-mail" e toque de novo em "Esqueci minha senha".');
      return;
    }
    setErro(null);
    setOrientacao(null);
    setEnviando(true);

    try {
      const { error } = await criarClienteNavegador().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/membros/conta/redefinir`,
      });
      setEnviando(false);
      if (error) setErro(registrarErro('login: resetPasswordForEmail', error, { acao: 'enviar o link' }));
      else setAviso('Se esse e-mail estiver cadastrado, o link de redefinição chegou na caixa de entrada.');
    } catch (e) {
      setEnviando(false);
      setErro(registrarErro('login: reset', e, { acao: 'enviar o link' }));
    }
  }

  return (
    // method="post" é rede de segurança: o envio real é por JS, mas se ele
    // falhar o default seria GET — e a senha iria parar na URL.
    <form onSubmit={entrar} method="post" style={{ display: 'grid', gap: 20 }}>
      {erro && <div className="aviso aviso--erro">{erro}</div>}
      {orientacao && <div className="aviso aviso--info">{orientacao}</div>}
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
