import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { ToastProvider } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'

// 🏗️ LAYOUT GLOBAL AUTOMÁTICO
// Este arquivo aplica o layout automaticamente em TODAS as páginas
// Não precisa configurar layout página por página!

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [routeKey, setRouteKey] = useState(router.pathname)
  
  // Force update the key when route changes
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Extract pathname from full URL
      const pathname = url.split('?')[0]
      setRouteKey(pathname)
    }
    
    router.events.on('routeChangeComplete', handleRouteChange)
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router])
  
  return (
    <>
      <Head>
  <title>Megui&apos;sPet Gestão</title>
        <meta name="description" content="Sistema de gestão completo para pet shops" />
      </Head>
      <ToastProvider>
        <MainLayout>
          {/* Use routeKey to force remount when page changes */}
          <Component {...pageProps} key={routeKey} />
        </MainLayout>
        <Toaster />
      </ToastProvider>
    </>
  )
}
