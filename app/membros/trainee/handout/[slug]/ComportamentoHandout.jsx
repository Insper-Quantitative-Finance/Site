'use client';

import { useEffect } from 'react';

/**
 * Dá vida ao handout injetado na página: botão de copiar em cada bloco de
 * código e a alternância de tema do rodapé.
 *
 * O arquivo do handout traz esse script embutido, mas script que entra por
 * innerHTML não executa — então dentro do site o comportamento vem daqui. O
 * componente não renderiza nada; ele procura o `.handout` que o servidor já
 * escreveu no HTML e prende os eventos.
 */
export default function ComportamentoHandout() {
  useEffect(() => {
    const folha = document.querySelector('.handout');
    if (!folha) return;

    const limpar = [];

    try {
      if (localStorage.getItem('iqf-tema') === 'claro') folha.setAttribute('data-tema', 'claro');
    } catch {}

    const botaoTema = folha.querySelector('.alternar-tema');
    if (botaoTema) {
      const rotular = () => {
        botaoTema.textContent = folha.getAttribute('data-tema') === 'claro' ? 'tema escuro' : 'tema claro';
      };
      const alternar = () => {
        const claro = folha.getAttribute('data-tema') === 'claro';
        if (claro) folha.removeAttribute('data-tema');
        else folha.setAttribute('data-tema', 'claro');
        try {
          localStorage.setItem('iqf-tema', claro ? 'escuro' : 'claro');
        } catch {}
        rotular();
      };
      rotular();
      botaoTema.addEventListener('click', alternar);
      limpar.push(() => botaoTema.removeEventListener('click', alternar));
    }

    // O trainee vai rodar esses blocos no notebook, e código técnico
    // redigitado à mão erra em espaço e acento.
    folha.querySelectorAll('.bloco:not(.saida) .copiar').forEach((botao) => {
      const copiar = async () => {
        const codigo = botao.closest('.bloco').querySelector('pre').textContent;
        try {
          await navigator.clipboard.writeText(codigo);
          botao.textContent = 'copiado';
        } catch {
          botao.textContent = 'falhou';
        }
        setTimeout(() => {
          botao.textContent = 'copiar';
        }, 1600);
      };
      botao.addEventListener('click', copiar);
      limpar.push(() => botao.removeEventListener('click', copiar));
    });

    return () => limpar.forEach((f) => f());
  }, []);

  return null;
}
