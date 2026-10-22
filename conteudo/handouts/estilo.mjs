/**
 * Estilo dos handouts - a fonte unica, usada pelos dois caminhos.
 *
 * Isto era `_estilo.css`, lido so pelo _montar.mjs e embutido no HTML que vai
 * para o bucket. O problema disso: a pagina do site injetava o <style> que
 * vinha DENTRO do arquivo baixado, entao o CSS servido era o do dia em que o
 * handout foi subido. Corrigir o estilo no repositorio nao mudava nada no ar -
 * era preciso remontar e subir cada handout de novo, e enquanto isso nao
 * acontecia o handout continuava vazando da tela no celular, com a ficha em
 * quatro colunas fixas, mesmo com o conserto ja comitado.
 *
 * Virando um modulo JS, o estilo passa a ser importado:
 *   - pela pagina (app/membros/trainee/handout/[slug]/page.js), que ignora o
 *     <style> do arquivo baixado e usa este;
 *   - pelo _montar.mjs, para o HTML avulso continuar abrindo sozinho.
 *
 * Conserto de CSS entra no ar com um deploy, sem mexer no bucket.
 *
 * E `.mjs` com o CSS numa template string, e nao um `.css` importado: no Next,
 * `import './x.css'` vira folha de estilo global, e este CSS precisa chegar
 * como TEXTO, para ser injetado apenas na pagina do handout. Por `import` e nao
 * por `fs.readFile` porque a pasta `conteudo/` nao e rastreada no bundle de
 * producao - o arquivo nao estaria la para ser lido.
 */
export const ESTILO_HANDOUT = `
/* Estilo dos handouts.
   Todo seletor vive sob \`.handout\` — nada de regra solta em body, h1 ou p.
   O motivo: este CSS é injetado na página da área de membros, junto do CSS do
   site. Sem escopo, \`h2 { ... }\` daqui reformataria o cabeçalho, o menu e as
   entregas. As variáveis também ficam no \`.handout\`, não no \`:root\`, para não
   sobrescrever as do site.
   O mesmo arquivo serve ao HTML autocontido que vai para o bucket. */
.handout {
  --preto: #0B0B0C;
  --carvao: #131316;
  --osso: #EDE9E3;
  --texto-2: #B8B4AE;
  --texto-3: #8A867F;
  --azul: #7BA7C7;
  --rosa: #E8B4B8;
  --linha: #232329;
  --linha-forte: #32323A;
  --serif-h: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --mono-h: "SF Mono", "JetBrains Mono", "Cascadia Code", Consolas, monospace;

  color: var(--osso);
  font-size: 16px;
  line-height: 1.75;
}

.handout * { box-sizing: border-box; }

/* As tres linhas abaixo sao a trava de largura da pagina.
   O handout e injetado como filho de um container \`display: grid\` na area de
   membros, e item de grid tem \`min-width: auto\`: a coluna cresce ate caber o
   min-content do conteudo. Ou seja, UM elemento interno que se recuse a
   quebrar (um \`code\` com nowrap, uma tabela larga) empurrava a pagina inteira
   para 742px num celular de 375px. \`min-width: 0\` corta essa propagacao na
   raiz; o resto do arquivo cuida de cada caso que nao quebra sozinho. */
.handout { max-width: 100%; min-width: 0; overflow-wrap: break-word; }

.handout .folha { max-width: 760px; min-width: 0; margin: 0 auto; }

/* ---- cabeçalho ---- */
.handout .marca { display: flex; align-items: baseline; gap: 12px; margin-bottom: 48px; }
.handout .marca strong { font-size: 15px; letter-spacing: 0.22em; font-weight: 600; }
.handout .marca span { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--texto-3); }

.handout .etiqueta {
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--azul); margin-bottom: 18px;
}

.handout h1 {
  font-family: var(--serif-h); font-weight: 400;
  font-size: clamp(32px, 6vw, 46px); line-height: 1.1;
  margin: 0 0 18px; color: var(--osso);
  overflow-wrap: break-word;
}

.handout .abertura { font-size: 18px; line-height: 1.7; color: var(--texto-2); margin: 0 0 40px; max-width: 58ch; }

/* ---- ficha técnica ---- */
/* Colunas declaradas por faixa, nao por auto-fit.
   O auto-fit com \`minmax(min(150px, 100%), 1fr)\` esta correto no papel e e o
   que este arquivo usava, mas dependia de o container ter largura resolvida
   para o \`100%\` significar algo — e era justamente isso que faltava quando o
   grid de fora media min-content (ver \`.handout\` acima). O resultado era a
   ficha abrindo em quatro colunas de 179px dentro de uma tela de 375px.
   Tres faixas fixas nao tem como errar: 4 colunas no desktop, 2 no meio, 1 no
   celular. \`minmax(0, 1fr)\` em vez de \`1fr\` porque \`1fr\` tem piso automatico
   de min-content, que e o mesmo furo por outro caminho. */
.handout .ficha {
  display: grid; gap: 1px; background: var(--linha);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--linha); margin: 0 0 64px;
}
@media (max-width: 700px) {
  .handout .ficha { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 420px) {
  .handout .ficha { grid-template-columns: minmax(0, 1fr); }
}
.handout .ficha > div { background: var(--carvao); padding: 16px 18px; min-width: 0; }
.handout .ficha dt { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--texto-3); margin-bottom: 6px; }
/* Nome de arquivo (\`precos_limpo.parquet\`) não tem espaço para quebrar: sem
   isto a célula cresce até o nome caber e arrasta a ficha inteira. */
.handout .ficha dd { margin: 0; font-size: 15px; font-family: var(--mono-h); overflow-wrap: anywhere; }

/* ---- texto ---- */
.handout h2 {
  font-family: var(--serif-h); font-weight: 400; font-size: 27px; line-height: 1.25;
  margin: 72px 0 20px; padding-bottom: 14px; border-bottom: 1px solid var(--linha-forte);
  color: var(--osso);
}
.handout h3 { font-size: 17px; font-weight: 600; margin: 44px 0 14px; color: var(--osso); }
.handout p { margin: 0 0 18px; }
.handout a { color: var(--azul); }
.handout strong { font-weight: 600; }
.handout em { font-style: italic; }
.handout ul, .handout ol { margin: 0 0 20px; padding-left: 22px; }
.handout li { margin-bottom: 10px; }
.handout li::marker { color: var(--texto-3); }
/* \`white-space: nowrap\` saiu daqui.
   Ele existia para \`pd.to_numeric\` nao quebrar feio no meio no desktop, e era
   relaxado so abaixo de 560px. Mas nowrap faz o min-content do paragrafo ser a
   largura do trecho inteiro, e um \`dropna(axis=1, how="all")\` no meio de uma
   frase virava um piso de ~400px que o grid de fora obedecia: era a causa dos
   780px de largura numa janela de 622px, que nenhum @media de celular pegava.
   \`anywhere\` quebra so quando falta espaco, entao no desktop o resultado e o
   mesmo de antes. */
.handout code {
  font-family: var(--mono-h); font-size: 0.9em;
  background: var(--carvao); border: 1px solid var(--linha);
  border-radius: 3px; padding: 1px 5px;
  overflow-wrap: anywhere;
}

/* ---- blocos de código ---- */
/* \`min-width: 0\`: o <pre> ja tem overflow-x, mas sem isto o proprio .bloco
   herda o piso de min-content do grid e a barra de rolagem nunca aparece —
   quem rola e a pagina. */
.handout .bloco {
  margin: 0 0 24px; border: 1px solid var(--linha-forte); background: var(--carvao);
  min-width: 0;
}
.handout .bloco > header {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 9px 14px; border-bottom: 1px solid var(--linha);
  font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--texto-3);
}
.handout .bloco.saida > header { color: var(--azul); }
.handout .bloco.errado { border-color: var(--rosa); }
.handout .bloco.errado > header { color: var(--rosa); }
.handout .bloco pre {
  margin: 0; padding: 18px 16px; overflow-x: auto;
  font-family: var(--mono-h); font-size: 13.5px; line-height: 1.65;
  color: var(--osso);
}
.handout .bloco.saida pre { color: var(--texto-2); }
.handout .copiar {
  font: inherit; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  background: none; border: 1px solid var(--linha-forte); color: var(--texto-3);
  padding: 4px 10px; cursor: pointer; border-radius: 2px; white-space: nowrap;
}
.handout .copiar:hover { color: var(--osso); border-color: var(--texto-3); }

/* ---- tabelas ---- */
.handout .rolagem { overflow-x: auto; min-width: 0; margin: 0 0 24px; }
/* \`width: 100%\` sozinho nao impede a tabela de passar da caixa quando uma
   celula tem texto longo sem espaco; o auto no layout resolve pelo conteudo. */
.handout table { border-collapse: collapse; width: 100%; font-size: 14.5px; }
.handout td { overflow-wrap: anywhere; }
.handout th, .handout td { text-align: left; padding: 11px 14px; border-bottom: 1px solid var(--linha); vertical-align: top; }
.handout th { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--texto-3); font-weight: 400; }
.handout tbody tr:last-child td { border-bottom: none; }

/* ---- caixas ---- */
.handout .caixa { border: 1px solid var(--linha-forte); background: var(--carvao); padding: 22px 24px; margin: 0 0 24px; }
.handout .caixa > .titulo { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 12px; }
.handout .caixa p:last-child, .handout .caixa ul:last-child, .handout .caixa .bloco:last-child { margin-bottom: 0; }
.handout .guarde { border-left: 2px solid var(--azul); }
.handout .guarde > .titulo { color: var(--azul); }
.handout .checkpoint { border-left: 2px solid var(--rosa); }
.handout .checkpoint > .titulo { color: var(--rosa); }

.handout details { margin-top: 18px; border-top: 1px solid var(--linha); padding-top: 14px; }
.handout summary {
  cursor: pointer; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--texto-3); list-style: none;
}
.handout summary::-webkit-details-marker { display: none; }
.handout summary::before { content: "▸ "; }
.handout details[open] summary::before { content: "▾ "; }
.handout summary:hover { color: var(--osso); }
.handout details > *:not(summary) { margin-top: 16px; }

/* ---- rodapé ---- */
.handout footer {
  margin-top: 88px; padding-top: 24px; border-top: 1px solid var(--linha);
  font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--texto-3);
}

@media (max-width: 560px) {
  .handout .bloco pre { font-size: 12.5px; }
}
`;
