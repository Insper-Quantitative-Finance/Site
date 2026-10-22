import { ImageResponse } from 'next/og';

/**
 * A imagem que aparece quando alguém cola o link do site no WhatsApp, no
 * LinkedIn ou no Slack.
 *
 * Desenhada em código, e não um PNG em /public, por dois motivos: fica na
 * paleta do site sem ninguém ter de exportar um arquivo a cada mudança, e o
 * Next a gera e cacheia no build — então não há binário de 200 KB no
 * repositório para manter em sincronia com o resto.
 *
 * O arquivo se chama `opengraph-image` numa pasta de rota: o Next acha pela
 * convenção, gera `<meta property="og:image">` com a URL e as dimensões certas,
 * e usa a mesma imagem no card do Twitter/X. Por estar na raiz de `app/`, vale
 * para todas as páginas que não tiverem a sua própria.
 *
 * 1200×630 é a proporção que o Facebook, o LinkedIn e o X recortam sem cortar
 * nada; o WhatsApp usa o centro.
 */
/**
 * Não tire este `edge`.
 *
 * No runtime Node, o `next build` quebra o pré-render desta rota com
 * "TypeError: Invalid URL" vindo de dentro do @vercel/og — ele monta o caminho
 * da fonte padrão com fileURLToPath, e isso não resolve em caminho do Windows.
 * O build do og para edge não passa por ali e funciona nos dois sistemas.
 *
 * O custo é a imagem ser gerada por requisição em vez de no build. Na prática
 * não é custo nenhum: quem pede esta URL são os robôs do WhatsApp e do
 * LinkedIn, uma vez por link, e a resposta fica no CDN.
 */
export const runtime = 'edge';

export const alt = 'Insper Quantitative Finance — liga de finanças quantitativas do Insper';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#050506',
          color: '#F2F2F0',
          padding: '72px 80px',
          // A fonte do site é auto-hospedada e o renderizador do og:image não
          // alcança /public/fonts; a padrão do next/og resolve e o peso visual
          // do card vem do tamanho e do espaçamento, não da família.
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontSize: 26,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: 'rgba(242, 242, 240, 0.62)',
          }}
        >
          IQF
          <div style={{ width: 56, height: 1, background: 'rgba(242, 242, 240, 0.3)' }} />
          Insper
        </div>

        {/* Cada linha é um <div> próprio, em vez de um <br/> no meio do texto.
            O Satori (o renderizador do next/og) não é um navegador: ele exige
            `display` explícito em qualquer div com mais de um filho, e texto +
            <br/> + texto já conta como três. Sem isso a rota responde 500 com
            "Expected <div> to have explicit display: flex". */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 78, lineHeight: 1.05, letterSpacing: -1 }}>
            <div>Insper Quantitative</div>
            <div>Finance</div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 30,
              lineHeight: 1.45,
              color: 'rgba(242, 242, 240, 0.74)',
            }}
          >
            <div>Projetos próprios, competições e conexão direta</div>
            <div>com o mercado sistemático.</div>
          </div>
        </div>

        {/* A linha azul é o mesmo acento que separa as seções da landing. */}
        <div style={{ display: 'flex', width: 180, height: 3, background: '#A9C2D1' }} />
      </div>
    ),
    size,
  );
}
