import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { MainLayout } from '@/components/layout/main-layout'

// 🏗️ LAYOUT GLOBAL AUTOMÁTICO
// Este arquivo aplica o layout automaticamente em TODAS as páginas
// Não precisa configurar layout página por página!

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MainLayout>
      <Component {...pageProps} />
    </MainLayout>
  )
}
