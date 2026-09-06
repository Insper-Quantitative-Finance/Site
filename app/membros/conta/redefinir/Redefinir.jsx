'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FormularioSenha from '../FormularioSenha';

export default function Redefinir() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);

  if (pronto) {
    return (
      <div style={{ display: 'grid', gap: 24, justifyItems: 'start' }}>
        <div className="aviso aviso--ok">Senha redefinida. Sua sessão já está ativa.</div>
        <button className="btn btn--solido" onClick={() => router.replace('/membros')}>
          Ir para a área de membros
        </button>
      </div>
    );
  }

  return <FormularioSenha aoTrocar={() => setPronto(true)} />;
}
