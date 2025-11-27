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
      theme: 'light',
      resolvedTheme: 'light',
      mounted: false,
      setTheme: (_theme) => {
        // Always keep light mode
        set({ theme: 'light' })
      },
      toggleTheme: () => {
        // No-op: always light mode
      },
      setResolvedTheme: (_resolvedTheme) => set({ resolvedTheme: 'light' }),
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

export const resolveTheme = (_theme: Theme): ResolvedTheme => {
  // Always return light mode
  return 'light'
}
