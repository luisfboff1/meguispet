import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Usuario } from '@/types'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

interface AuthStore {
  user: Usuario | null
  token: string | null
  status: AuthStatus
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
      setCredentials: (user, token) => set({
        user,
        token,
        status: 'authenticated'
      }),
      setStatus: (status) => set({ status }),
      clear: () => set({
        user: null,
        token: null,
        status: 'unauthenticated'
      })
    }),
    {
      name: 'meguispet-auth-store',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? emptyStorage : window.localStorage)),
      partialize: (state) => ({
        user: state.user,
        token: state.token
      })
    }
  )
)
