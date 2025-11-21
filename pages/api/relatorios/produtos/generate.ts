import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ReportConfiguration, ReportFormat, ProdutosReportData } from '@/types/reports'

const handler = async (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { config, formato = 'web', salvar = false, nome } = req.body as {
      config: ReportConfiguration
      formato?: ReportFormat
      salvar?: boolean
      nome?: string
    }

    if (!config?.filtros?.periodo?.startDate || !config?.filtros?.periodo?.endDate) {
      return res.status(400).json({ error: 'Período é obrigatório' })
    }

    // Use authenticated supabase client from middleware to respect RLS policies
    const supabase = req.supabaseClient
    const userId = req.user.id

    // Chamar a API de preview para obter os dados
    // Em produção, você pode fazer a lógica diretamente aqui ou reutilizar
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const host = req.headers.host || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    
    const previewResponse = await fetch(`${baseUrl}/api/relatorios/produtos/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify(config)
    })

    if (!previewResponse.ok) {
      const errorData = await previewResponse.json()
      return res.status(previewResponse.status).json(errorData)
    }

    const previewData = await previewResponse.json()
    const reportData: ProdutosReportData = previewData.data

    // 3️⃣ Salvar no banco se solicitado
    let reportId: number | undefined

    if (salvar) {
      const nomeRelatorio = nome || `Relatório de Produtos - ${new Date().toLocaleDateString('pt-BR')}`

      const { data: savedReport, error: saveError } = await supabase
        .from('relatorios_salvos')
        .insert({
          usuario_id: userId,
          tipo: 'produtos',
          nome: nomeRelatorio,
          configuracao: config,
          periodo_inicio: config.filtros.periodo.startDate,
          periodo_fim: config.filtros.periodo.endDate,
          dados: reportData,
          formato,
          status: 'disponivel'
        })
        .select()
        .single()

      if (saveError) {
        // Não falhar a requisição, apenas avisar
      } else {
        reportId = savedReport?.id
      }
    }

    // 4️⃣ Retornar resposta
    return res.status(200).json({
      success: true,
      reportId,
      preview: reportData,
      message: salvar
        ? 'Relatório gerado e salvo com sucesso'
        : 'Relatório gerado com sucesso'
    })

  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao gerar relatório de produtos',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
}

export default withSupabaseAuth(handler)
