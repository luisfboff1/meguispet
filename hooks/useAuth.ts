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
    console.log('🚪 useAuth: Starting logout process...')

    // 1. AGGRESSIVE CLEANUP - Do this FIRST before any async operations
    clear()

    if (typeof window !== 'undefined') {
      try {
        // Clear ALL localStorage items (nuclear option to prevent contamination)
        console.log('🧹 useAuth: Clearing ALL localStorage')
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))

        // Clear ALL cookies (especially Supabase cookies)
        console.log('🍪 useAuth: Clearing ALL cookies (including login_time)')
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const eqPos = cookie.indexOf('=')
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
          // Delete with all possible path/domain combinations
          document.cookie = `${name}=; Max-Age=0; Path=/`
          document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${window.location.hostname}`
          document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${window.location.hostname}`
        }

        // Explicitly delete login_time cookie
        document.cookie = 'login_time=; Max-Age=0; Path=/'
      } catch (cleanupError) {
        console.error('❌ useAuth: Error during cleanup (continuing anyway)', cleanupError)
      }
    }

    // 2. ASYNC CLEANUP - Try to sign out from Supabase and API (don't wait for completion)
    // We do this AFTER local cleanup so that even if it fails, user is logged out locally
    if (typeof window !== 'undefined') {
      Promise.all([
        getSupabaseBrowser().auth.signOut().catch(err => {
          console.error('⚠️ useAuth: Supabase signOut failed (continuing anyway)', err)
        }),
        authService.logout().catch(err => {
          console.error('⚠️ useAuth: API logout failed (continuing anyway)', err)
        })
      ]).finally(() => {
        console.log('✅ useAuth: Async cleanup completed')
      })
    }

    // 3. FORCE HARD REDIRECT - Use window.location.href to ensure browser clears everything
    console.log('🔄 useAuth: Forcing hard redirect to /login')
    if (typeof window !== 'undefined') {
      // Use hard redirect to force browser to clear state
      window.location.href = '/login'
    } else {
      // Fallback for SSR (shouldn't happen but just in case)
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
          console.log('🔒 useAuth: No valid session found', { error: error?.message })
          clear()
          setStatus('unauthenticated')
          clearTokenCookie()
          return
        }

        // Session exists - verify with backend and get user profile
        try {
          const response = await authService.getProfile()
          if (response.success && response.data) {
            // SECURITY: Verify the profile matches the session
            const profileUserId = response.data.supabase_user_id?.toString()
            const sessionUserId = session.user.id
            const profileEmail = response.data.email?.toLowerCase()
            const sessionEmail = session.user.email?.toLowerCase()

            // Verify user ID match (primary check)
            if (profileUserId && sessionUserId && profileUserId !== sessionUserId) {
              console.error('🚨 SECURITY ALERT: User mismatch in checkAuth!', {
                profileUserId,
                profileEmail,
                sessionUserId,
                sessionEmail
              })

              // Clear all storage to prevent contamination
              localStorage.clear()
              await supabase.auth.signOut()
              await handleLogout()
              return
            }

            // Verify email match (secondary check - catches edge cases where supabase_user_id might be missing)
            if (profileEmail && sessionEmail && profileEmail !== sessionEmail) {
              console.error('🚨 SECURITY ALERT: Email mismatch in checkAuth!', {
                profileEmail,
                sessionEmail
              })

              // Clear all storage to prevent contamination
              localStorage.clear()
              await supabase.auth.signOut()
              await handleLogout()
              return
            }

            // Verified - update credentials
            console.log('✅ useAuth: Session verified, user authenticated')
            setCredentials(response.data, session.access_token)
            setTokenCookie(session.access_token)
            setStatus('authenticated')
          } else {
            // Profile not found or invalid - logout
            console.log('⚠️ useAuth: Profile not found or invalid')
            clear()
            setStatus('unauthenticated')
            clearTokenCookie()
          }
        } catch (error: any) {
          console.log('❌ useAuth: Error fetching profile', { status: error?.response?.status })
          // Handle 401 errors (expired/invalid token)
          if (error?.response?.status === 401) {
            clear()
            setStatus('unauthenticated')
            clearTokenCookie()
          } else {
            // Other errors - still clear auth for safety
            clear()
            setStatus('unauthenticated')
            clearTokenCookie()
          }
        }
      } else {
        // Server-side - set unauthenticated
        clear()
        setStatus('unauthenticated')
      }
    } catch (error) {
      console.error('❌ useAuth: Unexpected error in checkAuth', error)
      // Always ensure we end in a valid state
      clear()
      setStatus('unauthenticated')
      clearTokenCookie()
    }
  }, [clear, handleLogout, setCredentials, setStatus])

  // checkAuth() removed to prevent rate limiting
  // Middleware already protects all routes and verifies auth on every page request
  // Client-side auth state is populated via login() and onAuthStateChange listener below
  useEffect(() => {
    // If status is idle and we have a user in store, mark as authenticated
    // This happens on page refresh when Zustand rehydrates from localStorage
    if (status === 'idle' && user && token) {
      setStatus('authenticated')
    } else if (status === 'idle' && !user) {
      setStatus('unauthenticated')
    }
  }, [status, user, token, setStatus])

  // Periodic security check removed to prevent rate limiting
  // The middleware already protects routes on every request
  // onAuthStateChange below handles TOKEN_REFRESHED events

  // Set up Supabase auth state listener for automatic token refresh
  useEffect(() => {
    if (typeof window === 'undefined') return

    const supabase = getSupabaseBrowser()

    // Listen for auth state changes (including token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        // SECURITY: Verify the session belongs to the current user before updating
        if (user && session.user) {
          // Compare Supabase user IDs and emails
          const sessionUserId = session.user.id
          const currentUserId = user.supabase_user_id?.toString()
          const sessionEmail = session.user.email?.toLowerCase()
          const currentEmail = user.email?.toLowerCase()

          // Check user ID mismatch (if we have both IDs)
          if (currentUserId && sessionUserId !== currentUserId) {
            console.error('🚨 SECURITY ALERT: Session user ID mismatch!', {
              sessionUserId,
              currentUserId,
              sessionEmail,
              currentEmail
            })
            // Force logout immediately - this is a serious security issue
            await handleLogout()
            return
          }

          // Check email mismatch (fallback if supabase_user_id is missing)
          if (sessionEmail && currentEmail && sessionEmail !== currentEmail) {
            console.error('🚨 SECURITY ALERT: Session email mismatch!', {
              sessionEmail,
              currentEmail
            })
            // Force logout immediately - this is a serious security issue
            await handleLogout()
            return
          }

          // Session verified - safe to update token
          setCredentials(user, session.access_token)
          setTokenCookie(session.access_token)
        } else if (!user && session) {
          // No user in state but we have a session - re-fetch profile
          try {
            const response = await authService.getProfile()
            if (response.success && response.data) {
              setCredentials(response.data, session.access_token)
              setTokenCookie(session.access_token)
              setStatus('authenticated')
            } else {
              await handleLogout()
            }
          } catch (error) {
            await handleLogout()
          }
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
            // SECURITY: Verify the profile matches the session
            const profileUserId = response.data.supabase_user_id?.toString()
            const sessionUserId = session.user.id
            const profileEmail = response.data.email?.toLowerCase()
            const sessionEmail = session.user.email?.toLowerCase()

            // Check user ID mismatch (if we have both IDs)
            if (profileUserId && profileUserId !== sessionUserId) {
              console.error('🚨 SECURITY ALERT: Profile user ID mismatch!', {
                profileUserId,
                sessionUserId,
                profileEmail,
                sessionEmail
              })
              await handleLogout()
              return
            }

            // Check email mismatch (fallback if supabase_user_id is missing)
            if (profileEmail && sessionEmail && profileEmail !== sessionEmail) {
              console.error('🚨 SECURITY ALERT: Profile email mismatch!', {
                profileEmail,
                sessionEmail
              })
              await handleLogout()
              return
            }

            setCredentials(response.data, session.access_token)
            setTokenCookie(session.access_token)
            setStatus('authenticated')
          } else {
            await handleLogout()
          }
        } catch (error) {
          await handleLogout()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [user, setCredentials, setStatus, clear, handleLogout])

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
    logout: handleLogout
  }
}
