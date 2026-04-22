import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ReportConfiguration, ReportFormat, ProdutosReportData } from '@/types/reports'

interface GenerateRequestBody extends ReportConfiguration {
  formato: ReportFormat
  salvar: boolean
  nome?: string
}

const handler = async (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    })
  }

  try {
    const body = req.body as GenerateRequestBody

    if (!body?.filtros?.periodo?.startDate || !body?.filtros?.periodo?.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Período é obrigatório'
      })
    }

    const supabase = req.supabaseClient
    const userId = req.user.id

    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const host = req.headers.host || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    const previewResponse = await fetch(`${baseUrl}/api/relatorios/produtos/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify(body)
    })

    if (!previewResponse.ok) {
      const errorData = await previewResponse.json()
      return res.status(previewResponse.status).json(errorData)
    }

    const previewData = await previewResponse.json()
    const reportData: ProdutosReportData = previewData.data

    let reportId: number | undefined

    if (body.salvar) {
      const nomeRelatorio = body.nome || `Relatório de Produtos - ${new Date().toLocaleDateString('pt-BR')}`

      const { data: savedReport, error: saveError } = await supabase
        .from('relatorios_salvos')
        .insert({
          usuario_id: userId,
          tipo: 'produtos',
          nome: nomeRelatorio,
          configuracao: body,
          periodo_inicio: body.filtros.periodo.startDate,
          periodo_fim: body.filtros.periodo.endDate,
          dados: reportData,
          formato: body.formato,
          status: 'disponivel'
        })
        .select()
        .single()

      if (saveError) {
        throw saveError
      }

      reportId = savedReport?.id
    }

    return res.status(200).json({
      success: true,
      reportId,
      preview: {
        resumo: reportData.resumo,
        dados: reportData,
        totalRegistros: reportData.resumo.totalProdutos,
      },
      message: body.salvar
        ? 'Relatório gerado e salvo com sucesso'
        : 'Relatório gerado com sucesso'
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
}

export default withSupabaseAuth(handler)
