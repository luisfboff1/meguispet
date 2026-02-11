import React, { useRef, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import * as XLSX from 'xlsx'
import { Bot, User, Copy, Check, Download, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { SqlQueryPanel } from './SqlQueryPanel'
import { ChartRenderer, type ChartSpec } from './ChartRenderer'
import type { AgentMessage } from '@/types'

interface ChatMessageProps {
  message: AgentMessage
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formattedTime = message.created_at
    ? new Date(message.created_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : 'bg-amber-100 dark:bg-amber-900/30'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1',
          isUser && 'items-end'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400',
            isUser && 'flex-row-reverse'
          )}
        >
          <span className="font-medium">
            {isUser ? 'Voce' : 'Megui'}
          </span>
          {formattedTime && <span>{formattedTime}</span>}
          {isAssistant && message.model_used && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {message.model_used}
            </Badge>
          )}
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-tr-md bg-blue-600 text-white'
              : 'rounded-tl-md bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
          )}
        >
          {/* SQL Query Panel (assistant only) */}
          {isAssistant && (
            <SqlQueryPanel
              toolCalls={message.tool_calls}
              sqlQueries={message.sql_queries}
            />
          )}

          {/* Message content with full markdown rendering */}
          <div
            className={cn(
              'break-words',
              isAssistant && 'prose prose-sm max-w-none dark:prose-invert',
              isUser && 'whitespace-pre-wrap'
            )}
          >
            {isUser ? (
              message.content
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {preprocessContent(message.content)}
              </ReactMarkdown>
            )}
          </div>

          {/* Streaming cursor */}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-amber-500" />
          )}
        </div>

        {/* Footer - tokens & copy */}
        {isAssistant && !isStreaming && (
          <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            {message.output_tokens > 0 && (
              <span className="text-[10px] text-slate-400">
                {message.output_tokens} tokens
              </span>
            )}
            <button
              onClick={handleCopy}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              title="Copiar resposta"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Table wrapper component with copy and export functionality.
 */
function MarkdownTable({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  const tableRef = useRef<HTMLTableElement>(null)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const extractTableData = useCallback((): string[][] => {
    const table = tableRef.current
    if (!table) return []
    const rows = table.querySelectorAll('tr')
    return Array.from(rows).map((row) => {
      const cells = row.querySelectorAll('th, td')
      return Array.from(cells).map((cell) => cell.textContent?.trim() || '')
    })
  }, [])

  const handleCopy = useCallback(() => {
    const data = extractTableData()
    const tsv = data.map((row) => row.join('\t')).join('\n')
    navigator.clipboard.writeText(tsv)
    setCopied(true)
    setMenuOpen(false)
    setTimeout(() => setCopied(false), 2000)
  }, [extractTableData])

  const handleExportExcel = useCallback(() => {
    const data = extractTableData()
    if (data.length === 0) return
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dados')
    XLSX.writeFile(wb, `megui-dados-${Date.now()}.xlsx`)
    setMenuOpen(false)
  }, [extractTableData])

  return (
    <div className="group/table relative my-3 overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-600">
      {/* Action buttons - top right */}
      <div className="absolute right-1 top-1 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/table:opacity-100">
        <button
          onClick={handleCopy}
          className="rounded p-1 text-slate-400 hover:bg-white/80 hover:text-slate-600 dark:hover:bg-slate-800/80 dark:hover:text-slate-300"
          title="Copiar tabela"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded p-1 text-slate-400 hover:bg-white/80 hover:text-slate-600 dark:hover:bg-slate-800/80 dark:hover:text-slate-300"
            title="Mais opcoes"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <button
                  onClick={handleCopy}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Copy className="h-3 w-3" />
                  Copiar tabela
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Download className="h-3 w-3" />
                  Exportar Excel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <table ref={tableRef} className="w-full border-collapse text-xs" {...props}>
        {children}
      </table>
    </div>
  )
}

/**
 * Custom markdown components for styled table and chart rendering.
 */
const markdownComponents = {
  table: MarkdownTable,
  thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-slate-100 dark:bg-slate-700" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="border-b border-r border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700 last:border-r-0 dark:border-slate-600 dark:text-slate-200"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className="border-b border-r border-slate-200 px-3 py-2 text-xs text-slate-600 last:border-r-0 dark:border-slate-600 dark:text-slate-300"
      {...props}
    >
      {children}
    </td>
  ),
  tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
      className="even:bg-slate-50 dark:even:bg-slate-800/50"
      {...props}
    >
      {children}
    </tr>
  ),
  code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
    const match = /language-(\w+)/.exec(className || '')
    const language = match?.[1]

    // Detect chart blocks
    if (language === 'chart') {
      try {
        const chartSpec: ChartSpec = JSON.parse(String(children).trim())
        return <ChartRenderer spec={chartSpec} />
      } catch (error) {
        console.error('Failed to parse chart spec:', error)
        return (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            ❌ Erro ao renderizar gráfico: JSON inválido
          </div>
        )
      }
    }

    // Regular code blocks
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
}

/**
 * Pre-processes LLM output to convert space-aligned tables into markdown tables.
 * Detects blocks of lines with consistent column alignment and converts them.
 */
function preprocessContent(content: string): string {
  if (!content) return ''

  const lines = content.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    // Skip lines that are already markdown table syntax
    if (lines[i].trim().startsWith('|')) {
      result.push(lines[i])
      i++
      continue
    }

    // Try to detect a space-aligned table block
    const tableBlock = detectSpaceAlignedTable(lines, i)
    if (tableBlock) {
      result.push('') // blank line before table for markdown parsing
      result.push(...convertToMarkdownTable(tableBlock.lines))
      result.push('') // blank line after table
      i = tableBlock.endIndex
      continue
    }

    result.push(lines[i])
    i++
  }

  return result.join('\n')
}

interface TableBlock {
  lines: string[]
  endIndex: number
}

/**
 * Detects a block of space-aligned table lines starting at index.
 * A header line (2+ columns, short text) followed by data rows with matching column count.
 */
function detectSpaceAlignedTable(lines: string[], startIndex: number): TableBlock | null {
  const headerLine = lines[startIndex]
  if (!headerLine || !headerLine.trim()) return null

  // Header must have at least 2 "columns" separated by 2+ spaces
  const headerCols = splitByMultipleSpaces(headerLine.trim())
  if (headerCols.length < 2) return null

  // Header columns must look like headers (short, non-numeric)
  const looksLikeHeader = headerCols.every(
    (col) => col.length < 40 && !/^\d+[.,]\d+$/.test(col)
  )
  if (!looksLikeHeader) return null

  // Collect data lines with EXACT same column count
  const tableLines: string[] = [headerLine]
  let endIndex = startIndex + 1

  while (endIndex < lines.length) {
    const line = lines[endIndex]
    if (!line || !line.trim()) break

    // Line too long = probably a paragraph, not a table row
    if (line.trim().length > 120) break

    const cols = splitByMultipleSpaces(line.trim())
    // Require exact column count match
    if (cols.length !== headerCols.length) break

    tableLines.push(line)
    endIndex++
  }

  // Need at least header + 2 data rows
  if (tableLines.length < 3) return null

  return { lines: tableLines, endIndex }
}

function splitByMultipleSpaces(text: string): string[] {
  return text.split(/\s{2,}/).filter((s) => s.trim())
}

function convertToMarkdownTable(lines: string[]): string[] {
  const rows = lines.map((line) => splitByMultipleSpaces(line.trim()))
  const colCount = rows[0].length

  const result: string[] = []
  // Header
  result.push('| ' + rows[0].join(' | ') + ' |')
  // Separator
  result.push('| ' + Array(colCount).fill('---').join(' | ') + ' |')
  // Data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    while (row.length < colCount) row.push('')
    result.push('| ' + row.join(' | ') + ' |')
  }

  return result
}
