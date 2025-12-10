/**
 * Import Service
 *
 * Serviço para importação em lote de clientes
 */

import api from './api'
import type { ApiResponse, Cliente, ClienteForm } from '@/types'

export interface ClientePreview {
  linha: number
  status: 'valido' | 'aviso' | 'erro' | 'duplicata'
  dados: {
    original: Record<string, string>
    processado: Partial<ClienteForm>
  }
  validacoes: {
    documento: {
      valido: boolean
      tipo: 'cpf' | 'cnpj' | 'invalido'
      mensagem?: string
    }
    nome: {
      valido: boolean
      mensagem?: string
    }
    estado: {
      valido: boolean
      uf?: string
      mensagem?: string
    }
    cep: {
      encontrado: boolean
      aproximado: boolean
      valor?: string
      endereco?: string
      mensagem?: string
    }
  }
  mensagens: string[]
  selecionado: boolean
  duplicata?: {
    clienteExistente: number
    nome: string
  }
}

export interface PreviewResponse {
  registros: ClientePreview[]
  resumo: {
    total: number
    validos: number
    avisos: number
    erros: number
    duplicatas: number
  }
  cep: {
    encontrados: number
    aproximados: number
    naoEncontrados: number
  }
}

export interface ClienteImport extends ClienteForm {
  linha: number
}

export interface RelatorioImportacao {
  total: number
  importados: number
  duplicatas: number
  erros: number
  avisos: number
  detalhes: {
    importados: Array<{
      linha: number
      nome: string
      cpf_cnpj: string
      id: number
    }>
    duplicatas: Array<{
      linha: number
      nome: string
      cpf_cnpj: string
      mensagem: string
      clienteExistente?: number
    }>
    erros: Array<{
      linha: number
      nome: string
      mensagem: string
    }>
    avisos: Array<{
      linha: number
      nome: string
      mensagem: string
    }>
  }
  cep: {
    encontrados: number
    aproximados: number
    naoEncontrados: number
  }
  mapa: {
    adicionados: number
    semCoordenadas: number
  }
  timestamp: string
}

/**
 * Faz preview do arquivo CSV antes de importar
 */
export const importService = {
  /**
   * Envia arquivo para análise e preview
   */
  async preview(
    file: File,
    opcoes: {
      tipo: Cliente['tipo']
      buscarCEP: boolean
      duplicatas: 'ignorar' | 'atualizar' | 'novo'
    }
  ): Promise<ApiResponse<PreviewResponse>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('tipo', opcoes.tipo)
    formData.append('buscarCEP', String(opcoes.buscarCEP))
    formData.append('duplicatas', opcoes.duplicatas)

    const response = await api.post('/clientes/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response.data
  },

  /**
   * Executa a importação dos clientes selecionados
   */
  async execute(
    clientes: ClienteImport[],
    opcoes: {
      tipo: Cliente['tipo']
      duplicatas: 'ignorar' | 'atualizar' | 'novo'
    }
  ): Promise<ApiResponse<RelatorioImportacao>> {
    const response = await api.post('/clientes/import/execute', {
      clientes,
      opcoes
    })

    return response.data
  },

  /**
   * Baixa o template de exemplo
   */
  async downloadTemplate(): Promise<void> {
    const response = await api.get('/clientes/import/template', {
      responseType: 'blob'
    })

    // Criar URL do blob e fazer download
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'template-importacao-clientes.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }
}
