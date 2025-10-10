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

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 🌍 Variáveis públicas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://sistemameguis.com.br/api',
  },
};

export default nextConfig;
