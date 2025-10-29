import { create } from 'zustand'

type ModalId =
  | 'cliente'
  | 'produto'
  | 'venda'
  | 'movimentacao'
  | 'usuario'
  | 'generic'

interface ModalState {
  id: ModalId | null
  data?: unknown
  isOpen: boolean
}

interface ModalStore extends ModalState {
  open: (id: ModalId, data?: unknown) => void
  close: () => void
  setData: (data: ModalState['data'] | ((current: ModalState['data']) => ModalState['data'])) => void
}

export const useModalStore = create<ModalStore>((set) => ({
  id: null,
  data: undefined,
  isOpen: false,
  open: (id, data) => set({ id, data, isOpen: true }),
  close: () => set({ id: null, data: undefined, isOpen: false }),
  setData: (data) =>
    set((state) => ({
      ...state,
      data: typeof data === 'function' ? (data as (current: ModalState['data']) => ModalState['data'])(state.data) : data
    }))
}))
