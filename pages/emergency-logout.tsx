import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabaseBrowser } from '@/lib/supabase'

export default function EmergencyLogoutPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'cleaning' | 'done'>('cleaning')

  useEffect(() => {
    const emergencyCleanup = async () => {
      try {
        setStatus('cleaning')

        if (typeof window !== 'undefined') {
          console.log('🚨 EMERGENCY LOGOUT: Starting aggressive cleanup...')

          // 1. Clear ALL localStorage
          console.log('🧹 Clearing ALL localStorage')
          localStorage.clear()

          // 2. Clear ALL sessionStorage
          console.log('🧹 Clearing ALL sessionStorage')
          sessionStorage.clear()

          // 3. Clear ALL cookies
          console.log('🍪 Clearing ALL cookies')
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const eqPos = cookie.indexOf('=')
            const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
            // Delete with all possible path/domain combinations
            document.cookie = `${name}=; Max-Age=0; Path=/`
            document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${window.location.hostname}`
            document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${window.location.hostname}`
          }

          // 4. Sign out from Supabase
          console.log('🔐 Signing out from Supabase')
          try {
            const supabase = getSupabaseBrowser()
            await supabase.auth.signOut()
          } catch (err) {
            console.error('⚠️ Supabase signOut failed (continuing anyway)', err)
          }

          console.log('✅ EMERGENCY LOGOUT: Cleanup complete')
          setStatus('done')

          // Wait 1 second before redirect
          setTimeout(() => {
            console.log('🔄 Redirecting to login...')
            // Use window.location.href to force full page reload and clear React state
            // This prevents race conditions with MainLayout's circuit breaker
            window.location.href = '/login?from=emergency'
          }, 1000)
        }
      } catch (error) {
        console.error('❌ EMERGENCY LOGOUT: Error during cleanup', error)
        setStatus('done')
        // Force redirect anyway using full page reload
        setTimeout(() => {
          window.location.href = '/login?from=emergency'
        }, 1000)
      }
    }

    emergencyCleanup()
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="text-center">
        <div className="mb-8">
          {status === 'cleaning' ? (
            <>
              <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500"></div>
              <h1 className="mt-6 text-2xl font-bold text-slate-900">Limpando dados...</h1>
              <p className="mt-2 text-slate-600">Removendo todas as sessões e cookies</p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="mt-6 text-2xl font-bold text-slate-900">Limpeza concluída!</h1>
              <p className="mt-2 text-slate-600">Redirecionando para o login...</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
