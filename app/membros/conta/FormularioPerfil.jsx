'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { criarClienteNavegador } from '@/lib/supabase/client';

/**
 * Edição do próprio nome — o único campo do perfil que o membro controla.
 * Frente, turma, LinkedIn, bio e situação são definidos pela gestão; o trigger
 * proteger_campos_perfil rejeita no banco qualquer tentativa de mudá-los aqui.
 */
export default function FormularioPerfil({ usuario }) {
  const router = useRouter();
  const [nome, setNome] = useState(usuario.nome ?? '');
  const [estado, setEstado] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    const limpo = nome.trim();
    if (!limpo) return setEstado({ erro: 'O nome não pode ficar vazio.' });

    setSalvando(true);
    setEstado(null);

    const { error } = await criarClienteNavegador()
      .from('profiles')
      .update({ nome: limpo })
      .eq('id', usuario.id);

    setSalvando(false);
    if (error) setEstado({ erro: `Não foi possível salvar: ${error.message}` });
    else {
      setEstado({ ok: 'Nome atualizado.' });
      router.refresh();
    }
  }

  return (
    <form onSubmit={salvar} style={{ display: 'grid', gap: 20 }}>
      {estado?.erro && <div className="aviso aviso--erro">{estado.erro}</div>}
      {estado?.ok && <div className="aviso aviso--ok">{estado.ok}</div>}

      <div className="campo">
        <label htmlFor="nome">Nome completo</label>
        <input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>

      <button className="btn btn--solido" type="submit" disabled={salvando} style={{ justifySelf: 'start' }}>
        {salvando ? 'Salvando…' : 'Salvar nome'}
      </button>
    </form>
  );
}
