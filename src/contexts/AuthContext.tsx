import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '@/services/api'

interface User {
    id: number
    nome: string
    email: string
    role: string
}

interface AuthContextType {
    user: User | null
    loading: boolean
    login: (email: string, password: string) => Promise<boolean>
    logout: () => void
    resetPassword: (email: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Verificar token salvo e carregar usuário
        const token = localStorage.getItem('token')
        if (token) {
            // Aqui poderiamos verificar o token com o backend
            const savedUser = localStorage.getItem('user')
            if (savedUser) {
                setUser(JSON.parse(savedUser))
            }
        }
        setLoading(false)
    }, [])

    const login = async (email: string, password: string) => {
        try {
            const response = await authApi.login(email, password)
            
            if (response.success && response.data) {
                const { token, user } = response.data
                localStorage.setItem('token', token)
                localStorage.setItem('user', JSON.stringify(user))
                setUser(user)
                return true
            }
            return false
        } catch (error) {
            console.error('Erro no login:', error)
            return false
        }
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }

    const resetPassword = async (email: string) => {
        try {
            const response = await authApi.resetPassword(email)
            return response.success
        } catch (error) {
            console.error('Erro ao resetar senha:', error)
            return false
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, resetPassword }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider')
    }
    return context
}
