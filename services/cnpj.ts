// 🏢 SERVIÇO DE CNPJ - BrasilAPI
export interface CNPJData {
  cnpj: string
  razao_social: string
  nome_fantasia?: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  telefone?: string
  email?: string
  situacao: string
  porte: string
  natureza_juridica: string
}

export const cnpjService = {
  async buscarCNPJ(cnpj: string): Promise<CNPJData | null> {
    try {
      // Remove caracteres não numéricos
      const cnpjLimpo = cnpj.replace(/\D/g, '')
      
      if (cnpjLimpo.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos')
      }
      
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar CNPJ')
      }
      
      const data = await response.json()
      
      if (data.message) {
        throw new Error(data.message)
      }
      
      return data
    } catch (error) {
      return null
    }
  }
}
