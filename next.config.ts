import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.fal.ai' },
      { protocol: 'https', hostname: 'fal.media' },
      { protocol: 'https', hostname: '**.cloudflare.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  serverExternalPackages: ['mongoose', 'pdf-parse', 'sharp'],
}

export default nextConfig
