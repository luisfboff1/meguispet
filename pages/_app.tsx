import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { MainLayout } from '@/components/layout/main-layout'

// 🏗️ LAYOUT GLOBAL AUTOMÁTICO
// Este arquivo aplica o layout automaticamente em TODAS as páginas
// Não precisa configurar layout página por página!

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Megui'sPet Gestão</title>
        <meta name="description" content="Sistema de gestão completo para pet shops" />
      </Head>
      <MainLayout>
        <Component {...pageProps} />
      </MainLayout>
    </>
  )
}
