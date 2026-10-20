'use client';

import { useState } from 'react';
import { criarClienteNavegador } from '@/lib/supabase/client';

/**
 * Troca de senha do próprio usuário. Roda no navegador, com a sessão dele.
 *
 * `emailAtual` liga a conferência da senha atual: sem ela, quem pegasse uma
 * sessão aberta trocaria a senha sem saber a antiga. O fluxo de redefinição
 * por link de e-mail não passa `emailAtual` — lá o usuário chegou justamente
 * porque esqueceu a senha, e a prova de identidade foi o link.
 */
export default function FormularioSenha({ aoTrocar, emailAtual }) {
  const exigirAtual = Boolean(emailAtual);
  const [atual, setAtual] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [estado, setEstado] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function trocar(e) {
    e.preventDefault();
    setEstado(null);

    if (exigirAtual && !atual) return setEstado({ erro: 'Escreva sua senha atual.' });
    if (senha.length < 8) return setEstado({ erro: 'A senha precisa ter pelo menos 8 caracteres.' });
    if (senha !== confirmacao) return setEstado({ erro: 'As duas senhas não são iguais.' });
    if (exigirAtual && senha === atual) {
      return setEstado({ erro: 'A nova senha precisa ser diferente da atual.' });
    }

    setSalvando(true);
    const supabase = criarClienteNavegador();

    // O Supabase não tem "trocar senha conferindo a antiga": a conferência é
    // um login com a senha atual. Um login que falha não derruba a sessão que
    // já está aberta, então errar aqui é inofensivo.
    if (exigirAtual) {
      const { error: erroAtual } = await supabase.auth.signInWithPassword({
        email: emailAtual,
        password: atual,
      });
      if (erroAtual) {
        setSalvando(false);
        return setEstado({
          erro: /invalid login credentials/i.test(erroAtual.message)
            ? 'Senha atual incorreta.'
            : `Não foi possível conferir a senha atual: ${erroAtual.message}`,
        });
      }
    }

    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) return setEstado({ erro: `Não foi possível trocar: ${error.message}` });

    setAtual('');
    setSenha('');
    setConfirmacao('');
    setEstado({ ok: 'Senha alterada.' });
    aoTrocar?.();
  }

  return (
    <form onSubmit={trocar} method="post" style={{ display: 'grid', gap: 20 }}>
      {estado?.erro && <div className="aviso aviso--erro">{estado.erro}</div>}
      {estado?.ok && <div className="aviso aviso--ok">{estado.ok}</div>}

      {exigirAtual && (
        <div className="campo">
          <label htmlFor="senha-atual">Senha atual</label>
          <input
            id="senha-atual"
            type="password"
            autoComplete="current-password"
            required
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
          />
        </div>
      )}

      <div className="campo">
        <label htmlFor="senha-nova">Nova senha</label>
        <input
          id="senha-nova"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <div className="ajuda">Mínimo de 8 caracteres.</div>
      </div>

      <div className="campo">
        <label htmlFor="senha-confirma">Repita a nova senha</label>
        <input
          id="senha-confirma"
          type="password"
          autoComplete="new-password"
          required
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
      </div>

      <button className="btn btn--vazado" type="submit" disabled={salvando} style={{ justifySelf: 'start' }}>
        {salvando ? 'Trocando…' : 'Trocar senha'}
      </button>
    </form>
  );
}
