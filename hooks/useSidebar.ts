import { useCallback, useEffect, useMemo } from 'react'
import { useSidebarStore } from '@/store/sidebar'

const isTouchDevice = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

const getDeviceFromWidth = (width: number): 'mobile' | 'tablet' | 'desktop' => {
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

export function useSidebar() {
  const {
    isOpen,
    isCollapsed,
    device,
    setOpen,
    open,
    close,
    toggle,
    setCollapsed,
    toggleCollapsed,
    setDevice,
    closeOnNavigate
  } = useSidebarStore()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const width = window.innerWidth
    setDevice(getDeviceFromWidth(width))
  }, [setDevice])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = () => {
      setDevice(getDeviceFromWidth(window.innerWidth))
    }

    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [setDevice])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, close])

  useEffect(() => {
    const shouldLockScroll = device !== 'desktop' && isOpen

    if (shouldLockScroll) {
      document.body.dataset.sidebarLocked = 'true'
      document.body.style.overflow = 'hidden'
    } else if (!document.body.dataset.modalOpen) {
      delete document.body.dataset.sidebarLocked
      document.body.style.overflow = ''
    }

    return () => {
      delete document.body.dataset.sidebarLocked
      if (!document.body.dataset.modalOpen) {
        document.body.style.overflow = ''
      }
    }
  }, [device, isOpen])

  const collapse = useCallback(() => setCollapsed(true), [setCollapsed])
  const expand = useCallback(() => setCollapsed(false), [setCollapsed])

  const isTemporary = useMemo(() => device !== 'desktop', [device])
  const shouldShowOverlay = isTemporary && isOpen

  const handleItemSelect = useCallback(() => {
    if (isTemporary) {
      close()
    } else if (isTouchDevice()) {
      setOpen(false)
      requestAnimationFrame(() => setOpen(true))
    }
  }, [isTemporary, close, setOpen])

  return {
    isOpen,
    isCollapsed,
    device,
    open,
    close,
    toggle,
    collapse,
    expand,
    toggleCollapsed,
    setDevice,
    closeOnNavigate,
    isTemporary,
    shouldShowOverlay,
    handleItemSelect
  }
}
