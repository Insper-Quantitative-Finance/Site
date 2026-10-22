'use client';

import { useEffect } from 'react';
import { codigoCurto } from '@/lib/erros';

/**
 * Fronteira de erro global. Substitui o "Application error: a client-side
 * exception has occurred" por algo que diz o que aconteceu e o que fazer.
 *
 * O que esta página NÃO mostra é o ponto dela: antes havia um bloco vermelho
 * com `error.message` inteiro, e era por ali que saíam o endereço do Supabase,
 * nomes de env var e frases do Postgres sobre tabela e política de acesso —
 * tudo em inglês, para qualquer pessoa que abrisse a página num momento ruim.
 *
 * Em produção o Next já tranca a mensagem de erro de servidor e manda no lugar
 * um `digest`, que é o hash que liga a tela ao log. É só isso que aparece: um
 * código de 8 caracteres que a pessoa consegue copiar no WhatsApp, e que a
 * diretoria procura no log para achar o erro de verdade.
 */
export default function Erro({ error, reset }) {
  const codigo = codigoCurto(error?.digest);

  // O detalhe tem de sobrar em algum lugar. Erro de servidor já está no log da
  // hospedagem; este console cobre o que quebrou no navegador, onde não há log
  // nenhum além do da própria aba.
  useEffect(() => {
    console.error('[erro] fronteira global', error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 20px',
        background: 'var(--preto-puro)',
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Erro</div>
        <h1 style={{ fontSize: 34, lineHeight: 1.15, marginBottom: 16 }}>Algo quebrou por aqui.</h1>
        <p style={{ color: 'var(--texto-2)', lineHeight: 1.7, margin: '0 0 24px' }}>
          A página não conseguiu carregar. Tente de novo; se continuar, avise a diretoria
          {codigo ? ' com o código abaixo' : ''}.
        </p>

        {codigo && (
          <div style={{ margin: '0 0 28px' }}>
            <div className="eyebrow" style={{ marginBottom: 8, fontSize: 10 }}>Código do erro</div>
            <code
              style={{
                display: 'inline-block',
                background: 'var(--carvao)',
                border: '1px solid var(--linha-forte)',
                padding: '8px 14px',
                fontSize: 15,
                letterSpacing: '0.14em',
                color: 'var(--texto-2)',
              }}
            >
              {codigo}
            </code>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn--solido" onClick={reset}>Tentar de novo</button>
          <a className="btn btn--vazado" href="/">Voltar para a home</a>
        </div>
      </div>
    </main>
  );
}
