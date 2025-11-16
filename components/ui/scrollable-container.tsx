import * as React from "react"
import { cn } from "@/lib/utils"
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll"

interface ScrollableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Enable horizontal scrolling with click-and-drag
   * @default true
   */
  enableDragScroll?: boolean
}

/**
 * A container that supports horizontal scrolling with click-and-drag functionality
 * Use this component to wrap tables or other wide content that needs horizontal scrolling
 */
export const ScrollableContainer = React.forwardRef<
  HTMLDivElement,
  ScrollableContainerProps
>(({ className, children, enableDragScroll = true, ...props }, ref) => {
  const dragScrollRef = useHorizontalScroll<HTMLDivElement>()
  
  // Use the drag scroll ref if enabled, otherwise use the forwarded ref
  const finalRef = enableDragScroll ? dragScrollRef : ref
  
  return (
    <div
      ref={finalRef as React.Ref<HTMLDivElement>}
      className={cn("overflow-x-auto", className)}
      {...props}
    >
      {children}
    </div>
  )
})

ScrollableContainer.displayName = "ScrollableContainer"
