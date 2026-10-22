'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { criarProjeto } from './acoes';

/**
 * Criar projeto pedindo só o título.
 *
 * O resto (briefing, datas, equipe, vitrine) é preenchido inline na página
 * do projeto. Pedir dez campos num formulário antes de a página existir era
 * o atrito que fazia ninguém registrar projeto.
 */
export default function NovoProjeto() {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [erro, setErro] = useState(null);
  const [pendente, iniciar] = useTransition();

  const criar = () => {
    const nome = titulo.trim();
    if (!nome) return;
    setErro(null);
    iniciar(async () => {
      const r = await criarProjeto({ titulo: nome });
      if (!r?.ok) return setErro(r?.erro ?? 'Não foi possível criar.');
      // Vai direto para a página nova: o passo seguinte é sempre alocar a
      // equipe e pôr a deadline, e isso só existe lá.
      router.push(`/membros/projetos/${r.slug}`);
    });
  };

  return (
    <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              criar();
            }
          }}
          disabled={pendente}
          placeholder="+ novo projeto"
          style={{
            flex: 1,
            background: 'transparent',
            border: '1px dashed var(--linha-forte)',
            color: 'var(--osso)',
            font: 'inherit',
            fontSize: 14,
            padding: '12px 14px',
          }}
        />
        <button className="btn btn--solido btn--pequeno" disabled={pendente || !titulo.trim()} onClick={criar}>
          {pendente ? 'Criando…' : 'Criar'}
        </button>
      </div>
      {erro && <div className="aviso aviso--erro">{erro}</div>}
    </div>
  );
}
