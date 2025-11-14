import axios from 'axios'
import type {
  ReportType,
  ReportFormat,
  ReportConfiguration,
  ReportGenerateResponse,
  ReportPreviewData,
  SavedReport,
  ReportTemplate,
  VendasReportData,
  ProdutosReportData,
  ClientesReportData,
  FinanceiroReportData,
} from '@/types/reports'
import type { ApiResponse, PaginatedResponse } from '@/types'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '')

const api = axios.create({
  baseURL: `${API_BASE_URL}/relatorios`,
  timeout: 60000, // 60 seconds for report generation
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptors para logging em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(config => {
    console.log('[reportsService] request', config.method?.toUpperCase(), config.url)
    return config
  })

  api.interceptors.response.use(
    response => {
      console.log('[reportsService] response', response.status, response.config.url)
      return response
    },
    error => {
      console.error('[reportsService] error', error.response?.status, error.config?.url, error.message)
      return Promise.reject(error)
    }
  )
}

// 📊 GERAÇÃO DE RELATÓRIOS

export const reportsService = {
  // Preview de dados antes de gerar relatório completo
  preview: async (
    tipo: ReportType,
    config: ReportConfiguration
  ): Promise<ReportPreviewData> => {
    const response = await api.post<ApiResponse<ReportPreviewData>>(
      `/${tipo}/preview`,
      config
    )

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Erro ao gerar preview do relatório')
    }

    return response.data.data
  },

  // Gerar relatório completo
  generate: async (
    tipo: ReportType,
    config: ReportConfiguration,
    formato: ReportFormat = 'web',
    salvarRelatorio = false
  ): Promise<ReportGenerateResponse> => {
    const response = await api.post<ReportGenerateResponse>(
      `/${tipo}/generate`,
      {
        ...config,
        formato,
        salvar: salvarRelatorio,
      }
    )

    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro ao gerar relatório')
    }

    return response.data
  },

  // Exportar relatório em formato específico
  export: async (
    tipo: ReportType,
    config: ReportConfiguration,
    formato: 'pdf' | 'excel' | 'csv'
  ): Promise<Blob> => {
    const response = await api.post(
      `/${tipo}/export`,
      {
        ...config,
        formato,
      },
      {
        responseType: 'blob',
      }
    )

    return response.data
  },

  // 📁 RELATÓRIOS SALVOS

  savedReports: {
    // Listar relatórios salvos
    list: async (
      page = 1,
      limit = 10,
      tipo?: ReportType
    ): Promise<PaginatedResponse<SavedReport>> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (tipo) {
        params.append('tipo', tipo)
      }

      const response = await api.get<PaginatedResponse<SavedReport>>(
        `/saved?${params.toString()}`
      )

      return response.data
    },

    // Buscar relatório salvo por ID
    getById: async (id: number): Promise<SavedReport> => {
      const response = await api.get<ApiResponse<SavedReport>>(`/saved/${id}`)

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Relatório não encontrado')
      }

      return response.data.data
    },

    // Deletar relatório salvo
    delete: async (id: number): Promise<void> => {
      const response = await api.delete<ApiResponse<void>>(`/saved/${id}`)

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao deletar relatório')
      }
    },
  },

  // 📋 TEMPLATES

  templates: {
    // Listar templates
    list: async (tipo?: ReportType, publicosApenas = false): Promise<ReportTemplate[]> => {
      const params = new URLSearchParams()

      if (tipo) {
        params.append('tipo', tipo)
      }

      if (publicosApenas) {
        params.append('publico', 'true')
      }

      const response = await api.get<ApiResponse<ReportTemplate[]>>(
        `/templates?${params.toString()}`
      )

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Erro ao listar templates')
      }

      return response.data.data
    },

    // Buscar template por ID
    getById: async (id: number): Promise<ReportTemplate> => {
      const response = await api.get<ApiResponse<ReportTemplate>>(`/templates/${id}`)

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Template não encontrado')
      }

      return response.data.data
    },

    // Salvar novo template
    save: async (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> => {
      const response = await api.post<ApiResponse<ReportTemplate>>('/templates/save', template)

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Erro ao salvar template')
      }

      return response.data.data
    },

    // Deletar template
    delete: async (id: number): Promise<void> => {
      const response = await api.delete<ApiResponse<void>>(`/templates/${id}`)

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erro ao deletar template')
      }
    },
  },

  // 📊 DADOS ESPECÍFICOS POR TIPO (para preview/visualização)

  vendas: {
    getData: async (config: ReportConfiguration): Promise<VendasReportData> => {
      const preview = await reportsService.preview('vendas', config)
      return preview.dados as unknown as VendasReportData
    },
  },

  produtos: {
    getData: async (config: ReportConfiguration): Promise<ProdutosReportData> => {
      const preview = await reportsService.preview('produtos', config)
      return preview.dados as unknown as ProdutosReportData
    },
  },

  clientes: {
    getData: async (config: ReportConfiguration): Promise<ClientesReportData> => {
      const preview = await reportsService.preview('clientes', config)
      return preview.dados as unknown as ClientesReportData
    },
  },

  financeiro: {
    getData: async (config: ReportConfiguration): Promise<FinanceiroReportData> => {
      const preview = await reportsService.preview('financeiro', config)
      return preview.dados as unknown as FinanceiroReportData
    },
  },
}

// 📥 HELPER: Download de arquivo exportado
export const downloadReport = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// 📅 HELPER: Formatar período para nome de arquivo
export const formatPeriodForFilename = (startDate: string, endDate: string): string => {
  const start = startDate.replace(/-/g, '')
  const end = endDate.replace(/-/g, '')
  return `${start}_${end}`
}

// 🏷️ HELPER: Obter nome de arquivo para export
export const getExportFilename = (
  tipo: ReportType,
  formato: ReportFormat,
  startDate: string,
  endDate: string
): string => {
  const period = formatPeriodForFilename(startDate, endDate)
  const extension = formato === 'excel' ? 'xlsx' : formato
  return `relatorio_${tipo}_${period}.${extension}`
}

export default reportsService
