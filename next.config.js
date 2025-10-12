import path from 'path'
import { fileURLToPath } from 'url'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Limit rewrites to development so static export builds avoid unsupported warnings.
 * @param {string} phase
 * @returns {import('next').NextConfig}
 */
const nextConfig = (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER

  // 🌐 Saída estática para ambiente PHP/Hostinger
  const config = {
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
    experimental: {},

    outputFileTracingRoot: path.join(__dirname),

    compiler: {
      removeConsole: process.env.NODE_ENV === 'production',
    },

    // 🌍 Variáveis públicas
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    },
  }

  if (isDev) {
    config.rewrites = async () => {
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
    }
  }

  return config
}

export default nextConfig;
