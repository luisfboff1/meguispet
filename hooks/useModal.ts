import { useCallback } from 'react'
import { useModalStore } from '@/store/modal'

export function useModal() {
  const { id, data, isOpen, open, close, setData } = useModalStore()

  const openModal = useCallback(
    (modalId: Parameters<typeof open>[0], modalData?: unknown) => {
      open(modalId, modalData)
    },
    [open]
  )

  const closeModal = useCallback(() => {
    close()
  }, [close])

  const updateData = useCallback(
    (
      modalData:
        | Parameters<typeof setData>[0]
    ) => {
      setData(modalData)
    },
    [setData]
  )

  return {
    id,
    data,
    isOpen,
    open: openModal,
    close: closeModal,
    setData: updateData
  }
}
