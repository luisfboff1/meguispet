import React, { useState, useRef, useEffect } from 'react'
import {
  Plus,
  Pin,
  Trash2,
  Pencil,
  MoreHorizontal,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { AgentConversation } from '@/types'

interface ConversationTabsProps {
  conversations: AgentConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onRename: (id: string, titulo: string) => void
  onPin: (id: string) => void
}

export function ConversationTabs({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onPin,
}: ConversationTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const menuTriggerRef = useRef<HTMLSpanElement | null>(null)

  // Close menu on scroll or resize
  useEffect(() => {
    if (!menuId) return
    const close = () => setMenuId(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menuId])

  const handleStartRename = (conv: AgentConversation) => {
    setEditingId(conv.id)
    setEditValue(conv.titulo)
    setMenuId(null)
  }

  const handleConfirmRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  const handleCancelRename = () => {
    setEditingId(null)
  }

  const handleOpenMenu = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    if (menuId === convId) {
      setMenuId(null)
      return
    }
    // Calculate fixed position from button
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.left })
    setMenuId(convId)
  }

  const handleDoubleClick = (conv: AgentConversation) => {
    setEditingId(conv.id)
    setEditValue(conv.titulo)
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/50">
      {conversations.map((conv) => (
        <div key={conv.id} className="group relative flex shrink-0 items-center">
          {editingId === conv.id ? (
            <div className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-amber-400 dark:bg-slate-800">
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmRename()
                  if (e.key === 'Escape') handleCancelRename()
                }}
                className="w-32 bg-transparent text-xs outline-none dark:text-slate-200"
                autoFocus
              />
              <button onClick={handleConfirmRename} className="text-emerald-500 hover:text-emerald-600">
                <Check className="h-3 w-3" />
              </button>
              <button onClick={handleCancelRename} className="text-slate-400 hover:text-slate-600">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelect(conv.id)}
              onDoubleClick={() => handleDoubleClick(conv)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                activeId === conv.id
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50'
              )}
            >
              {conv.is_pinned && <Pin className="h-3 w-3 text-amber-500" />}
              <span className="max-w-[120px] truncate">{conv.titulo}</span>

              {/* Menu trigger - visible on hover or when active/open */}
              <span
                ref={menuId === conv.id ? menuTriggerRef : undefined}
                onClick={(e) => handleOpenMenu(e, conv.id)}
                className={cn(
                  'ml-1 rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600',
                  activeId === conv.id || menuId === conv.id
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                )}
              >
                <MoreHorizontal className="h-3 w-3" />
              </span>
            </button>
          )}
        </div>
      ))}

      {/* Dropdown menu - fixed position to escape overflow clip */}
      {menuId && menuPos && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuId(null)}
          />
          <div
            className="fixed z-50 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              onClick={() => {
                const conv = conversations.find((c) => c.id === menuId)
                if (conv) handleStartRename(conv)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Pencil className="h-3 w-3" /> Renomear
            </button>
            <button
              onClick={() => {
                onPin(menuId)
                setMenuId(null)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Pin className="h-3 w-3" />
              {conversations.find((c) => c.id === menuId)?.is_pinned ? 'Desafixar' : 'Fixar'}
            </button>
            <button
              onClick={() => {
                onDelete(menuId)
                setMenuId(null)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-3 w-3" /> Excluir
            </button>
          </div>
        </>
      )}

      {/* New conversation button */}
      <Button
        onClick={onCreate}
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1 text-xs text-slate-500 hover:text-slate-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Nova conversa
      </Button>
    </div>
  )
}
