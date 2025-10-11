import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type SidebarDevice = 'mobile' | 'tablet' | 'desktop'

interface SidebarStore {
  isOpen: boolean
  isCollapsed: boolean
  device: SidebarDevice
  setOpen: (open: boolean) => void
  open: () => void
  close: () => void
  toggle: () => void
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  setDevice: (device: SidebarDevice) => void
  closeOnNavigate: () => void
}

const safeStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined
} as unknown as Storage

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      isOpen: true,
      isCollapsed: false,
      device: 'desktop',
      setOpen: (open) => set({ isOpen: open }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setDevice: (device) =>
        set((state) => {
          if (state.device === device) {
            return {}
          }

          return {
            device,
            isOpen: device === 'desktop'
          }
        }),
      closeOnNavigate: () => {
        if (get().device !== 'desktop') {
          set({ isOpen: false })
        }
      }
    }),
    {
      name: 'meguispet-sidebar-store',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? safeStorage : window.localStorage)),
      partialize: (state) => ({ isCollapsed: state.isCollapsed })
    }
  )
)
