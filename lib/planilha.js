/**
 * Leitura da planilha de convidados.
 *
 * Aceita o texto colado de uma planilha (Excel/Sheets copiam com TAB) ou um
 * CSV exportado — vírgula ou ponto e vírgula, com ou sem aspas, com ou sem
 * cabeçalho, nome e e-mail em qualquer ordem. Deliberadamente não pedimos
 * "coluna A = nome, coluna B = e-mail": ninguém lê essa instrução, e errar
 * a ordem produziria dezenas de contas chamadas "fulano@al.insper.edu.br".
 *
 * O e-mail é reconhecido pelo formato, então a ordem das colunas não importa.
 */

// Propositalmente frouxo: validação séria de e-mail é o envio chegar.
// O que precisamos barrar aqui é cabeçalho, linha vazia e nome solto.
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Quebra uma linha respeitando aspas ("Silva, João";fulano@x.com). */
function separarCampos(linha, delimitador) {
  const campos = [];
  let atual = '';
  let dentroDeAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      // "" dentro de aspas é uma aspa literal (convenção do CSV).
      if (dentroDeAspas && linha[i + 1] === '"') { atual += '"'; i++; }
      else dentroDeAspas = !dentroDeAspas;
    } else if (c === delimitador && !dentroDeAspas) {
      campos.push(atual);
      atual = '';
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

/** O delimitador é o candidato que mais aparece fora de aspas no texto. */
function detectarDelimitador(texto) {
  const candidatos = ['\t', ';', ',']; // TAB primeiro: é o que a colagem do Excel usa
  let melhor = ',';
  let maior = 0;
  for (const d of candidatos) {
    const n = texto.split(d).length - 1;
    if (n > maior) { maior = n; melhor = d; }
  }
  return melhor;
}

/**
 * Converte o texto em linhas { nome, email } ou { erro }.
 *
 * Nunca lança: uma planilha torta vira uma lista de problemas na tela, que é
 * o que permite corrigir antes de criar conta para ninguém.
 */
export function lerConvidados(texto) {
  const bruto = String(texto ?? '').replace(/\r\n?/g, '\n');
  const delimitador = detectarDelimitador(bruto);

  const linhas = [];
  const vistos = new Set();

  for (const linhaBruta of bruto.split('\n')) {
    if (!linhaBruta.trim()) continue;

    const campos = separarCampos(linhaBruta, delimitador).filter(Boolean);
    if (campos.length === 0) continue;

    const email = campos.find((c) => EMAIL.test(c))?.toLowerCase();

    if (!email) {
      // Cabeçalho ("Nome | E-mail") é descartado em silêncio; o resto vira erro
      // visível, porque uma linha de gente que não entrou é o problema caro.
      const pareceCabecalho = campos.some((c) => /^e-?mail$/i.test(c));
      if (!pareceCabecalho) {
        linhas.push({ original: linhaBruta.trim(), erro: 'Nenhum e-mail reconhecido nesta linha.' });
      }
      continue;
    }

    // Nome: o maior campo que não é o e-mail. Cobre "João Silva | joao@x |
    // 2026.1" sem precisar saber qual coluna é qual.
    const nome =
      campos
        .filter((c) => c.toLowerCase() !== email)
        .sort((a, b) => b.length - a.length)[0] ?? '';

    if (!nome) {
      linhas.push({ original: linhaBruta.trim(), email, erro: 'Falta o nome nesta linha.' });
      continue;
    }

    if (vistos.has(email)) {
      linhas.push({ original: linhaBruta.trim(), nome, email, erro: 'E-mail repetido na planilha.' });
      continue;
    }

    vistos.add(email);
    linhas.push({ nome, email });
  }

  return linhas;
}
