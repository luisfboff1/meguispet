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
  
  // Configurações experimentais removidas para compatibilidade
  
  // Configurações de ambiente
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'https://sistemameguis.com.br/api',
  },
  
  // Configurações de assets
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  
  // Headers removidos para compatibilidade com export estático
}

module.exports = nextConfig
