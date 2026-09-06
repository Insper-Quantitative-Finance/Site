'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { criarClienteNavegador } from '@/lib/supabase/client';

export default function BotaoSair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    await criarClienteNavegador().auth.signOut();
    router.replace('/');
    router.refresh();
  }

  return (
    <button className="btn btn--vazado btn--pequeno" onClick={sair} disabled={saindo}>
      {saindo ? 'Saindo…' : 'Sair'}
    </button>
  );
}
