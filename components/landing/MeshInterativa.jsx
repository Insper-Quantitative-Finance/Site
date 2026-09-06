'use client';

import { useEffect } from 'react';

/**
 * Faz o mesh do hero reagir ao cursor.
 *
 * Publica a posição do mouse em duas CSS vars (--mx e --my, de 0 a 1) no
 * <section id="top">. Quem desenha é o CSS: um brilho que segue o ponteiro e
 * um parallax de poucos pixels nas camadas de mesh.
 *
 * Só mexe em variáveis dentro de um rAF — recalcular os gradientes a cada
 * mousemove derrubaria o frame rate num fundo com blur de 52px.
 */
export default function MeshInterativa() {
  useEffect(() => {
    const secao = document.getElementById('top');
    if (!secao) return undefined;

    // Em telas de toque não há cursor para seguir, e o movimento por scroll
    // ficaria errático. Quem pediu menos movimento também fica de fora.
    const semHover = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (semHover || menosMovimento) return undefined;

    let agendado = false;
    let x = 0.5;
    let y = 0.5;

    const aplicar = () => {
      agendado = false;
      secao.style.setProperty('--mx', x.toFixed(4));
      secao.style.setProperty('--my', y.toFixed(4));
    };

    const aoMover = (e) => {
      const r = secao.getBoundingClientRect();
      x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(aplicar);
    };

    // Ao sair, volta ao centro em vez de congelar o brilho na borda.
    const aoSair = () => {
      x = 0.5;
      y = 0.5;
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(aplicar);
    };

    secao.classList.add('mesh-interativa');
    window.addEventListener('mousemove', aoMover, { passive: true });
    secao.addEventListener('mouseleave', aoSair);

    return () => {
      window.removeEventListener('mousemove', aoMover);
      secao.removeEventListener('mouseleave', aoSair);
      secao.classList.remove('mesh-interativa');
    };
  }, []);

  return null;
}
