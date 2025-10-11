import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

type ResolvedTheme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  resolvedTheme: ResolvedTheme
  mounted: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setResolvedTheme: (theme: ResolvedTheme) => void
  setMounted: (mounted: boolean) => void
}

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),
      mounted: false,
      setTheme: (theme) => {
        set({ theme })
      },
      toggleTheme: () => {
        set((state) => {
          const nextTheme = state.theme === 'light' ? 'dark' : 'light'
          return { theme: nextTheme }
        })
      },
      setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
      setMounted: (mounted) => set({ mounted })
    }),
    {
      name: 'meguispet-theme-store',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined
          } as unknown as Storage
        }
        return window.localStorage
      }),
      partialize: (state) => ({ theme: state.theme })
    }
  )
)

export const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}
