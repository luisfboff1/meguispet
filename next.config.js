import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🌐 Saída estática para ambiente PHP/Hostinger
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,

  // 🖼️ Imagens e assets estáticos
  images: {
    unoptimized: true,
  },

  // ⚙️ Build e performance
  generateEtags: false,
  experimental: {
    webpackBuildWorker: true,
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  outputFileTracingRoot: path.join(__dirname),

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 🌍 Variáveis públicas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  },

  async rewrites() {
    const target = process.env.NEXT_PRIVATE_API_PROXY_TARGET?.replace(/\/$/, '')
    if (!target) {
      return []
    }

    return [
      {
        source: '/api/:path*',
        destination: `${target}/:path*`,
      },
    ]
  },
};

export default nextConfig;
