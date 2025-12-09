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
    // 🔄 Generate unique build ID for cache busting
    // This ensures clients always get the latest version without hard refresh
    generateBuildId: async () => {
      // Use timestamp to force new chunks on each deployment
      return `build-${Date.now()}`
    },
    experimental: {
      // Disable SWC on Windows to avoid DLL initialization errors
      forceSwcTransforms: false,
    },

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

    // 🎯 Headers de segurança (VULN-006)
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            // DNS Prefetch Control
            {
              key: 'X-DNS-Prefetch-Control',
              value: 'on'
            },
            // Clickjacking Protection
            {
              key: 'X-Frame-Options',
              value: 'DENY' // Mais seguro que SAMEORIGIN
            },
            // MIME Type Sniffing Protection
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff'
            },
            // XSS Protection (legacy, mas ainda útil)
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block'
            },
            // Referrer Policy
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin'
            },
            // Permissions Policy (desabilita features desnecessárias)
            {
              key: 'Permissions-Policy',
              value: 'geolocation=(), microphone=(), camera=(), payment=()'
            },
            // HSTS (Strict Transport Security)
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains'
            },
            // Content Security Policy
            {
              key: 'Content-Security-Policy',
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live", // unsafe-eval necessário para Next.js, vercel.live para Vercel Toolbar
                "style-src 'self' 'unsafe-inline' https://vercel.live",
                "img-src 'self' data: https: blob:",
                "font-src 'self' data: https://vercel.live",
                "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://brasilapi.com.br https://viacep.com.br https://nominatim.openstreetmap.org https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org https://vercel.live wss://ws-us3.pusher.com",
                "frame-src https://vercel.live",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
              ].join('; ')
            }
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
