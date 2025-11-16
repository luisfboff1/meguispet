import useSWR from 'swr'
import type { VendedorMetricas, VendedorVendasResponse } from '@/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Erro ao buscar dados')
  }
  const data = await res.json()
  return data.data
}

interface UseVendedorVendasFilters {
  periodo: '7d' | '30d' | '90d'
  status?: string
  search?: string
  page?: number
  limit?: number
}

export function useVendedorMetricas(
  vendedorId: number,
  periodo: '7d' | '30d' | '90d'
) {
  const { data, error, isLoading, mutate } = useSWR<VendedorMetricas>(
    `/api/vendedores/${vendedorId}/metricas?periodo=${periodo}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    data,
    error,
    isLoading,
    mutate,
  }
}

export function useVendedorVendas(
  vendedorId: number,
  filters: UseVendedorVendasFilters
) {
  const queryParams = new URLSearchParams({
    periodo: filters.periodo,
    page: String(filters.page || 1),
    limit: String(filters.limit || 10),
  })

  if (filters.status && filters.status !== '') {
    queryParams.append('status', filters.status)
  }

  if (filters.search && filters.search !== '') {
    queryParams.append('search', filters.search)
  }

  const { data, error, isLoading, mutate } = useSWR<VendedorVendasResponse>(
    `/api/vendedores/${vendedorId}/vendas?${queryParams.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    data,
    error,
    isLoading,
    mutate,
  }
}
