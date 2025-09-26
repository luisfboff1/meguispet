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
  
  // Desabilitar recursos que não funcionam no Hostinger
  experimental: {
    appDir: false
  },
  
  // Configurações de ambiente
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'https://sistemameguis.com.br/api',
  },
  
  // Configurações de assets
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  
  // Headers para CORS (não funciona com export, mas mantemos para referência)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ]
      }
    ];
  }
}

module.exports = nextConfig
