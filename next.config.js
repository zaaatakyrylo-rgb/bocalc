const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'bocalc.pages.dev'],
    },
  },
  webpack: (config, { isServer }) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    
    // Отключаем filesystem cache для Cloudflare Pages
    if (process.env.CF_PAGES) {
      config.cache = false;
    }
    
    return config;
  },
};

module.exports = withNextIntl(nextConfig);


