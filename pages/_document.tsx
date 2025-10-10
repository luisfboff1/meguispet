import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        {/* Meta tags globais */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Sistema de gestão MeguisPet - Controle vendas, estoque e clientes" />
  <meta name="author" content="MeguisPet" />
        
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
