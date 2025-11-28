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
        const supabase = getSupabaseBrowser()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          await handleLogout()
          return
        }

        // Verify the session user matches our stored user
        const sessionUserId = session.user.id
        const currentUserId = user.supabase_user_id?.toString()
        const sessionEmail = session.user.email?.toLowerCase()
        const currentEmail = user.email?.toLowerCase()

        // Check user ID mismatch (if we have both IDs)
        if (currentUserId && sessionUserId !== currentUserId) {
          console.error('🚨 SECURITY ALERT: User ID mismatch detected in periodic check!', {
            sessionUserId,
            sessionEmail,
            currentUserId,
            currentEmail
          })
          // Force immediate logout and clear all storage
          localStorage.clear()
          await supabase.auth.signOut()
          await handleLogout()
          return
        }

        // Check email mismatch (fallback if supabase_user_id is missing)
        if (sessionEmail && currentEmail && sessionEmail !== currentEmail) {
          console.error('🚨 SECURITY ALERT: Email mismatch detected in periodic check!', {
            sessionEmail,
            currentEmail
          })
          // Force immediate logout and clear all storage
          localStorage.clear()
          await supabase.auth.signOut()
          await handleLogout()
          return
        }
      } catch (error) {
        // Silent fail - security check will retry
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
    logout: handleLogout,
    checkAuth
  }
}
