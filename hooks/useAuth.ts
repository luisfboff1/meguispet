import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { authService } from '@/services/api'
import type { Usuario } from '@/types'

interface AuthState {
  user: Usuario | null
  loading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false
  })
  
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setAuthState({ user: null, loading: false, isAuthenticated: false })
        return
      }

      // Verificar se o token é válido
      const response = await authService.getProfile()
      if (response.success && response.data) {
        setAuthState({
          user: response.data,
          loading: false,
          isAuthenticated: true
        })
      } else {
        // Token inválido, limpar e redirecionar
        await logout()
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
      await logout()
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login(email, password)
      if (response.success && response.data) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        
        setAuthState({
          user: response.data.user,
          loading: false,
          isAuthenticated: true
        })
        
        return true
      }
      return false
    } catch (error) {
      console.error('Erro no login:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Erro no logout:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setAuthState({
        user: null,
        loading: false,
        isAuthenticated: false
      })
      router.push('/login')
    }
  }

  return {
    ...authState,
    login,
    logout,
    checkAuth
  }
}
