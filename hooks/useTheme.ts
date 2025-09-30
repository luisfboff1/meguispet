import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Detectar tema do sistema
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Aplicar tema ao documento
  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement
    
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    setResolvedTheme(newTheme)
  }

  // Resolver tema baseado na preferência
  const resolveTheme = (preferredTheme: Theme): 'light' | 'dark' => {
    if (preferredTheme === 'system') {
      return getSystemTheme()
    }
    return preferredTheme
  }

  // Inicializar tema
  useEffect(() => {
    setMounted(true)
    
    // Carregar tema salvo
    const savedTheme = localStorage.getItem('meguispet-theme') as Theme
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  // Aplicar tema quando mudar
  useEffect(() => {
    if (!mounted) return

    const newResolvedTheme = resolveTheme(theme)
    applyTheme(newResolvedTheme)
    
    // Salvar preferência
    localStorage.setItem('meguispet-theme', theme)
  }, [theme, mounted])

  // Escutar mudanças no tema do sistema
  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        const newResolvedTheme = resolveTheme('system')
        applyTheme(newResolvedTheme)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

  // Toggle entre light/dark (ignora system)
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  // Definir tema específico
  const setThemeMode = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  return {
    theme,
    resolvedTheme,
    mounted,
    toggleTheme,
    setTheme: setThemeMode,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system'
  }
}
