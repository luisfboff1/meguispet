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
          console.log('⚠️ No session found or error:', error?.message)
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

            if (profileUserId && sessionUserId && profileUserId !== sessionUserId) {
              console.error('🚨 SECURITY ALERT: User mismatch in checkAuth!', {
                profileUserId,
                profileEmail: response.data.email,
                sessionUserId,
                sessionEmail: session.user.email
              })

              // Clear all storage to prevent contamination
              localStorage.clear()
              await supabase.auth.signOut()
              await handleLogout()
              return
            }

            // Verified - update credentials
            console.log('✅ Auth check passed for user:', response.data.email)
            setCredentials(response.data, session.access_token)
            setTokenCookie(session.access_token)
            setStatus('authenticated')
          } else {
            // Profile not found or invalid - logout
            console.log('❌ Profile not found or invalid')
            await handleLogout()
          }
        } catch (error: any) {
          console.error('❌ Error fetching profile:', error?.message)
          // Handle 401 errors (expired/invalid token)
          if (error?.response?.status === 401) {
            await handleLogout()
          } else {
            // Other errors - still logout for safety
            await handleLogout()
          }
        }
      } else {
        // Server-side - set unauthenticated
        clear()
        setStatus('unauthenticated')
      }
    } catch (error) {
      console.error('❌ Fatal error in checkAuth:', error)
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

  // Periodic security check - verify user hasn't changed every 5 minutes
  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated || !user) return

    const SECURITY_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

    const securityCheckInterval = setInterval(async () => {
      try {
        console.log('🔒 Running periodic security check...')
        const supabase = getSupabaseBrowser()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          console.log('⚠️ No session in security check - logging out')
          await handleLogout()
          return
        }

        // Verify the session user matches our stored user
        const sessionUserId = session.user.id
        const currentUserId = user.supabase_user_id?.toString()

        if (sessionUserId !== currentUserId) {
          console.error('🚨 SECURITY ALERT: User mismatch detected in periodic check!', {
            sessionUserId,
            sessionEmail: session.user.email,
            currentUserId,
            currentEmail: user.email
          })
          // Force immediate logout and clear all storage
          localStorage.clear()
          await supabase.auth.signOut()
          await handleLogout()
        } else {
          console.log('✅ Security check passed - user is still:', user.email)
        }
      } catch (error) {
        console.error('❌ Error in security check:', error)
      }
    }, SECURITY_CHECK_INTERVAL)

    return () => {
      clearInterval(securityCheckInterval)
    }
  }, [isAuthenticated, user, handleLogout])

  // Set up Supabase auth state listener for automatic token refresh
  useEffect(() => {
    if (typeof window === 'undefined') return

    const supabase = getSupabaseBrowser()

    // Listen for auth state changes (including token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event, 'User ID:', session?.user?.id, 'Current user:', user?.supabase_user_id)

      if (event === 'TOKEN_REFRESHED' && session) {
        // SECURITY: Verify the session belongs to the current user before updating
        if (user && session.user) {
          // Compare Supabase user IDs
          const sessionUserId = session.user.id
          const currentUserId = user.supabase_user_id?.toString()

          if (sessionUserId !== currentUserId) {
            console.error('🚨 SECURITY ALERT: Session user mismatch!', {
              sessionUserId,
              currentUserId,
              sessionEmail: session.user.email,
              currentEmail: user.email
            })
            // Force logout immediately - this is a serious security issue
            await handleLogout()
            return
          }

          // Session verified - safe to update token
          console.log('✅ Token refreshed for user:', user.email)
          setCredentials(user, session.access_token)
          setTokenCookie(session.access_token)
        } else if (!user && session) {
          // No user in state but we have a session - re-fetch profile
          console.log('⚠️ Token refreshed but no user in state - fetching profile')
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
        console.log('👋 User signed out')
        // User signed out - clear state
        clear()
        setStatus('unauthenticated')
        clearTokenCookie()
      } else if (event === 'SIGNED_IN' && session) {
        console.log('🔓 User signed in:', session.user.email)
        // User signed in - fetch profile
        try {
          const response = await authService.getProfile()
          if (response.success && response.data) {
            // SECURITY: Verify the profile matches the session
            const profileUserId = response.data.supabase_user_id?.toString()
            const sessionUserId = session.user.id

            if (profileUserId !== sessionUserId) {
              console.error('🚨 SECURITY ALERT: Profile user mismatch!', {
                profileUserId,
                sessionUserId
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
    logout: handleLogout,
    checkAuth
  }
}
