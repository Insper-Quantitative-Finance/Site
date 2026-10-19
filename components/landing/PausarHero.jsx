'use client';

import { useEffect } from 'react';

/**
 * Desliga as animações do hero enquanto ele está fora da tela.
 *
 * O mesh gira com `infinite`, então sem isto ele continua custando quadros
 * depois que você rolou para a metade da página — e é exatamente aí que o
 * navegador precisa de fôlego para rolar liso. O Chrome até tenta estrangular
 * animações fora da viewport sozinho, mas não com camadas promovidas por
 * `will-change`, que é o caso aqui.
 *
 * A classe mora no <body> porque o CSS que ela controla está em globals.css,
 * junto do resto do hero; ver `.hero-fora-da-tela`.
 */
export default function PausarHero() {
  useEffect(() => {
    const hero = document.getElementById('top');
    if (!hero || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver(
      ([entrada]) => {
        document.body.classList.toggle('hero-fora-da-tela', !entrada.isIntersecting);
      },
      // Uma fatia de 10% já basta para considerar o hero "em cena": pausar
      // quando ainda há um pedaço visível faria a órbita travar à vista.
      { threshold: 0.1 },
    );

    io.observe(hero);
    return () => {
      io.disconnect();
      document.body.classList.remove('hero-fora-da-tela');
    };
  }, []);

  return null;
}
