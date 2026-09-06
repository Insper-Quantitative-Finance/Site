/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // miniaturas do Instagram vêm do CDN da Meta (host varia por região)
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
    ],
  },
};

module.exports = nextConfig;
