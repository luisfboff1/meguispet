import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Usuario } from '@/types'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

// Session timeout: 6 hours (same as middleware)
const SESSION_MAX_AGE = 6 * 60 * 60 * 1000 // 6 hours in milliseconds

interface AuthStore {
  user: Usuario | null
  token: string | null
  status: AuthStatus
  lastActivity: number | null
  setCredentials: (user: Usuario, token: string) => void
  setStatus: (status: AuthStatus) => void
  clear: () => void
}

const emptyStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined
} as unknown as Storage

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      status: 'idle',
      lastActivity: null,
      setCredentials: (user, token) => set({
        user,
        token,
        status: 'authenticated',
        lastActivity: Date.now()
      }),
      setStatus: (status) => set({ status }),
      clear: () => set({
        user: null,
        token: null,
        status: 'unauthenticated',
        lastActivity: null
      })
    }),
    {
      name: 'meguispet-auth-store',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? emptyStorage : window.localStorage)),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        lastActivity: state.lastActivity
      }),
      onRehydrateStorage: () => (state) => {
        // Clear expired sessions on rehydration
        if (state?.lastActivity) {
          const now = Date.now()
          const timeSinceLastActivity = now - state.lastActivity

          if (timeSinceLastActivity > SESSION_MAX_AGE) {
            console.log('🧹 Clearing expired session from localStorage (inactive for', Math.round(timeSinceLastActivity / 1000 / 60 / 60), 'hours)')
            state.clear()
          }
        }
      }
    }
  )
)
