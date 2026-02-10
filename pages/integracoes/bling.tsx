import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import {
  Search,
  RefreshCw,
  ShoppingCart,
  FileText,
  Settings,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Download,
  ExternalLink,
  Unplug,
  Clock,
  Database,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { blingService } from '@/services/blingService'
import { formatCurrency, formatLocalDate } from '@/lib/utils'
import Toast from '@/components/ui/Toast'
import type {
  BlingVenda,
  BlingNfe,
  BlingStatus,
  BlingSyncResult,
} from '@/types'

// ─── Situação helpers ─────────────────────────────────────────────
const VENDA_SITUACAO_COLORS: Record<number, string> = {
  0:  'bg-gray-100 text-gray-700',
  6:  'bg-blue-100 text-blue-700',     // Em aberto
  9:  'bg-green-100 text-green-700',    // Atendido
  12: 'bg-red-100 text-red-700',        // Cancelado
  15: 'bg-yellow-100 text-yellow-700',  // Em andamento
  18: 'bg-purple-100 text-purple-700',  // Verificado
  21: 'bg-orange-100 text-orange-700',  // Venda agenciada
  24: 'bg-emerald-100 text-emerald-700', // Em digitação
}

const NFE_SITUACAO_MAP: Record<number, { label: string; color: string }> = {
  1:  { label: 'Pendente',   color: 'bg-yellow-100 text-yellow-700' },
  2:  { label: 'Emitida',    color: 'bg-green-100 text-green-700' },
  3:  { label: 'Cancelada',  color: 'bg-red-100 text-red-700' },
  4:  { label: 'Inutilizada', color: 'bg-gray-100 text-gray-700' },
  5:  { label: 'Denegada',   color: 'bg-orange-100 text-orange-700' },
  6:  { label: 'Rejeitada',  color: 'bg-red-100 text-red-700' },
  7:  { label: 'Importada',  color: 'bg-blue-100 text-blue-700' },
  8:  { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-700' },
  9:  { label: 'Enviada',    color: 'bg-teal-100 text-teal-700' },
  10: { label: 'Em digitação', color: 'bg-indigo-100 text-indigo-700' },
  11: { label: 'Encerrada',  color: 'bg-gray-100 text-gray-700' },
}

const NFE_TIPO_MAP: Record<number, string> = {
  0: 'Entrada',
  1: 'Saída',
}

const NFE_FINALIDADE_MAP: Record<number, string> = {
  1: 'Normal',
  2: 'Complementar',
  3: 'Ajuste',
  4: 'Devolução',
}

// ─── Main Component ───────────────────────────────────────────────
export default function BlingPage() {
  const [activeTab, setActiveTab] = useState('vendas')
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)

  // Status
  const [status, setStatus] = useState<BlingStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  // Vendas
  const [vendas, setVendas] = useState<BlingVenda[]>([])
  const [vendasLoading, setVendasLoading] = useState(false)
  const [vendasTotal, setVendasTotal] = useState(0)
  const [vendasPage, setVendasPage] = useState(1)
  const [vendasSearch, setVendasSearch] = useState('')

  // NFe
  const [nfe, setNfe] = useState<BlingNfe[]>([])
  const [nfeLoading, setNfeLoading] = useState(false)
  const [nfeTotal, setNfeTotal] = useState(0)
  const [nfePage, setNfePage] = useState(1)
  const [nfeSearch, setNfeSearch] = useState('')

  // Sync
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<BlingSyncResult | null>(null)
  const [importDataInicial, setImportDataInicial] = useState('')
  const [importDataFinal, setImportDataFinal] = useState('')
  const [importTipo, setImportTipo] = useState<'vendas' | 'nfe' | 'all'>('all')

  // ─── Data fetching ────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    try {
      setStatusLoading(true)
      const res = await blingService.getStatus()
      if (res.success && res.data) setStatus(res.data)
    } catch {
      // silent
    } finally {
      setStatusLoading(false)
    }
  }, [])

  const loadVendas = useCallback(async (page = 1, search = '') => {
    try {
      setVendasLoading(true)
      const res = await blingService.getVendas({
        page,
        limit: 50,
        search: search || undefined,
      })
      if (res.success) {
        setVendas(res.data || [])
        setVendasTotal(res.pagination?.total || 0)
        setVendasPage(page)
      }
    } catch {
      setToast({ message: 'Erro ao carregar vendas Bling', type: 'error' })
    } finally {
      setVendasLoading(false)
    }
  }, [])

  const loadNfe = useCallback(async (page = 1, search = '') => {
    try {
      setNfeLoading(true)
      const res = await blingService.getNfe({
        page,
        limit: 50,
        search: search || undefined,
      })
      if (res.success) {
        setNfe(res.data || [])
        setNfeTotal(res.pagination?.total || 0)
        setNfePage(page)
      }
    } catch {
      setToast({ message: 'Erro ao carregar NFe Bling', type: 'error' })
    } finally {
      setNfeLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadStatus()
    loadVendas()
    loadNfe()
  }, [loadStatus, loadVendas, loadNfe])

  // ─── Sync handlers ────────────────────────────────────────────
  const handleIncrementalSync = async () => {
    try {
      setSyncing(true)
      setSyncResult(null)
      const res = await blingService.sync({ tipo: 'all' })
      if (res.success && res.data) {
        setSyncResult(res.data)
        setToast({
          message: `Sincronizado: ${res.data.vendas_synced || 0} vendas, ${res.data.nfe_synced || 0} NFe`,
          type: 'success',
        })
        loadVendas(1, vendasSearch)
        loadNfe(1, nfeSearch)
        loadStatus()
      }
    } catch {
      setToast({ message: 'Erro na sincronização', type: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  const handleHistoricalImport = async () => {
    if (!importDataInicial) {
      setToast({ message: 'Informe a data inicial', type: 'error' })
      return
    }
    try {
      setSyncing(true)
      setSyncResult(null)
      const res = await blingService.sync({
        tipo: importTipo,
        dataInicial: importDataInicial,
        dataFinal: importDataFinal || undefined,
      })
      if (res.success && res.data) {
        setSyncResult(res.data)
        setToast({
          message: `Importação concluída: ${res.data.vendas_synced || 0} vendas, ${res.data.nfe_synced || 0} NFe`,
          type: 'success',
        })
        loadVendas(1, vendasSearch)
        loadNfe(1, nfeSearch)
        loadStatus()
      }
    } catch {
      setToast({ message: 'Erro na importação', type: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  // ─── Search handlers ──────────────────────────────────────────
  const handleVendasSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadVendas(1, vendasSearch)
  }

  const handleNfeSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadNfe(1, nfeSearch)
  }

  // ─── Column definitions: Vendas ───────────────────────────────
  const vendasColumns = useMemo<ColumnDef<BlingVenda>[]>(() => [
    {
      accessorKey: 'numero_pedido',
      header: ({ column }) => <SortableHeader column={column}>Pedido</SortableHeader>,
      cell: ({ row }) => (
        <div className="min-w-[120px]">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            #{row.original.numero_pedido}
          </div>
          {row.original.numero_pedido_loja && (
            <div className="text-xs text-gray-500">
              Loja: {row.original.numero_pedido_loja}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'data_pedido',
      header: ({ column }) => <SortableHeader column={column}>Data</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.data_pedido ? formatLocalDate(row.original.data_pedido) : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'contato_nome',
      header: ({ column }) => <SortableHeader column={column}>Cliente</SortableHeader>,
      cell: ({ row }) => (
        <div className="min-w-[150px]">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {row.original.contato_nome || '-'}
          </div>
          {row.original.contato_documento && (
            <div className="text-xs text-gray-500">{row.original.contato_documento}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'loja_nome',
      header: ({ column }) => <SortableHeader column={column}>Canal</SortableHeader>,
      cell: ({ row }) => {
        const canal = row.original.loja_nome || row.original.canal_venda
        return canal ? (
          <Badge variant="outline" className="text-xs">
            {canal}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        )
      },
    },
    {
      accessorKey: 'situacao_nome',
      header: ({ column }) => <SortableHeader column={column}>Situação</SortableHeader>,
      cell: ({ row }) => {
        const sitId = row.original.situacao_id || 0
        const color = VENDA_SITUACAO_COLORS[sitId] || 'bg-gray-100 text-gray-700'
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${color}`}>
            {row.original.situacao_nome || `ID ${sitId}`}
          </span>
        )
      },
    },
    {
      accessorKey: 'total_produtos',
      header: ({ column }) => <SortableHeader column={column}>Produtos</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {formatCurrency(row.original.total_produtos || 0)}
        </div>
      ),
    },
    {
      accessorKey: 'total_desconto',
      header: ({ column }) => <SortableHeader column={column}>Desconto</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-red-600">
          {row.original.total_desconto ? formatCurrency(row.original.total_desconto) : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'total_frete',
      header: ({ column }) => <SortableHeader column={column}>Frete</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.total_frete ? formatCurrency(row.original.total_frete) : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'valor_total',
      header: ({ column }) => <SortableHeader column={column}>Total</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm font-semibold text-green-600">
          {formatCurrency(row.original.valor_total)}
        </div>
      ),
    },
    {
      accessorKey: 'forma_pagamento',
      header: ({ column }) => <SortableHeader column={column}>Pagamento</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.forma_pagamento || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'vendedor_nome',
      header: ({ column }) => <SortableHeader column={column}>Vendedor</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.vendedor_nome || '-'}
        </div>
      ),
    },
    {
      id: 'intermediador',
      header: ({ column }) => <SortableHeader column={column}>Intermediador</SortableHeader>,
      accessorFn: (row) => row.intermediador_usuario || row.intermediador_cnpj || '',
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.intermediador_usuario || row.original.intermediador_cnpj || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'taxa_comissao',
      header: ({ column }) => <SortableHeader column={column}>Comissão</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.taxa_comissao != null ? `${row.original.taxa_comissao}%` : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'custo_frete_marketplace',
      header: ({ column }) => <SortableHeader column={column}>Frete MKT</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.custo_frete_marketplace
            ? formatCurrency(row.original.custo_frete_marketplace)
            : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'observacoes',
      header: ({ column }) => <SortableHeader column={column}>Obs</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-500 max-w-[200px] truncate" title={row.original.observacoes || ''}>
          {row.original.observacoes || '-'}
        </div>
      ),
    },
    {
      id: 'itens_count',
      header: 'Itens',
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.itens?.length || 0}
        </div>
      ),
    },
    {
      accessorKey: 'synced_at',
      header: ({ column }) => <SortableHeader column={column}>Sync</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-xs text-gray-400">
          {row.original.synced_at ? formatLocalDate(row.original.synced_at, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
        </div>
      ),
    },
  ], [])

  // ─── Column definitions: NFe ──────────────────────────────────
  const nfeColumns = useMemo<ColumnDef<BlingNfe>[]>(() => [
    {
      accessorKey: 'numero',
      header: ({ column }) => <SortableHeader column={column}>Número</SortableHeader>,
      cell: ({ row }) => (
        <div className="min-w-[80px]">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {row.original.numero || '-'}
          </div>
          {row.original.serie != null && (
            <div className="text-xs text-gray-500">Série: {row.original.serie}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'chave_acesso',
      header: ({ column }) => <SortableHeader column={column}>Chave</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-xs text-gray-500 max-w-[160px] truncate font-mono" title={row.original.chave_acesso || ''}>
          {row.original.chave_acesso || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'data_emissao',
      header: ({ column }) => <SortableHeader column={column}>Emissão</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.data_emissao ? formatLocalDate(row.original.data_emissao) : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'contato_nome',
      header: ({ column }) => <SortableHeader column={column}>Cliente</SortableHeader>,
      cell: ({ row }) => (
        <div className="min-w-[150px]">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {row.original.contato_nome || '-'}
          </div>
          {row.original.contato_documento && (
            <div className="text-xs text-gray-500">{row.original.contato_documento}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'tipo',
      header: ({ column }) => <SortableHeader column={column}>Tipo</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {NFE_TIPO_MAP[row.original.tipo] || `Tipo ${row.original.tipo}`}
        </Badge>
      ),
    },
    {
      accessorKey: 'situacao',
      header: ({ column }) => <SortableHeader column={column}>Situação</SortableHeader>,
      cell: ({ row }) => {
        const sit = NFE_SITUACAO_MAP[row.original.situacao]
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${sit?.color || 'bg-gray-100 text-gray-700'}`}>
            {sit?.label || row.original.situacao_nome || `ID ${row.original.situacao}`}
          </span>
        )
      },
    },
    {
      accessorKey: 'finalidade',
      header: ({ column }) => <SortableHeader column={column}>Finalidade</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.finalidade ? NFE_FINALIDADE_MAP[row.original.finalidade] || `${row.original.finalidade}` : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'valor_total',
      header: ({ column }) => <SortableHeader column={column}>Total</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm font-semibold text-green-600">
          {formatCurrency(row.original.valor_total)}
        </div>
      ),
    },
    {
      accessorKey: 'valor_frete',
      header: ({ column }) => <SortableHeader column={column}>Frete</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.valor_frete ? formatCurrency(row.original.valor_frete) : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'valor_icms',
      header: ({ column }) => <SortableHeader column={column}>ICMS</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-blue-600">
          {row.original.valor_icms ? formatCurrency(row.original.valor_icms) : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'valor_ipi',
      header: ({ column }) => <SortableHeader column={column}>IPI</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.valor_ipi ? formatCurrency(row.original.valor_ipi) : '-'}
        </div>
      ),
    },
    {
      id: 'links',
      header: 'Docs',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.danfe_url && (
            <a
              href={row.original.danfe_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
              title="DANFE"
            >
              <FileText className="h-4 w-4" />
            </a>
          )}
          {row.original.xml_url && (
            <a
              href={row.original.xml_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700"
              title="XML"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
          {row.original.pdf_url && (
            <a
              href={row.original.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:text-red-700"
              title="PDF"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {!row.original.danfe_url && !row.original.xml_url && !row.original.pdf_url && (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      id: 'itens_count',
      header: 'Itens',
      cell: ({ row }) => (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.itens?.length || 0}
        </div>
      ),
    },
    {
      accessorKey: 'synced_at',
      header: ({ column }) => <SortableHeader column={column}>Sync</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-xs text-gray-400">
          {row.original.synced_at ? formatLocalDate(row.original.synced_at, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
        </div>
      ),
    },
  ], [])

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bling ERP
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Integração com dados do Bling - vendas, notas fiscais e configuração
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <Badge
              variant={status.connected ? 'default' : 'destructive'}
              className={status.connected ? 'bg-green-100 text-green-700 border-green-200' : ''}
            >
              {status.connected ? (
                <><Wifi className="h-3 w-3 mr-1" /> Conectado</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> Desconectado</>
              )}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleIncrementalSync}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="vendas" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Vendas</span>
            {vendasTotal > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                {vendasTotal}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="nfe" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">NFe</span>
            {nfeTotal > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                {nfeTotal}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuração</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB: VENDAS ═══ */}
        <TabsContent value="vendas" className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Total Vendas</div>
                <div className="text-2xl font-bold">{vendasTotal}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Valor Total</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Última Sync</div>
                <div className="text-sm font-medium">
                  {status?.last_sync_vendas
                    ? formatLocalDate(status.last_sync_vendas, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : 'Nunca'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Canais</div>
                <div className="text-sm font-medium">
                  {Array.from(new Set(vendas.map(v => v.loja_nome).filter(Boolean))).length || 0} canais
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <form onSubmit={handleVendasSearch} className="flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por cliente, nº pedido, documento..."
                value={vendasSearch}
                onChange={(e) => setVendasSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline" disabled={vendasLoading}>
              {vendasLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </Button>
            {vendasSearch && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setVendasSearch(''); loadVendas(1, '') }}
              >
                Limpar
              </Button>
            )}
          </form>

          {/* Table */}
          <DataTable
            columns={vendasColumns}
            data={vendas}
            tableId="bling-vendas"
            enableColumnResizing={true}
            enableSorting={true}
            enableColumnVisibility={true}
            enableColumnReordering={true}
            pageSize={50}
            mobileVisibleColumns={['numero_pedido', 'contato_nome', 'valor_total', 'situacao_nome']}
            initialColumnVisibility={{
              intermediador: false,
              taxa_comissao: false,
              custo_frete_marketplace: false,
              observacoes: false,
              itens_count: false,
              synced_at: false,
            }}
          />

          {/* Pagination info */}
          {vendasTotal > 50 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                Mostrando {((vendasPage - 1) * 50) + 1} a {Math.min(vendasPage * 50, vendasTotal)} de {vendasTotal}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={vendasPage <= 1 || vendasLoading}
                  onClick={() => loadVendas(vendasPage - 1, vendasSearch)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={vendasPage * 50 >= vendasTotal || vendasLoading}
                  onClick={() => loadVendas(vendasPage + 1, vendasSearch)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB: NFE ═══ */}
        <TabsContent value="nfe" className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Total NFe</div>
                <div className="text-2xl font-bold">{nfeTotal}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Valor Total</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(nfe.reduce((sum, n) => sum + (n.valor_total || 0), 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Última Sync</div>
                <div className="text-sm font-medium">
                  {status?.last_sync_nfe
                    ? formatLocalDate(status.last_sync_nfe, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : 'Nunca'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Emitidas</div>
                <div className="text-2xl font-bold text-green-600">
                  {nfe.filter(n => n.situacao === 2).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <form onSubmit={handleNfeSearch} className="flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por cliente, chave de acesso, documento..."
                value={nfeSearch}
                onChange={(e) => setNfeSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline" disabled={nfeLoading}>
              {nfeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </Button>
            {nfeSearch && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setNfeSearch(''); loadNfe(1, '') }}
              >
                Limpar
              </Button>
            )}
          </form>

          {/* Table */}
          <DataTable
            columns={nfeColumns}
            data={nfe}
            tableId="bling-nfe"
            enableColumnResizing={true}
            enableSorting={true}
            enableColumnVisibility={true}
            enableColumnReordering={true}
            pageSize={50}
            mobileVisibleColumns={['numero', 'contato_nome', 'valor_total', 'situacao']}
            initialColumnVisibility={{
              chave_acesso: false,
              finalidade: false,
              valor_frete: false,
              valor_icms: false,
              valor_ipi: false,
              itens_count: false,
              synced_at: false,
            }}
          />

          {/* Pagination info */}
          {nfeTotal > 50 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                Mostrando {((nfePage - 1) * 50) + 1} a {Math.min(nfePage * 50, nfeTotal)} de {nfeTotal}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={nfePage <= 1 || nfeLoading}
                  onClick={() => loadNfe(nfePage - 1, nfeSearch)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={nfePage * 50 >= nfeTotal || nfeLoading}
                  onClick={() => loadNfe(nfePage + 1, nfeSearch)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB: CONFIG ═══ */}
        <TabsContent value="config" className="space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Status da Conexão
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              ) : status ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    {status.connected ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="text-sm font-medium">Conexão</div>
                      <div className="text-xs text-gray-500">
                        {status.connected ? 'Conectado ao Bling' : 'Desconectado'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    {status.token_valid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <div className="text-sm font-medium">Token</div>
                      <div className="text-xs text-gray-500">
                        {status.token_valid ? 'Válido' : 'Expirado ou inválido'}
                        {status.token_expires_at && (
                          <span className="block">
                            Expira: {formatLocalDate(status.token_expires_at, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    {status.api_reachable ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="text-sm font-medium">API Bling</div>
                      <div className="text-xs text-gray-500">
                        {status.api_reachable ? 'Acessível' : status.api_error || 'Inacessível'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">Não foi possível obter o status</div>
              )}
            </CardContent>
          </Card>

          {/* Sync Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Dados Sincronizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-lg border">
                  <ShoppingCart className="h-8 w-8 text-amber-500" />
                  <div>
                    <div className="text-2xl font-bold">{status?.total_vendas_sync || 0}</div>
                    <div className="text-sm text-gray-500">Vendas sincronizadas</div>
                    {status?.last_sync_vendas && (
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        Última: {formatLocalDate(status.last_sync_vendas, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg border">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{status?.total_nfe_sync || 0}</div>
                    <div className="text-sm text-gray-500">NFe sincronizadas</div>
                    {status?.last_sync_nfe && (
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        Última: {formatLocalDate(status.last_sync_nfe, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sync Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sincronização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Incremental sync */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div>
                  <div className="font-medium">Sincronização Incremental</div>
                  <div className="text-sm text-gray-500">
                    Busca apenas alterações desde a última sincronização
                  </div>
                </div>
                <Button onClick={handleIncrementalSync} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Agora
                </Button>
              </div>

              {/* Historical import */}
              <div className="p-4 rounded-lg border space-y-4">
                <div>
                  <div className="font-medium">Importação de Histórico</div>
                  <div className="text-sm text-gray-500">
                    Importar dados de um período específico
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                    <select
                      value={importTipo}
                      onChange={(e) => setImportTipo(e.target.value as 'vendas' | 'nfe' | 'all')}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="all">Tudo</option>
                      <option value="vendas">Vendas</option>
                      <option value="nfe">NFe</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Data Inicial</label>
                    <Input
                      type="date"
                      value={importDataInicial}
                      onChange={(e) => setImportDataInicial(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Data Final</label>
                    <Input
                      type="date"
                      value={importDataFinal}
                      onChange={(e) => setImportDataFinal(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleHistoricalImport}
                      disabled={syncing || !importDataInicial}
                      className="w-full"
                    >
                      {syncing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Calendar className="h-4 w-4 mr-2" />
                      )}
                      Importar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sync result */}
              {syncResult && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Resultado da Sincronização
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    {syncResult.vendas_synced != null && <span>Vendas: {syncResult.vendas_synced}</span>}
                    {syncResult.vendas_synced != null && syncResult.nfe_synced != null && <span> | </span>}
                    {syncResult.nfe_synced != null && <span>NFe: {syncResult.nfe_synced}</span>}
                  </div>
                  {syncResult.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      <div className="font-medium">Erros ({syncResult.errors.length}):</div>
                      {syncResult.errors.slice(0, 5).map((err, i) => (
                        <div key={i}>- {err}</div>
                      ))}
                      {syncResult.errors.length > 5 && (
                        <div>... e mais {syncResult.errors.length - 5} erros</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disconnect */}
          {status?.connected && (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="font-medium text-red-600">Desconectar Bling</div>
                  <div className="text-sm text-gray-500">
                    Remove os tokens de acesso. Os dados já sincronizados serão mantidos.
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('Deseja realmente desconectar o Bling?')) return
                    try {
                      // call disconnect endpoint
                      const res = await fetch('/api/bling/disconnect', { method: 'POST' })
                      if (res.ok) {
                        setToast({ message: 'Bling desconectado', type: 'info' })
                        loadStatus()
                      }
                    } catch {
                      setToast({ message: 'Erro ao desconectar', type: 'error' })
                    }
                  }}
                >
                  <Unplug className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
