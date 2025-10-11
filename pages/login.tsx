import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
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
  const { login, isAuthenticated, status } = useAuth()

  useEffect(() => {
    if (!router.isReady || !isAuthenticated || loading) return
    const redirectParam = router.query.redirect
    const redirectPath = typeof redirectParam === 'string' && redirectParam.startsWith('/')
      ? redirectParam
      : '/dashboard'
    router.replace(redirectPath)
  }, [isAuthenticated, loading, router, router.query.redirect])

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
      console.error('Erro no login:', error)
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
