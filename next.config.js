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

  // 🌐 Server-side rendering for Vercel deployment
  const config = {
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

    // 🚀 Otimizações de Bundle Splitting
    webpack: (config, { isServer }) => {
      if (!isServer) {
        // Split Recharts em chunk separado
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            ...config.optimization.splitChunks,
            cacheGroups: {
              ...config.optimization.splitChunks?.cacheGroups,
              recharts: {
                test: /[\\/]node_modules[\\/]recharts/,
                name: 'recharts',
                chunks: 'async',
                priority: 20,
              },
              tanstack: {
                test: /[\\/]node_modules[\\/]@tanstack/,
                name: 'tanstack',
                chunks: 'async',
                priority: 15,
              },
              supabase: {
                test: /[\\/]node_modules[\\/]@supabase/,
                name: 'supabase',
                chunks: 'async',
                priority: 10,
              },
            },
          },
        }
      }
      return config
    },

    // 🎯 Headers para performance
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'X-DNS-Prefetch-Control',
              value: 'on'
            },
            {
              key: 'X-Frame-Options',
              value: 'SAMEORIGIN'
            },
          ],
        },
        // ⚠️ REMOVED aggressive API caching - was causing stale data issues
        // APIs now use in-memory cache with invalidation instead of HTTP cache
      ]
    },
  }

  return config
}

export default nextConfig;
