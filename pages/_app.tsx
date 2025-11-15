import '@/styles/globals.css'
import 'nprogress/nprogress.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import NProgress from 'nprogress'
import { MainLayout } from '@/components/layout/main-layout'
import { ToastProvider } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'

// 🏗️ LAYOUT GLOBAL AUTOMÁTICO
// Este arquivo aplica o layout automaticamente em TODAS as páginas
// Não precisa configurar layout página por página!

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.1
})

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    const handleStart = () => NProgress.start()
    const handleComplete = () => NProgress.done()

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeComplete', handleComplete)
    router.events.on('routeChangeError', handleComplete)

    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleComplete)
      router.events.off('routeChangeError', handleComplete)
    }
  }, [router])

  return (
    <>
      <Head>
  <title>Megui&apos;sPet Gestão</title>
        <meta name="description" content="Sistema de gestão completo para pet shops" />
      </Head>
      <ToastProvider>
        <MainLayout key={router.pathname}>
          <Component {...pageProps} key={router.asPath} />
        </MainLayout>
        <Toaster />
      </ToastProvider>
    </>
  )
}
