'use client';

import { useEffect } from 'react';

/**
 * Marca os blocos de cada seção com [data-reveal] e liga um IntersectionObserver.
 * Mesmo comportamento da landing original, incluindo o fallback por scroll para
 * o caso do observer não disparar (Safari com bfcache, por exemplo).
 */
export default function Revelar() {
  useEffect(() => {
    const alvos = Array.from(document.querySelectorAll('section:not(#top) > div'));
    alvos.forEach((el, i) => {
      el.setAttribute('data-reveal', '');
      el.style.transitionDelay = `${(i % 3) * 90}ms`;
    });

    // Fica só com quem ainda falta revelar. Cada getBoundingClientRect() força
    // o navegador a recalcular layout, então varrer a página inteira a cada
    // rolagem é justamente o tipo de conta que faz o scroll engasgar.
    let pendentes = alvos;

    const revelarVisiveis = () => {
      const vh = window.innerHeight || 0;
      pendentes = pendentes.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          el.classList.add('is-in');
          return false;
        }
        return true;
      });
      // Revelado tudo, o fallback não tem mais o que fazer: sai do caminho em
      // vez de rodar um rAF a cada rolagem pelo resto da visita.
      if (pendentes.length === 0) desligarFallback();
    };

    let agendado = false;
    const onScroll = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        revelarVisiveis();
      });
    };

    const desligarFallback = () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    requestAnimationFrame(revelarVisiveis);

    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('is-in');
              io.unobserve(e.target);
            }
          });
        },
        { rootMargin: '0px 0px -8% 0px' },
      );
      alvos.forEach((el) => io.observe(el));
    }

    return () => {
      desligarFallback();
      io?.disconnect();
    };
  }, []);

  return null;
}
