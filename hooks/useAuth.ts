import { useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { authService } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { getSupabaseBrowser } from '@/lib/supabase'

const COOKIE_BASE = 'Path=/; SameSite=Lax'

const getCookieSuffix = () =>
  typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''

const setTokenCookie = (value: string) => {
  if (typeof document === 'undefined') return
  const maxAge = 60 * 60 * 24 * 7 // 7 dias
  document.cookie = `token=${value}; Max-Age=${maxAge}; ${COOKIE_BASE}${getCookieSuffix()}`
}

const clearTokenCookie = () => {
  if (typeof document === 'undefined') return
  document.cookie = `token=; Max-Age=0; ${COOKIE_BASE}${getCookieSuffix()}`
}

export function useAuth() {
  const router = useRouter()
  const { user, token, status, setCredentials, clear, setStatus } = useAuthStore()

  const loading = useMemo(() => status === 'idle' || status === 'loading', [status])
  const isAuthenticated = status === 'authenticated'

  const synchronizeLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return
    const storedToken = token ?? null

    // Legacy token storage for backwards compatibility
    if (storedToken) {
      localStorage.setItem('token', storedToken)
    } else {
      localStorage.removeItem('token')
    }

    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  }, [token, user])

  useEffect(() => {
    synchronizeLocalStorage()
  }, [token, user]) // Only sync when token or user actually changes

  const handleLogout = useCallback(async () => {
    try {
      // Sign out from Supabase first
      if (typeof window !== 'undefined') {
        const supabase = getSupabaseBrowser()
        await supabase.auth.signOut()
      }
      
      // Then call the API logout endpoint (for any server-side cleanup)
      await authService.logout()
    } catch (error) {
      console.error('Erro no logout:', error)
    } finally {
      clear()
      if (typeof window !== 'undefined') {
        // Clear all auth-related storage
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('meguispet-auth-store')
        
        // Clear Supabase session storage
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0]
          if (projectRef) {
            localStorage.removeItem(`sb-${projectRef}-auth-token`)
          }
        }
      }
      clearTokenCookie()
      router.push('/login')
    }
  }, [clear, router])

  const checkAuth = useCallback(async () => {
    try {
      setStatus('loading')
      
      // Check Supabase session and refresh if needed
      if (typeof window !== 'undefined') {
        const supabase = getSupabaseBrowser()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // If there's a session error or no session, clear auth state
        if (error || !session) {
          clear()
          setStatus('unauthenticated')
          clearTokenCookie()
          return
        }
        
        // Session exists - verify with backend and get user profile
        try {
          const response = await authService.getProfile()
          if (response.success && response.data) {
            // Update tokens in case they were refreshed
            setCredentials(response.data, session.access_token)
            setTokenCookie(session.access_token)
            setStatus('authenticated')
          } else {
            // Profile not found or invalid - logout
            await handleLogout()
          }
        } catch (error: any) {
          // Handle 401 errors (expired/invalid token)
          if (error?.response?.status === 401) {
            console.log('Token expirado, fazendo logout...')
            await handleLogout()
          } else {
            // Other errors - still logout for safety
            console.error('Erro ao verificar autenticação:', error)
            await handleLogout()
          }
        }
      } else {
        // Server-side - set unauthenticated
        clear()
        setStatus('unauthenticated')
      }
    } catch (error) {
      console.error('Erro crítico ao verificar autenticação:', error)
      await handleLogout()
    }
  }, [clear, handleLogout, setCredentials, setStatus])

  useEffect(() => {
    // Only check auth on initial mount if status is idle
    // Middleware already protects routes, so we don't need to check on every render
    if (status === 'idle') {
      checkAuth()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]) // Remove checkAuth from dependencies to prevent unnecessary checks

  // Set up Supabase auth state listener for automatic token refresh
  useEffect(() => {
    if (typeof window === 'undefined') return

    const supabase = getSupabaseBrowser()
    
    // Listen for auth state changes (including token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      
      if (event === 'TOKEN_REFRESHED' && session) {
        // Update token in state when it's refreshed
        console.log('Token refreshed automatically')
        if (user) {
          setCredentials(user, session.access_token)
          setTokenCookie(session.access_token)
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out - clear state
        clear()
        setStatus('unauthenticated')
        clearTokenCookie()
      } else if (event === 'SIGNED_IN' && session) {
        // User signed in - fetch profile
        try {
          const response = await authService.getProfile()
          if (response.success && response.data) {
            setCredentials(response.data, session.access_token)
            setTokenCookie(session.access_token)
            setStatus('authenticated')
          }
        } catch (error) {
          console.error('Error fetching profile after sign in:', error)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [user, setCredentials, setStatus, clear])

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        setStatus('loading')
        const response = await authService.login(email, password)
        if (response.success && response.data) {
          const { token: newToken, user: newUser } = response.data
          
          if (typeof window !== 'undefined') {
            // Store token for backwards compatibility
            localStorage.setItem('token', newToken)
            localStorage.setItem('user', JSON.stringify(newUser))
            
            // Store Supabase session structure
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            if (supabaseUrl) {
              const projectRef = supabaseUrl.split('//')[1]?.split('.')[0]
              if (projectRef) {
                const supabaseSession = {
                  access_token: newToken,
                  refresh_token: response.data.refresh_token,
                  expires_at: response.data.expires_at,
                  user: newUser
                }
                localStorage.setItem(
                  `sb-${projectRef}-auth-token`,
                  JSON.stringify(supabaseSession)
                )
              }
            }
          }
          
          setTokenCookie(newToken)
          setCredentials(newUser, newToken)
          setStatus('authenticated')
          return true
        }
        setStatus('unauthenticated')
        clearTokenCookie()
        return false
      } catch (error) {
        console.error('Erro no login:', error)
        setStatus('unauthenticated')
        clearTokenCookie()
        return false
      }
    },
    [setCredentials, setStatus]
  )

  return {
    user,
    token,
    loading,
    isAuthenticated,
    status,
    login,
    logout: handleLogout,
    checkAuth
  }
}
