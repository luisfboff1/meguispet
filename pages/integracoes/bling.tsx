import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
  Package,
  MapPin,
  Truck,
  CreditCard,
  User,
  MessageSquare,
  Building2,
} from 'lucide-react'
import { blingService } from '@/services/blingService'
import { formatCurrency, formatLocalDate } from '@/lib/utils'
import Toast from '@/components/ui/Toast'
import { BlingReferenciasTab } from '@/components/bling/BlingReferenciasTab'
import type {
  BlingVenda,
  BlingVendaItem,
  BlingNfe,
  BlingNfeItem,
  BlingStatus,
  BlingSyncResult,
} from '@/types'

// ─── Marketplace detection (frontend fallback) ───────────────────
const MARKETPLACE_BY_CNPJ: Record<string, string> = {
  '35635824000112': 'Shopee', '05570714000159': 'Shopee', '57981711000101': 'Shopee',
  '03007331000181': 'Amazon', '15436940000103': 'Amazon',
  '10573521000191': 'Mercado Livre', '02757556000148': 'Mercado Livre', '33014556000196': 'Mercado Livre',
  '09339936000116': 'Magazine Luiza',
  '22567970000130': 'Americanas',
  '00776574000156': 'Casas Bahia/Via',
  '14380200000121': 'AliExpress',
  '09346601000125': 'B2W/Submarino',
}

function detectMarketplaceFrontend(venda: BlingVenda): string | null {
  if (venda.loja_nome) return venda.loja_nome
  if (venda.canal_venda) return venda.canal_venda
  const cnpj = venda.intermediador_cnpj?.replace(/\D/g, '')
  if (cnpj && MARKETPLACE_BY_CNPJ[cnpj]) return MARKETPLACE_BY_CNPJ[cnpj]
  const numLoja = venda.numero_pedido_loja || ''
  if (/^\d{3}-\d{7}-\d{7}$/.test(numLoja)) return 'Amazon'
  if (/^26\d{4}[A-Z0-9]+$/i.test(numLoja)) return 'Shopee'
  if (/^\d{10,}$/.test(numLoja)) return 'Mercado Livre'
  return null
}

const MARKETPLACE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Amazon':         { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Shopee':         { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  'Mercado Livre':  { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  'Magazine Luiza': { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  'Americanas':     { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200' },
  'AliExpress':     { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
}

function MarketplaceBadge({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-gray-400 text-sm">Venda direta</span>
  const style = MARKETPLACE_STYLES[name] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${style.bg} ${style.text} ${style.border}`}>
      {name}
    </span>
  )
}

// ─── Situação helpers ─────────────────────────────────────────────
const VENDA_SITUACAO_MAP: Record<number, { nome: string; color: string }> = {
  6:  { nome: 'Em aberto',      color: 'bg-blue-100 text-blue-700' },
  9:  { nome: 'Atendido',       color: 'bg-green-100 text-green-700' },
  12: { nome: 'Cancelado',      color: 'bg-red-100 text-red-700' },
  15: { nome: 'Em andamento',   color: 'bg-yellow-100 text-yellow-700' },
  18: { nome: 'Verificado',     color: 'bg-purple-100 text-purple-700' },
  21: { nome: 'Venda agenciada', color: 'bg-orange-100 text-orange-700' },
  24: { nome: 'Em digitação',   color: 'bg-emerald-100 text-emerald-700' },
}

function getVendaSituacao(venda: BlingVenda): { nome: string; color: string } {
  if (venda.situacao_nome && !/^\d+$/.test(venda.situacao_nome)) {
    const sitId = venda.situacao_id || 0
    return {
      nome: venda.situacao_nome,
      color: VENDA_SITUACAO_MAP[sitId]?.color || 'bg-gray-100 text-gray-700',
    }
  }
  const sitId = venda.situacao_id || 0
  if (VENDA_SITUACAO_MAP[sitId]) return VENDA_SITUACAO_MAP[sitId]
  return { nome: `ID ${sitId}`, color: 'bg-gray-100 text-gray-700' }
}

// ─── Item helpers ─────────────────────────────────────────────────
function getVendaItens(venda: BlingVenda): BlingVendaItem[] {
  if (venda.itens && venda.itens.length > 0) return venda.itens
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = venda as any
  if (raw.bling_vendas_itens && raw.bling_vendas_itens.length > 0) return raw.bling_vendas_itens
  return []
}

function getNfeItens(nfe: BlingNfe): BlingNfeItem[] {
  if (nfe.itens && nfe.itens.length > 0) return nfe.itens
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = nfe as any
  if (raw.bling_nfe_itens && raw.bling_nfe_itens.length > 0) return raw.bling_nfe_itens
  return []
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

const NFE_TIPO_MAP: Record<number, string> = { 0: 'Entrada', 1: 'Saída' }
const NFE_FINALIDADE_MAP: Record<number, string> = { 1: 'Normal', 2: 'Complementar', 3: 'Ajuste', 4: 'Devolução' }

// ─── Detail field helper ──────────────────────────────────────────
function DetailField({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className={`text-sm bg-gray-50 dark:bg-gray-800 rounded px-3 py-2 min-h-[36px] flex items-center ${mono ? 'font-mono text-xs' : ''}`}>
        {value != null && value !== '' ? String(value) : <span className="text-gray-400">-</span>}
      </div>
    </div>
  )
}

function DetailSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 border-b pb-2">
        <Icon className="h-4 w-4 text-gray-500" />
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Venda Detail Modal ───────────────────────────────────────────
function VendaDetailDialog({
  venda,
  open,
  onClose,
}: {
  venda: BlingVenda | null
  open: boolean
  onClose: () => void
}) {
  if (!venda) return null
  const itens = getVendaItens(venda)
  const sit = getVendaSituacao(venda)
  const marketplace = detectMarketplaceFrontend(venda)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (venda.raw_data || {}) as Record<string, any>
  const transporte = raw.transporte || venda.transporte || {}
  const endereco = raw.transporte?.contato || venda.endereco_entrega || {}

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Pedido de Venda - {venda.numero_pedido}
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${sit.color}`}>
              {sit.nome}
            </span>
          </DialogTitle>
          <DialogDescription>
            Detalhes completos do pedido importado do Bling
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* ── Dados do Cliente ── */}
          <DetailSection title="Dados do cliente" icon={User}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailField label="Cliente" value={venda.contato_nome} />
              <DetailField label="Documento" value={venda.contato_documento} />
              <DetailField label="Vendedor" value={venda.vendedor_nome} />
              <DetailField label="Loja" value={venda.loja_nome || marketplace || 'Venda direta'} />
            </div>
          </DetailSection>

          {/* ── Itens do Pedido ── */}
          <DetailSection title="Itens do pedido de venda" icon={Package}>
            {itens.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">#</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Descrição</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Código</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">Qtd</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">Preço un.</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">Desc.</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {itens.map((item, i) => (
                      <tr key={item.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100 max-w-[300px]">
                          {item.descricao}
                        </td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">{item.codigo_produto || '-'}</td>
                        <td className="px-3 py-2 text-right">{item.quantidade}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.valor_unitario)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{item.valor_desconto ? formatCurrency(item.valor_desconto) : '-'}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                Nenhum item encontrado
              </div>
            )}
          </DetailSection>

          {/* ── Totais ── */}
          <DetailSection title="Totais" icon={ShoppingCart}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailField label="Nº de itens" value={itens.length} />
              <DetailField label="Soma das quantidades" value={itens.reduce((s, it) => s + it.quantidade, 0)} />
              <DetailField label="Total dos itens" value={formatCurrency(venda.total_produtos)} />
              <DetailField label="Desconto" value={venda.total_desconto ? formatCurrency(venda.total_desconto) : '0,00'} />
              <DetailField label="Frete" value={venda.total_frete ? formatCurrency(venda.total_frete) : '0,00'} />
              <DetailField label="Outras despesas" value={venda.total_outras_despesas ? formatCurrency(venda.total_outras_despesas) : '0,00'} />
              <DetailField label="Taxa comissão" value={venda.taxa_comissao != null ? `${venda.taxa_comissao}%` : '-'} />
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-medium">Total da venda</div>
                <div className="text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-3 py-2 font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(venda.valor_total)}
                </div>
              </div>
            </div>
          </DetailSection>

          {/* ── Detalhes da Venda ── */}
          <DetailSection title="Detalhes da venda" icon={FileText}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailField label="Número do pedido" value={venda.numero_pedido} />
              <DetailField label="Data da venda" value={venda.data_pedido ? formatLocalDate(venda.data_pedido) : undefined} />
              <DetailField label="Data saída" value={venda.data_saida ? formatLocalDate(venda.data_saida) : undefined} />
              <DetailField label="Situação" value={sit.nome} />
              <DetailField label="Número loja virtual" value={venda.numero_pedido_loja} mono />
              <DetailField label="Origem canal venda" value={marketplace || 'Venda direta'} />
              <DetailField label="Tipo integração" value={marketplace ? 'Marketplace' : 'Venda direta'} />
              <DetailField label="ID Bling" value={venda.bling_id} />
            </div>
          </DetailSection>

          {/* ── Pagamento ── */}
          <DetailSection title="Pagamento" icon={CreditCard}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DetailField label="Forma de pagamento" value={venda.forma_pagamento} />
              <DetailField label="Custo frete marketplace" value={venda.custo_frete_marketplace ? formatCurrency(venda.custo_frete_marketplace) : undefined} />
            </div>
          </DetailSection>

          {/* ── Transportador ── */}
          <DetailSection title="Transportador" icon={Truck}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailField label="Frete por conta" value={transporte.fretePorConta != null ? (transporte.fretePorConta === 0 ? '0 - Remetente (CIF)' : transporte.fretePorConta === 1 ? '1 - Destinatário (FOB)' : String(transporte.fretePorConta)) : undefined} />
              <DetailField label="Quantidade volumes" value={transporte.volumes ?? transporte.quantidadeVolumes} />
              <DetailField label="Peso bruto" value={transporte.pesoBruto} />
              <DetailField label="Frete" value={venda.total_frete ? formatCurrency(venda.total_frete) : '0,00'} />
            </div>
          </DetailSection>

          {/* ── Endereço de Entrega ── */}
          <DetailSection title="Endereço de entrega" icon={MapPin}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailField label="Nome" value={endereco.nome || venda.contato_nome} />
              <DetailField label="CEP" value={endereco.cep || (venda.endereco_entrega as Record<string, unknown>)?.cep as string} />
              <DetailField label="UF" value={endereco.uf || (venda.endereco_entrega as Record<string, unknown>)?.uf as string} />
              <DetailField label="Cidade" value={endereco.municipio || (venda.endereco_entrega as Record<string, unknown>)?.cidade as string} />
              <DetailField label="Bairro" value={endereco.bairro || (venda.endereco_entrega as Record<string, unknown>)?.bairro as string} />
              <DetailField label="Endereço" value={endereco.endereco || (venda.endereco_entrega as Record<string, unknown>)?.endereco as string} />
              <DetailField label="Número" value={endereco.numero || (venda.endereco_entrega as Record<string, unknown>)?.numero as string} />
              <DetailField label="Complemento" value={endereco.complemento || (venda.endereco_entrega as Record<string, unknown>)?.complemento as string} />
            </div>
          </DetailSection>

          {/* ── Dados Adicionais ── */}
          {(venda.observacoes || venda.observacoes_internas) && (
            <DetailSection title="Dados adicionais" icon={MessageSquare}>
              <div className="space-y-3">
                {venda.observacoes && (
                  <div>
                    <div className="text-xs text-gray-500 font-medium mb-1">Observações</div>
                    <div className="text-sm bg-gray-50 dark:bg-gray-800 rounded px-3 py-2 whitespace-pre-wrap">
                      {venda.observacoes}
                    </div>
                  </div>
                )}
                {venda.observacoes_internas && (
                  <div>
                    <div className="text-xs text-gray-500 font-medium mb-1">Observações internas</div>
                    <div className="text-sm bg-gray-50 dark:bg-gray-800 rounded px-3 py-2 whitespace-pre-wrap">
                      {venda.observacoes_internas}
                    </div>
                  </div>
                )}
              </div>
            </DetailSection>
          )}

          {/* ── Intermediador ── */}
          {(venda.intermediador_cnpj || venda.intermediador_usuario) && (
            <DetailSection title="Intermediador" icon={Building2}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <DetailField label="CNPJ" value={venda.intermediador_cnpj} mono />
                <DetailField label="Usuário" value={venda.intermediador_usuario} />
                <DetailField label="Marketplace" value={marketplace} />
              </div>
            </DetailSection>
          )}

          {/* ── Sync info ── */}
          <div className="text-xs text-gray-400 border-t pt-3 flex justify-between">
            <span>Sincronizado em: {venda.synced_at ? formatLocalDate(venda.synced_at, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            <span>Bling ID: {venda.bling_id}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── NFe Detail Modal ─────────────────────────────────────────────
function NfeDetailDialog({
  nfe,
  open,
  onClose,
}: {
  nfe: BlingNfe | null
  open: boolean
  onClose: () => void
}) {
  if (!nfe) return null
  const itens = getNfeItens(nfe)
  const sit = NFE_SITUACAO_MAP[nfe.situacao]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            NFe {nfe.numero ? `Nº ${nfe.numero}` : `ID ${nfe.bling_id}`}
            {nfe.serie != null && <span className="text-sm text-gray-500 font-normal">Série {nfe.serie}</span>}
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${sit?.color || 'bg-gray-100 text-gray-700'}`}>
              {sit?.label || nfe.situacao_nome || `ID ${nfe.situacao}`}
            </span>
          </DialogTitle>
          <DialogDescription>
            Detalhes completos da nota fiscal importada do Bling
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* ── Dados Gerais ── */}
          <DetailSection title="Dados gerais" icon={FileText}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailField label="Número" value={nfe.numero} />
              <DetailField label="Série" value={nfe.serie} />
              <DetailField label="Tipo" value={NFE_TIPO_MAP[nfe.tipo] || `Tipo ${nfe.tipo}`} />
              <DetailField label="Finalidade" value={nfe.finalidade ? NFE_FINALIDADE_MAP[nfe.finalidade] || String(nfe.finalidade) : undefined} />
              <DetailField label="Data emissão" value={nfe.data_emissao ? formatLocalDate(nfe.data_emissao) : undefined} />
              <DetailField label="Data operação" value={nfe.data_operacao ? formatLocalDate(nfe.data_operacao) : undefined} />
              <div className="col-span-2">
                <DetailField label="Chave de acesso" value={nfe.chave_acesso} mono />
              </div>
            </div>
          </DetailSection>

          {/* ── Cliente ── */}
          <DetailSection title="Dados do cliente" icon={User}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <DetailField label="Cliente" value={nfe.contato_nome} />
              <DetailField label="Documento" value={nfe.contato_documento} />
              <DetailField label="ID Contato Bling" value={nfe.bling_contato_id} />
            </div>
          </DetailSection>

          {/* ── Itens da NFe ── */}
          <DetailSection title="Itens da NFe" icon={Package}>
            {itens.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">#</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Descrição</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Código</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">NCM</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">CFOP</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">Qtd</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">Vl. Unit.</th>
                      <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {itens.map((item, i) => (
                      <tr key={item.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100 max-w-[250px]">{item.descricao}</td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">{item.codigo || '-'}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{item.ncm || '-'}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{item.cfop || '-'}</td>
                        <td className="px-3 py-2 text-right">{item.quantidade}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.valor_unitario)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                Nenhum item encontrado
              </div>
            )}
          </DetailSection>

          {/* ── Valores ── */}
          <DetailSection title="Valores" icon={CreditCard}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DetailField label="Valor produtos" value={nfe.valor_produtos ? formatCurrency(nfe.valor_produtos) : undefined} />
              <DetailField label="Valor frete" value={nfe.valor_frete ? formatCurrency(nfe.valor_frete) : '0,00'} />
              <DetailField label="ICMS" value={nfe.valor_icms ? formatCurrency(nfe.valor_icms) : '0,00'} />
              <DetailField label="IPI" value={nfe.valor_ipi ? formatCurrency(nfe.valor_ipi) : '0,00'} />
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-medium">Valor total</div>
                <div className="text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-3 py-2 font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(nfe.valor_total)}
                </div>
              </div>
            </div>
          </DetailSection>

          {/* ── Documentos ── */}
          {(nfe.danfe_url || nfe.xml_url || nfe.pdf_url) && (
            <DetailSection title="Documentos" icon={Download}>
              <div className="flex flex-wrap gap-3">
                {nfe.danfe_url && (
                  <a href={nfe.danfe_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                    <FileText className="h-4 w-4" /> DANFE
                  </a>
                )}
                {nfe.xml_url && (
                  <a href={nfe.xml_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium text-green-600 hover:bg-green-50 transition-colors">
                    <Download className="h-4 w-4" /> XML
                  </a>
                )}
                {nfe.pdf_url && (
                  <a href={nfe.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                    <ExternalLink className="h-4 w-4" /> PDF
                  </a>
                )}
              </div>
            </DetailSection>
          )}

          {/* ── Sync info ── */}
          <div className="text-xs text-gray-400 border-t pt-3 flex justify-between">
            <span>Sincronizado em: {nfe.synced_at ? formatLocalDate(nfe.synced_at, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            <span>Bling ID: {nfe.bling_id}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
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
  const [selectedVenda, setSelectedVenda] = useState<BlingVenda | null>(null)

  // NFe
  const [nfe, setNfe] = useState<BlingNfe[]>([])
  const [nfeLoading, setNfeLoading] = useState(false)
  const [nfeTotal, setNfeTotal] = useState(0)
  const [nfePage, setNfePage] = useState(1)
  const [nfeSearch, setNfeSearch] = useState('')
  const [selectedNfe, setSelectedNfe] = useState<BlingNfe | null>(null)

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

  // ─── Column definitions: Vendas (simplified) ─────────────────
  const vendasColumns = useMemo<ColumnDef<BlingVenda>[]>(() => [
    {
      accessorKey: 'numero_pedido',
      header: ({ column }) => <SortableHeader column={column}>Pedido</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          #{row.original.numero_pedido}
        </span>
      ),
    },
    {
      id: 'origem',
      header: ({ column }) => <SortableHeader column={column}>Origem</SortableHeader>,
      accessorFn: (row) => detectMarketplaceFrontend(row) || 'Venda direta',
      cell: ({ row }) => <MarketplaceBadge name={detectMarketplaceFrontend(row.original)} />,
    },
    {
      accessorKey: 'data_pedido',
      header: ({ column }) => <SortableHeader column={column}>Data</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.data_pedido ? formatLocalDate(row.original.data_pedido) : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'contato_nome',
      header: ({ column }) => <SortableHeader column={column}>Cliente</SortableHeader>,
      cell: ({ row }) => (
        <div className="min-w-[140px]">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
            {row.original.contato_nome || '-'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'situacao_nome',
      header: ({ column }) => <SortableHeader column={column}>Situação</SortableHeader>,
      cell: ({ row }) => {
        const sit = getVendaSituacao(row.original)
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${sit.color}`}>
            {sit.nome}
          </span>
        )
      },
    },
    {
      id: 'produtos',
      header: 'Produtos',
      cell: ({ row }) => {
        const itens = getVendaItens(row.original)
        if (itens.length === 0) return <span className="text-gray-400 text-sm">-</span>
        const first = itens[0]
        return (
          <div className="min-w-[150px] max-w-[250px]">
            <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
              {first.descricao}
            </div>
            {itens.length > 1 && (
              <div className="text-xs text-gray-500">+{itens.length - 1} {itens.length === 2 ? 'item' : 'itens'}</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'valor_total',
      header: ({ column }) => <SortableHeader column={column}>Total</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-green-600">
          {formatCurrency(row.original.valor_total)}
        </span>
      ),
    },
  ], [])

  // ─── Column definitions: NFe (simplified) ─────────────────────
  const nfeColumns = useMemo<ColumnDef<BlingNfe>[]>(() => [
    {
      accessorKey: 'numero',
      header: ({ column }) => <SortableHeader column={column}>Número</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {row.original.numero || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'data_emissao',
      header: ({ column }) => <SortableHeader column={column}>Emissão</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.data_emissao ? formatLocalDate(row.original.data_emissao) : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'contato_nome',
      header: ({ column }) => <SortableHeader column={column}>Cliente</SortableHeader>,
      cell: ({ row }) => (
        <div className="min-w-[140px]">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
            {row.original.contato_nome || '-'}
          </div>
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
      id: 'itens',
      header: 'Itens',
      cell: ({ row }) => {
        const itens = getNfeItens(row.original)
        if (itens.length === 0) return <span className="text-gray-400 text-sm">-</span>
        return (
          <div className="min-w-[120px] max-w-[200px]">
            <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
              {itens[0].descricao}
            </div>
            {itens.length > 1 && (
              <div className="text-xs text-gray-500">+{itens.length - 1} {itens.length === 2 ? 'item' : 'itens'}</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'valor_total',
      header: ({ column }) => <SortableHeader column={column}>Total</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-green-600">
          {formatCurrency(row.original.valor_total)}
        </span>
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

      {/* Detail Modals */}
      <VendaDetailDialog
        venda={selectedVenda}
        open={!!selectedVenda}
        onClose={() => setSelectedVenda(null)}
      />
      <NfeDetailDialog
        nfe={selectedNfe}
        open={!!selectedNfe}
        onClose={() => setSelectedNfe(null)}
      />

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
          <TabsTrigger value="referencias" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Referências</span>
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
                  {Array.from(new Set(vendas.map(v => detectMarketplaceFrontend(v)).filter(Boolean))).length || 0} canais
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

          {/* Hint */}
          <div className="text-xs text-gray-400">
            Clique em uma linha para ver todos os detalhes do pedido
          </div>

          {/* Table */}
          <DataTable
            columns={vendasColumns}
            data={vendas}
            tableId="bling-vendas"
            enableColumnResizing={true}
            enableSorting={true}
            enableColumnVisibility={false}
            enableColumnReordering={false}
            pageSize={50}
            mobileVisibleColumns={['numero_pedido', 'contato_nome', 'valor_total']}
            onRowClick={(venda) => setSelectedVenda(venda)}
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

          {/* Hint */}
          <div className="text-xs text-gray-400">
            Clique em uma linha para ver todos os detalhes da NFe
          </div>

          {/* Table */}
          <DataTable
            columns={nfeColumns}
            data={nfe}
            tableId="bling-nfe"
            enableColumnResizing={true}
            enableSorting={true}
            enableColumnVisibility={false}
            enableColumnReordering={false}
            pageSize={50}
            mobileVisibleColumns={['numero', 'contato_nome', 'valor_total']}
            onRowClick={(nfe) => setSelectedNfe(nfe)}
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

        {/* ═══ TAB: REFERÊNCIAS ═══ */}
        <TabsContent value="referencias" className="space-y-4">
          <BlingReferenciasTab />
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
