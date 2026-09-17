/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Os handouts são lidos do disco em tempo de request. O Next só copia para
    // o bundle serverless o que enxerga nos imports — um readFile de caminho
    // montado não conta. Sem isto, a rota funciona em dev e dá 404 no deploy.
    outputFileTracingIncludes: {
      '/api/handouts/[slug]': ['./conteudo/handouts/**'],
      // As páginas não leem o HTML, mas checam quais arquivos existem para não
      // anunciar handout sem conteúdo — precisam ver a pasta também.
      '/membros/trainee': ['./conteudo/handouts/**'],
      '/membros/trainee/handout/[slug]': ['./conteudo/handouts/**'],
    },
  },
  images: {
    remotePatterns: [
      // miniaturas do Instagram vêm do CDN da Meta (host varia por região)
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
    ],
  },
};

module.exports = nextConfig;
