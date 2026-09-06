'use client';

import { useState } from 'react';
import { criarClienteNavegador } from '@/lib/supabase/client';

/** Troca de senha do próprio usuário. Roda no navegador, com a sessão dele. */
export default function FormularioSenha({ aoTrocar }) {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [estado, setEstado] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function trocar(e) {
    e.preventDefault();
    setEstado(null);

    if (senha.length < 8) return setEstado({ erro: 'A senha precisa ter pelo menos 8 caracteres.' });
    if (senha !== confirmacao) return setEstado({ erro: 'As duas senhas não são iguais.' });

    setSalvando(true);
    const { error } = await criarClienteNavegador().auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) return setEstado({ erro: `Não foi possível trocar: ${error.message}` });

    setSenha('');
    setConfirmacao('');
    setEstado({ ok: 'Senha alterada.' });
    aoTrocar?.();
  }

  return (
    <form onSubmit={trocar} style={{ display: 'grid', gap: 20 }}>
      {estado?.erro && <div className="aviso aviso--erro">{estado.erro}</div>}
      {estado?.ok && <div className="aviso aviso--ok">{estado.ok}</div>}

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
