import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Database, Clock, Rows3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentToolCall, AgentSqlQuery } from '@/types'

interface SqlQueryPanelProps {
  toolCalls?: AgentToolCall[] | null
  sqlQueries?: AgentSqlQuery[] | null
  defaultExpanded?: boolean
}

export function SqlQueryPanel({
  toolCalls,
  sqlQueries,
  defaultExpanded = false,
}: SqlQueryPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const hasContent =
    (toolCalls && toolCalls.length > 0) ||
    (sqlQueries && sqlQueries.length > 0)

  if (!hasContent) return null

  const queriedTables = extractTables(sqlQueries, toolCalls)

  return (
    <div className="my-2 rounded-lg border bg-muted/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
      >
        <Database className="h-3.5 w-3.5" />
        <span className="font-medium">
          {queriedTables.length > 0
            ? `Tabelas: ${queriedTables.join(', ')}`
            : 'Consulta ao banco de dados'}
        </span>
        <span className="ml-auto">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 border-t px-3 py-2">
          {sqlQueries?.map((query, i) => (
            <div key={i} className="space-y-1">
              {query.explanation && (
                <p className="text-xs text-muted-foreground">
                  {query.explanation}
                </p>
              )}
              <pre className="overflow-x-auto rounded bg-slate-900 p-2 text-xs text-green-400">
                <code>{query.sql}</code>
              </pre>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {query.execution_time_ms > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {query.execution_time_ms}ms
                  </span>
                )}
                {query.rows_returned > 0 && (
                  <span className="flex items-center gap-1">
                    <Rows3 className="h-3 w-3" />
                    {query.rows_returned} linha{query.rows_returned !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}

          {toolCalls
            ?.filter((tc) => !sqlQueries || sqlQueries.length === 0)
            .map((tc, i) => (
              <div key={i} className="space-y-1">
                <p className="text-xs font-medium text-foreground">
                  {tc.tool_name}
                </p>
                {tc.result != null && (
                  <pre className="max-h-32 overflow-auto rounded bg-slate-900 p-2 text-xs text-muted-foreground">
                    <code>
                      {typeof tc.result === 'string'
                        ? (tc.result as string).substring(0, 500)
                        : JSON.stringify(tc.result, null, 2).substring(0, 500)}
                    </code>
                  </pre>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function extractTables(
  sqlQueries?: AgentSqlQuery[] | null,
  toolCalls?: AgentToolCall[] | null
): string[] {
  const tables = new Set<string>()
  const knownTables = [
    'vendas', 'vendas_itens', 'clientes_fornecedores', 'produtos',
    'estoques', 'produtos_estoques', 'vendedores', 'transacoes',
    'categorias_financeiras', 'formas_pagamento', 'venda_parcelas',
    'movimentacoes_estoque', 'bling_vendas', 'bling_nfe',
  ]

  const allSql = [
    ...(sqlQueries?.map((q) => q.sql) || []),
    ...(toolCalls
      ?.filter((tc) => tc.tool_name === 'sql_db_query' || tc.tool_name === 'query-sql')
      .map((tc) => String(tc.args?.input || tc.result || '')) || []),
  ]

  for (const sql of allSql) {
    for (const table of knownTables) {
      if (sql.toLowerCase().includes(table)) {
        tables.add(table)
      }
    }
  }

  return Array.from(tables)
}
