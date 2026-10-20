'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const LINKS_BASE = [
  { href: '/membros', label: 'Início' },
  { href: '/membros/trainee', label: 'Trainee' },
  { href: '/membros/projetos', label: 'Projetos', geral: true },
  { href: '/membros/quadro', label: 'Quadro de membros', geral: true },
  { href: '/membros/materiais', label: 'Materiais', geral: true },
  { href: '/membros/conta', label: 'Minha conta' },
];

// Projetos não está aqui: a aba "Projetos" é de todo membro efetivado, e
// dentro dela o que é restrito (vitrine, equipe) aparece conforme o cargo.
const LINKS_GESTAO = [
  { href: '/membros/gestao/usuarios', label: 'Usuários' },
];

export default function NavMembros({ gestao, areaGeral = true }) {
  const pathname = usePathname();
  const base = areaGeral ? LINKS_BASE : LINKS_BASE.filter((l) => !l.geral);
  const links = gestao ? [...base, ...LINKS_GESTAO] : base;

  // A barra rola de lado desde sempre, mas com a scrollbar escondida nada
  // dizia isso: em tela estreita as últimas abas simplesmente sumiam. Estes
  // flags acendem um degradê na borda que ainda tem conteúdo escondido.
  const trilho = useRef(null);
  const [sombra, setSombra] = useState({ esquerda: false, direita: false });

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;

    const medir = () => {
      // 1px de folga: o scroll fracionário de telas com zoom nunca fecha a
      // conta exata e a sombra da direita ficaria acesa no fim da barra.
      const fim = el.scrollWidth - el.clientWidth - el.scrollLeft;
      setSombra({ esquerda: el.scrollLeft > 1, direita: fim > 1 });
    };

    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      el.removeEventListener('scroll', medir);
      observador.disconnect();
    };
  }, [links.length]);

  return (
    <nav style={{ borderBottom: '1px solid var(--linha-card)', padding: '0 var(--gutter)' }}>
      <div
        className="container nav-rolavel"
        data-sombra-esquerda={sombra.esquerda ? '' : undefined}
        data-sombra-direita={sombra.direita ? '' : undefined}
      >
        <div ref={trilho} style={{ display: 'flex', gap: 28, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {links.map((l) => {
          // "/membros" só fica ativo na própria raiz; os demais casam por prefixo.
          const ativo = l.href === '/membros' ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: '16px 0',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                color: ativo ? 'var(--osso)' : 'var(--texto-3)',
                borderBottom: `2px solid ${ativo ? 'var(--azul)' : 'transparent'}`,
              }}
            >
              {l.label}
            </Link>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
