import { useEffect } from 'react'
import { useRouter } from 'next/router'

// 🏠 PÁGINA INICIAL - REDIRECIONA AUTOMATICAMENTE
export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Verificar se está logado
    const token = localStorage.getItem('token')
    
    if (token) {
      // Se logado, vai para dashboard
      router.push('/dashboard')
    } else {
      // Se não logado, vai para login
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-meguispet-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-white font-bold text-2xl">M</span>
        </div>
        <p className="text-gray-600">Carregando...</p>
      </div>
    </div>
  )
}
