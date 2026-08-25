import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bilgim/ui', '@bilgim/i18n'],
};

export default nextConfig;
