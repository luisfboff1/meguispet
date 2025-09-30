/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Gera arquivos estáticos para Hostinger
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  // Configurações para servidor estático
  images: {
    unoptimized: true // Para funcionar em servidor estático
  },
  
  // Configurações de build
  distDir: 'out',
  generateEtags: false,
  
  // 🚀 BUILD CACHE - Configurações de performance
  experimental: {
    // Cache de build otimizado (configuração válida para Next.js 14)
    webpackBuildWorker: true,
    // Otimizações Tailwind v4
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Otimizações de compilação
  compiler: {
    // Remove console.log em produção
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Configurações de ambiente
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'https://sistemameguis.com.br/api',
  },
  
  // Configurações de assets
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  
  // Headers removidos para compatibilidade com export estático
}

module.exports = nextConfig
