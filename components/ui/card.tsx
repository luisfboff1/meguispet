import * as React from "react"
import type { ComponentPropsWithoutRef } from "react"
import { motion, useReducedMotion } from "framer-motion"
import type { Easing, Transition } from "framer-motion"

import { cn } from "@/lib/utils"

const CARD_EASE: Easing = [0.16, 1, 0.3, 1]

export interface CardProps extends ComponentPropsWithoutRef<typeof motion.div> {
  animated?: boolean
  animationDelay?: number
  hoverElevation?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      animated = true,
      animationDelay = 0,
      hoverElevation = true,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion()

    const interactiveStyles = hoverElevation
      ? "group transition-shadow duration-300 hover:shadow-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-meguispet-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      : ""

    const cardClassName = cn(
      "rounded-lg border bg-card text-card-foreground shadow-xs",
      interactiveStyles,
      className
    )

    const shouldAnimate = animated && !shouldReduceMotion

    const transition: Transition | undefined = shouldAnimate
      ? {
          duration: 0.32,
          delay: animationDelay,
          ease: CARD_EASE
        }
      : undefined

    return (
      <motion.div
        ref={ref}
        initial={shouldAnimate ? { opacity: 0, y: 18, scale: 0.98 } : undefined}
        animate={shouldAnimate ? { opacity: 1, y: 0, scale: 1 } : undefined}
        exit={shouldAnimate ? { opacity: 0, y: 18, scale: 0.98 } : undefined}
        transition={transition}
        whileHover={
          hoverElevation && shouldAnimate
            ? { y: -2, scale: 1.005 }
            : undefined
        }
        whileTap={hoverElevation && shouldAnimate ? { scale: 0.995 } : undefined}
        className={cardClassName}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
