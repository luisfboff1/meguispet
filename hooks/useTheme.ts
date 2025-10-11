import { useEffect } from 'react'
import { resolveTheme, useThemeStore } from '@/store/theme'

type Theme = 'light' | 'dark' | 'system'

const applyThemeToDocument = (newTheme: 'light' | 'dark') => {
  const root = document.documentElement

  if (newTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function useTheme() {
  const {
    theme,
    resolvedTheme,
    mounted,
    setTheme,
    toggleTheme,
    setResolvedTheme,
    setMounted
  } = useThemeStore()

  useEffect(() => {
    setMounted(true)
  }, [setMounted])

  useEffect(() => {
    if (!mounted) return

    const newResolvedTheme = resolveTheme(theme)
    setResolvedTheme(newResolvedTheme)
    applyThemeToDocument(newResolvedTheme)
  }, [theme, mounted, setResolvedTheme])

  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      const newResolvedTheme = resolveTheme('system')
      setResolvedTheme(newResolvedTheme)
      applyThemeToDocument(newResolvedTheme)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted, setResolvedTheme])

  const setThemeMode = (nextTheme: Theme) => {
    setTheme(nextTheme)
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
