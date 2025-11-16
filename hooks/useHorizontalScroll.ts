import { useRef, useEffect, RefObject } from 'react'

/**
 * Custom hook that enables click-and-drag horizontal scrolling on an element
 * Similar to touch scrolling behavior on mobile devices
 * 
 * @returns A ref to attach to the scrollable element
 */
export function useHorizontalScroll<T extends HTMLElement>(): RefObject<T | null> {
  const elRef = useRef<T | null>(null)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const handleMouseDown = (e: MouseEvent) => {
      // Only trigger on left mouse button
      if (e.button !== 0) return
      
      // Don't trigger if clicking on interactive elements
      const target = e.target as HTMLElement
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea')
      ) {
        return
      }

      isDraggingRef.current = true
      startXRef.current = e.pageX - el.offsetLeft
      scrollLeftRef.current = el.scrollLeft
      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'
      
      // Prevent text selection while dragging
      e.preventDefault()
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      e.preventDefault()
      
      const x = e.pageX - el.offsetLeft
      const walk = (x - startXRef.current) * 1.5 // Multiply by 1.5 for faster scrolling
      el.scrollLeft = scrollLeftRef.current - walk
    }

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      el.style.cursor = 'grab'
      el.style.userSelect = ''
    }

    const handleMouseLeave = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      el.style.cursor = 'grab'
      el.style.userSelect = ''
    }

    // Set initial cursor
    el.style.cursor = 'grab'

    // Add event listeners
    el.addEventListener('mousedown', handleMouseDown)
    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseup', handleMouseUp)
    el.addEventListener('mouseleave', handleMouseLeave)

    // Cleanup
    return () => {
      el.removeEventListener('mousedown', handleMouseDown)
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseup', handleMouseUp)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return elRef
}
