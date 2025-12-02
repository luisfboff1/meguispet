import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  // Note: Build ID will be injected via the version API endpoint
  // Meta tag is optional - the version checker will fetch from /api/version if needed
  return (
    <Html lang="pt-BR">
      <Head>
        {/* Meta tags globais */}
        <meta charSet="utf-8" />
  <meta name="description" content="Sistema de gestão MeguisPet - Controle vendas, estoque e clientes" />
  <meta name="author" content="MeguisPet" />
        
        {/* Cache control for HTML - prevent caching of HTML pages */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        
        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        
        {/* Preconnect para performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* SEO */}
  <meta property="og:title" content="MeguisPet - Sistema de Gestão" />
        <meta property="og:description" content="Sistema completo para gestão de pet shop" />
        <meta property="og:type" content="website" />
        
        {/* PWA Meta tags */}
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MeguisPet" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
