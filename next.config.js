/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Gera arquivos estáticos para Hostinger
  trailingSlash: true,
  images: {
    unoptimized: true // Para funcionar em servidor estático
  },
  // Configurações específicas para SSG no Hostinger
  experimental: {
    appDir: false
  }
}

module.exports = nextConfig
