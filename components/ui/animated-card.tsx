import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Easing, Transition } from 'framer-motion'

import { cn } from '@/lib/utils'
import { Card } from './card'
import type { CardProps } from './card'

interface AnimatedCardProps
  extends Omit<CardProps, 'animated' | 'animationDelay' | 'hoverElevation' | 'children'> {
  delay?: number
  hoverElevation?: boolean
  children?: React.ReactNode
}

const MOTION_EASE: Easing = [0.16, 1, 0.3, 1]

export const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, delay = 0, hoverElevation = true, children, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion()

    const transition: Transition = shouldReduceMotion
      ? { duration: 0.12, delay }
      : { duration: 0.32, delay, ease: MOTION_EASE }

    return (
      <motion.div
        layout
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
        transition={transition}
        whileHover={
          hoverElevation && !shouldReduceMotion
            ? { y: -4, scale: 1.01, boxShadow: '0 24px 45px -30px rgba(15, 23, 42, 0.35)' }
            : undefined
        }
        whileTap={hoverElevation && !shouldReduceMotion ? { scale: 0.995 } : undefined}
        className="group"
      >
        <Card
          animated={false}
          hoverElevation={false}
          ref={ref}
          className={cn(
            'relative overflow-hidden border border-white/40 bg-white/90 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-950/80',
            hoverElevation &&
              'ring-0 ring-transparent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-meguispet-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
            className
          )}
          {...props}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-meguispet-primary/35 via-transparent to-meguispet-primary/25" />
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-[1]" data-animated-card-content="true">
            {children as React.ReactNode}
          </div>
        </Card>
      </motion.div>
    )
  }
)

AnimatedCard.displayName = 'AnimatedCard'
