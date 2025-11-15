import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { MainLayout } from '@/components/layout/main-layout'
import { ToastProvider } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'

// 🏗️ LAYOUT GLOBAL AUTOMÁTICO
// Este arquivo aplica o layout automaticamente em TODAS as páginas
// Não precisa configurar layout página por página!

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  
  return (
    <>
      <Head>
  <title>Megui&apos;sPet Gestão</title>
        <meta name="description" content="Sistema de gestão completo para pet shops" />
      </Head>
      <ToastProvider>
        <MainLayout>
          <Component {...pageProps} key={router.asPath} />
        </MainLayout>
        <Toaster />
      </ToastProvider>
    </>
  )
}
