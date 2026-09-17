'use client';

import { useEffect } from 'react';

/**
 * Dá vida ao handout injetado na página: o botão de copiar de cada bloco de
 * código.
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
