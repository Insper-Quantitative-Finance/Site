'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '#sobre', label: 'A liga' },
  { href: '#o-que-e', label: 'Finanças quant' },
  { href: '#quant-connect', label: 'Quant Connect' },
  { href: '#eventos', label: 'Eventos' },
  { href: '#research', label: 'Projetos' },
  { href: '#ps', label: 'Processo seletivo' },
  { href: '#empresas', label: 'Empresas' },
  { href: '#contato', label: 'Contato' },
];

export default function Header() {
  const [compacto, setCompacto] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompacto(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="header-topo"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        padding: `${compacto ? 14 : 22}px var(--gutter)`,
        transition: 'padding .4s ease',
      }}
    >
      <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Image src="/assets/logo-mark.png" alt="Liga Insper Quantitative Finance" width={34} height={34} priority />
      </a>

      <nav className="nav-topo">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} style={{ whiteSpace: 'nowrap' }}>
            {l.label}
          </a>
        ))}
        {/* Aponta sempre para /membros: o middleware manda para o login quem
            não tem sessão. Checar a sessão aqui tornaria a landing dinâmica. */}
        <Link href="/membros" style={{ whiteSpace: 'nowrap', color: 'var(--azul)' }}>
          Área de membros
        </Link>
      </nav>

      <style jsx>{`
        .nav-topo {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
          column-gap: 18px;
          row-gap: 8px;
          min-width: 0;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        @media (max-width: 900px) {
          .nav-topo { column-gap: 14px; row-gap: 6px; font-size: 10px; }
        }
        @media (max-width: 560px) {
          .header-topo { flex-direction: column; align-items: flex-start; }
          .nav-topo {
            justify-content: flex-start;
            flex-wrap: nowrap;
            overflow-x: auto;
            width: 100%;
            scrollbar-width: none;
          }
          .nav-topo::-webkit-scrollbar { display: none; }
        }
      `}</style>
    </header>
  );
}
