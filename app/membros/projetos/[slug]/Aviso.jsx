'use client';

import { useEffect, useState } from 'react';
import { ERRO_GENERICO } from '@/lib/erros';

/**
 * O aviso de erro das ações desta página.
 *
 * Substitui os `alert()` que estavam espalhados por Cabecalho, Reunioes,
 * Tarefas e Vitrine. O `alert()` tinha três problemas: é uma caixa do navegador
 * com a cara do sistema operacional no meio de uma página que tem estilo
 * próprio; trava a aba inteira até alguém clicar em OK; e, no Chrome, ganha um
 * "não deixe este site mandar mais mensagens" que faz o aviso seguinte
 * simplesmente não aparecer — erro engolido, usuário sem saber que a ação
 * falhou.
 *
 * Por que uma caixa só, avisada de fora, em vez de um `useState` por
 * componente: quem chamava `alert()` são lugares como o `onChange` de um
 * `<input type=datetime-local>` e o handler de soltar um cartão arrastado —
 * componentes pequenos, com vários `return` diferentes (um `<input>` cru, um
 * `<a>`, um `<span>`). Pendurar um aviso em cada um desses galhos significaria
 * repetir a renderização em todos os ramos. Com um assinante só, chamar
 * `avisarErro(...)` continua sendo uma linha, como era o alert.
 */

// A caixa é `position: fixed`, então uma por página basta — e duas empilhadas
// no mesmo canto seria pior do que a última mensagem ganhar.
const ouvintes = new Set();

/** Mostra o aviso. Chamável de qualquer handler, sem hook nem contexto. */
export function avisarErro(mensagem) {
  // O `||` é rede de segurança para a action que devolveu `{ ok: false }` sem
  // motivo; o texto normal já vem traduzido por lib/erros.js.
  const texto = mensagem || ERRO_GENERICO;
  ouvintes.forEach((avisar) => avisar(texto));
}

/**
 * Monte uma vez na página. Sem isto, `avisarErro()` não tem onde aparecer —
 * é o mesmo contrato do ComportamentoHandout.
 */
export default function AvisoDeErro({ segundos = 7 }) {
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    ouvintes.add(setMensagem);
    return () => ouvintes.delete(setMensagem);
  }, []);

  // Some sozinho: é um aviso, não uma decisão a tomar. O timer reinicia a cada
  // mensagem nova porque `mensagem` está nas dependências.
  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(() => setMensagem(null), segundos * 1000);
    return () => clearTimeout(t);
  }, [mensagem, segundos]);

  if (!mensagem) return null;

  return (
    // aria-live="assertive": quem usa leitor de tela precisa ouvir que a ação
    // falhou, que era a única coisa que o alert() fazia bem.
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 60,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        className="aviso aviso--erro"
        style={{
          pointerEvents: 'auto',
          maxWidth: 520,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          background: 'var(--carvao)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        <span style={{ flex: 1 }}>{mensagem}</span>
        <button
          type="button"
          onClick={() => setMensagem(null)}
          aria-label="Fechar aviso"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'inherit',
            opacity: 0.7,
            cursor: 'pointer',
            font: 'inherit',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
