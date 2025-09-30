import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'

interface ThemeToggleProps {
  variant?: 'default' | 'icon-only' | 'dropdown'
  className?: string
}

export function ThemeToggle({ variant = 'default', className }: ThemeToggleProps) {
  const { theme, resolvedTheme, toggleTheme, setTheme, mounted } = useTheme()

  if (!mounted) {
    return (
      <div className={cn("w-9 h-9", className)} />
    )
  }

  if (variant === 'icon-only') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={cn("relative", className)}
        title={`Mudar para ${resolvedTheme === 'light' ? 'modo escuro' : 'modo claro'}`}
      >
        <Sun 
          className={cn(
            "h-4 w-4 transition-all duration-300",
            resolvedTheme === 'dark' ? "rotate-0 scale-100" : "rotate-90 scale-0"
          )} 
        />
        <Moon 
          className={cn(
            "absolute h-4 w-4 transition-all duration-300",
            resolvedTheme === 'light' ? "rotate-0 scale-100" : "rotate-90 scale-0"
          )} 
        />
      </Button>
    )
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className={cn("justify-start", className)}
        >
          {resolvedTheme === 'light' ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          <span className="capitalize">{theme}</span>
        </Button>
        
        <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                "flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700",
                theme === 'light' && "bg-gray-100 dark:bg-gray-700"
              )}
            >
              <Sun className="mr-2 h-4 w-4" />
              Claro
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700",
                theme === 'dark' && "bg-gray-100 dark:bg-gray-700"
              )}
            >
              <Moon className="mr-2 h-4 w-4" />
              Escuro
            </button>
            <button
              onClick={() => setTheme('system')}
              className={cn(
                "flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700",
                theme === 'system' && "bg-gray-100 dark:bg-gray-700"
              )}
            >
              <Monitor className="mr-2 h-4 w-4" />
              Sistema
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={cn("gap-2", className)}
    >
      {resolvedTheme === 'light' ? (
        <>
          <Moon className="h-4 w-4" />
          <span className="hidden sm:inline">Modo escuro</span>
        </>
      ) : (
        <>
          <Sun className="h-4 w-4" />
          <span className="hidden sm:inline">Modo claro</span>
        </>
      )}
    </Button>
  )
}
