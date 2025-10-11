import { useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { authService } from '@/services/api'
import { useAuthStore } from '@/store/auth'

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
  }, [synchronizeLocalStorage])

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Erro no logout:', error)
    } finally {
      clear()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
      clearTokenCookie()
      router.push('/login')
    }
  }, [clear, router])

  const checkAuth = useCallback(async () => {
    try {
      setStatus('loading')
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null

      if (!localToken) {
        clear()
        setStatus('unauthenticated')
        clearTokenCookie()
        return
      }

      const response = await authService.getProfile()
      if (response.success && response.data) {
        setCredentials(response.data, localToken)
        setStatus('authenticated')
      } else {
        await handleLogout()
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
      await handleLogout()
    }
  }, [clear, handleLogout, setCredentials, setStatus])

  useEffect(() => {
    if (status === 'idle') {
      checkAuth()
    }
  }, [status, checkAuth])

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        setStatus('loading')
        const response = await authService.login(email, password)
        if (response.success && response.data) {
          const { token: newToken, user: newUser } = response.data
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', newToken)
            localStorage.setItem('user', JSON.stringify(newUser))
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
