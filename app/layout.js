import './fontes.css';
import './globals.css';

const TITULO = 'Insper Quantitative Finance';
const DESCRICAO =
  'Liga de finanças quantitativas do Insper: projetos próprios, competições e conexão direta com o mercado sistemático.';

/**
 * De onde sai a URL absoluta das tags de OpenGraph.
 *
 * `og:image` e `og:url` têm de ser absolutas — o WhatsApp e o LinkedIn buscam a
 * imagem do servidor deles, e caminho relativo não resolve. `metadataBase` é o
 * que faz o Next completar sozinho tudo que escrevemos relativo.
 *
 * A ordem tenta o domínio fixo primeiro (defina NEXT_PUBLIC_SITE_URL quando o
 * domínio próprio entrar, senão cada preview anuncia o endereço de produção) e
 * cai no `VERCEL_URL`, que a Vercel injeta por deploy — inclusive nos previews
 * de pull request, onde é justamente o que se quer.
 */
function urlDoSite() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export const metadata = {
  metadataBase: new URL(urlDoSite()),

  // Sem `template` de propósito: cada página deste site já escreve o próprio
  // sufixo ("Projetos · IQF"), e um template "%s · IQF" aqui transformaria
  // todos eles em "Projetos · IQF · IQF".
  title: TITULO,
  description: DESCRICAO,
  icons: { icon: '/favicon.png' },
  applicationName: TITULO,

  // A área de membros não tem nada que deva entrar em buscador, e as páginas
  // dela ficam atrás de login de qualquer forma; o que vale indexar é a landing.
  robots: { index: true, follow: true },

  openGraph: {
    type: 'website',
    siteName: TITULO,
    title: TITULO,
    description: DESCRICAO,
    url: '/',
    locale: 'pt_BR',
    // A imagem vem de app/opengraph-image.js pela convenção do Next: ele
    // preenche url, width, height e type sozinho. Declarar `images` aqui
    // sobrescreveria isso.
  },

  twitter: {
    // `summary_large_image` é o que mostra o card grande; sem isto o X usa a
    // miniatura quadrada e corta o título da imagem.
    card: 'summary_large_image',
    title: TITULO,
    description: DESCRICAO,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
