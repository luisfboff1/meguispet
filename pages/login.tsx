import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseBrowser } from '@/lib/supabase'
import type { LoginForm } from '@/types'

// 🔐 PÁGINA DE LOGIN - SEM LAYOUT AUTOMÁTICO
// Esta página não terá sidebar/header porque está na lista noLayoutPages

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: ''
  })
  const { login, status, logout } = useAuth()

  // Clear any stale session data on mount
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    const clearStaleSession = async () => {
      try {
        // Check if we have any Supabase cookies
        const hasCookies = document.cookie.includes('supabase')
        
        // If we're on login page with cookies, it means session expired
        // Clear everything to prevent issues
        if (hasCookies) {
          console.log('🧹 Login: Clearing stale session data')
          
          // Clear all Supabase-related cookies
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const eqPos = cookie.indexOf('=')
            const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
            if (name.includes('supabase') || name.includes('auth') || name === 'token') {
              document.cookie = `${name}=; Max-Age=0; Path=/`
            }
          }
          
          // Clear localStorage items
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('meguispet-auth-store')
          
          // Clear Supabase session using the existing utility
          const supabase = getSupabaseBrowser()
          await supabase.auth.signOut()
        }
      } catch (error) {
        console.error('Error clearing stale session:', error)
      }
    }
    
    clearStaleSession()
  }, [])

  // Middleware already redirects authenticated users to /dashboard
  // No need for client-side redirect check (reduces Supabase API calls)

  // Verificar se usuário foi redirecionado por sessão expirada ou permissão negada
  const message = router.query.message as string | undefined
  const error = router.query.error as string | undefined
  const fromEmergency = router.query.from === 'emergency'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const success = await login(formData.email, formData.password)
      if (success) {
        const redirectParam = router.query.redirect
        const redirectPath = typeof redirectParam === 'string' && redirectParam.startsWith('/')
          ? redirectParam
          : '/dashboard'
        router.push(redirectPath)
      } else {
        alert('Credenciais inválidas!')
      }
    } catch (error) {
      alert('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof LoginForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4">
            <Image
              src="/Meguis-pet-1280x1147.png"
              alt="MeguisPet Logo"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MeguisPet</h1>
          <p className="text-gray-600">Sistema de Gestão</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Entrar no Sistema</CardTitle>
            <CardDescription>
              Digite suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mensagens de alerta */}
            {fromEmergency && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✅ Sessão limpa com sucesso! Por favor, faça login novamente.
                </p>
              </div>
            )}

            {message && !fromEmergency && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ⚠️ {message}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  ❌ {error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Submit */}
              <Button 
                type="submit" 
                className="w-full bg-meguispet-primary hover:bg-meguispet-primary/90"
                disabled={loading || status === 'loading'}
              >
                {loading || status === 'loading' ? (
                  'Entrando...'
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar
                  </>
                )}
              </Button>
            </form>

            {/* Links */}
            <div className="mt-6 text-center">
              <a 
                href="#" 
                className="text-sm text-meguispet-primary hover:underline"
              >
                Esqueceu a senha?
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="mt-4 bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-700 text-center">
              <strong>Demo:</strong> Use qualquer email/senha para entrar
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
