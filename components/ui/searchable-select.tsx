import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Search, ChevronsUpDown, Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchableSelectProps<T> {
  value: string
  onValueChange: (value: string, item: T | null) => void
  onSearch: (term: string) => Promise<T[]>
  initialItems?: T[]
  getItemValue: (item: T) => string
  getItemLabel: (item: T) => string
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
}

function SearchableSelectInner<T>(
  {
    value,
    onValueChange,
    onSearch,
    initialItems = [],
    getItemValue,
    getItemLabel,
    placeholder = 'Selecione...',
    searchPlaceholder = 'Buscar...',
    disabled = false,
    className,
  }: SearchableSelectProps<T>,
  ref: React.ForwardedRef<HTMLButtonElement>
) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<T[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const handleSearch = useCallback(
    (term: string) => {
      setSearch(term)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (!term.trim()) {
        setItems(initialItems)
        setLoading(false)
        return
      }

      setLoading(true)
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await onSearch(term)
          setItems(results)
        } catch {
          setItems([])
        } finally {
          setLoading(false)
        }
      }, 300)
    },
    [onSearch, initialItems]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const selectedItem = items.find((item) => getItemValue(item) === value)
  const selectedLabel = selectedItem
    ? getItemLabel(selectedItem)
    : initialItems.find((item) => getItemValue(item) === value)
      ? getItemLabel(initialItems.find((item) => getItemValue(item) === value)!)
      : ''

  return (
    <Popover.Root
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (isOpen) {
          setTimeout(() => inputRef.current?.focus(), 0)
        } else {
          setSearch('')
          setItems(initialItems)
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          ref={ref}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          <span className={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
            {selectedLabel || placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && (
              <span
                role="button"
                tabIndex={-1}
                className="hover:text-destructive cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onValueChange('', null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    onValueChange('', null)
                  }
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-[1100] w-[var(--radix-popover-trigger-width)] rounded-md border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          sideOffset={4}
          align="start"
        >
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex h-10 w-full bg-transparent px-2 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-50" />}
          </div>

          <div className="max-h-[300px] overflow-y-auto p-1">
            {items.length === 0 && !loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {search ? 'Nenhum resultado encontrado.' : 'Nenhum item disponível.'}
              </div>
            )}

            {items.map((item) => {
              const itemValue = getItemValue(item)
              const isSelected = itemValue === value

              return (
                <div
                  key={itemValue}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    isSelected && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => {
                    onValueChange(isSelected ? '' : itemValue, isSelected ? null : item)
                    setOpen(false)
                  }}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {isSelected && <Check className="h-4 w-4" />}
                  </span>
                  <span className="truncate">{getItemLabel(item)}</span>
                </div>
              )
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export const SearchableSelect = React.forwardRef(SearchableSelectInner) as <T>(
  props: SearchableSelectProps<T> & { ref?: React.Ref<HTMLButtonElement> }
) => React.ReactElement
