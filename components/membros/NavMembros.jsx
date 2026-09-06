'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS_BASE = [
  { href: '/membros', label: 'Início' },
  { href: '/membros/trainee', label: 'Trainee' },
  { href: '/membros/quadro', label: 'Quadro de membros' },
  { href: '/membros/materiais', label: 'Materiais' },
  { href: '/membros/conta', label: 'Minha conta' },
];

const LINKS_GESTAO = [
  { href: '/membros/gestao/usuarios', label: 'Usuários' },
  { href: '/membros/gestao/projetos', label: 'Projetos do site' },
];

export default function NavMembros({ gestao }) {
  const pathname = usePathname();
  const links = gestao ? [...LINKS_BASE, ...LINKS_GESTAO] : LINKS_BASE;

  return (
    <nav style={{ borderBottom: '1px solid var(--linha-card)', padding: '0 var(--gutter)' }}>
      <div className="container" style={{ display: 'flex', gap: 28, overflowX: 'auto', scrollbarWidth: 'none' }}>
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
    </nav>
  );
}
