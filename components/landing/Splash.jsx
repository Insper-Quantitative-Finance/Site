'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

// Tempo mínimo em tela: abaixo disso o splash vira um piscar branco-preto que
// incomoda mais do que a espera que ele deveria disfarçar.
const MINIMO_MS = 600;
// Teto de segurança: se um asset pesado nunca terminar de carregar, o site
// aparece mesmo assim em vez de ficar preso na tela preta.
const TETO_MS = 4000;
// Precisa bater com a duração da transição de .splash--saindo no globals.css.
const FADE_MS = 420;

/**
 * Tela preta de carregamento com o logo, no espírito da landing original.
 *
 * Renderiza visível já no HTML do servidor — se só aparecesse depois da
 * hidratação, o usuário veria a página crua antes do splash, que é justamente
 * o que ele existe para evitar. Quem estiver sem JS recebe a regra do
 * <noscript> em globals.css, que esconde o overlay e devolve o scroll.
 */
export default function Splash() {
  const [saindo, setSaindo] = useState(false);
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    const abertura = Date.now();
    let encerrado = false;
    let timerFade;
    let timerTeto;

    const encerrar = () => {
      if (encerrado) return;
      encerrado = true;
      const restante = Math.max(0, MINIMO_MS - (Date.now() - abertura));
      window.setTimeout(() => {
        setSaindo(true);
        timerFade = window.setTimeout(() => setOculto(true), FADE_MS);
      }, restante);
    };

    // 'load' (e não DOMContentLoaded) porque o que pesa aqui são as fontes e as
    // fotos do hero: sair antes delas devolveria a página ainda remontando.
    if (document.readyState === 'complete') encerrar();
    else window.addEventListener('load', encerrar);
    timerTeto = window.setTimeout(encerrar, TETO_MS);

    return () => {
      window.removeEventListener('load', encerrar);
      window.clearTimeout(timerFade);
      window.clearTimeout(timerTeto);
    };
  }, []);

  // O scroll fica travado enquanto o overlay cobre a tela: sem isso dá para
  // rolar por trás dele e chegar no meio da página quando ele sai.
  useEffect(() => {
    if (oculto) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [oculto]);

  if (oculto) return null;

  return (
    <div
      className={`splash${saindo ? ' splash--saindo' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Carregando"
    >
      <Image
        className="splash-logo"
        src="/assets/logo-iqf.png"
        alt="Liga Insper Quantitative Finance"
        width={264}
        height={123}
        priority
        style={{ width: 'min(56vw, 264px)', height: 'auto' }}
      />
    </div>
  );
}
