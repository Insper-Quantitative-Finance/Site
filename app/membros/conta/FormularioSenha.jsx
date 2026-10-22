'use client';

import { useState } from 'react';
import { criarClienteNavegador } from '@/lib/supabase/client';
import { registrarErro, tipoDeErro } from '@/lib/erros';
import { RequisitoSenha, SENHA_MINIMA } from '@/components/membros/Formulario';

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
    if (senha.length < SENHA_MINIMA) return setEstado({ erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` });
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
        // Aqui o campo é um só, então "e-mail ou senha incorretos" (a frase
        // padrão do caso) apontaria para um campo que esta tela não tem.
        const motivo = registrarErro('conta: conferir senha atual', erroAtual, {
          acao: 'conferir a senha atual',
        });
        return setEstado({
          erro: tipoDeErro(erroAtual) === 'credenciais' ? 'Senha atual incorreta.' : motivo,
        });
      }
    }

    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    // Era aqui que saíam as regras de senha do Supabase em inglês ("password
    // should be at least…"); lib/erros.js tem a versão em português.
    if (error) return setEstado({ erro: registrarErro('conta: trocar senha', error, { acao: 'trocar a senha' }) });

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
          minLength={SENHA_MINIMA}
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <RequisitoSenha senha={senha} />
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
        {confirmacao && (
          <div className="requisito" data-ok={confirmacao === senha ? 'sim' : 'nao'} aria-live="polite">
            {confirmacao === senha ? 'As duas senhas conferem.' : 'As duas senhas ainda não conferem.'}
          </div>
        )}
      </div>

      <button className="btn btn--vazado" type="submit" disabled={salvando} style={{ justifySelf: 'start' }}>
        {salvando ? 'Trocando…' : 'Trocar senha'}
      </button>
    </form>
  );
}
