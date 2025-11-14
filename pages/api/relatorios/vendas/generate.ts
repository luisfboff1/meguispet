import type { NextApiResponse } from 'next'
import { getSupabase } from '@/lib/supabase'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ReportConfiguration, ReportFormat } from '@/types/reports'

interface GenerateRequestBody extends ReportConfiguration {
  formato: ReportFormat
  salvar: boolean
  nome?: string
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    })
  }

  try {
    const supabase = getSupabase()
    const body: GenerateRequestBody = req.body

    if (!body.filtros?.periodo) {
      return res.status(400).json({
        success: false,
        message: 'Período é obrigatório'
      })
    }

    // Reutilizar a lógica da API de preview para gerar os dados
    const previewResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/relatorios/vendas/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Passar headers de autenticação se necessário
      },
      body: JSON.stringify(body),
    })

    if (!previewResponse.ok) {
      throw new Error('Erro ao gerar dados do relatório')
    }

    const previewData = await previewResponse.json()

    if (!previewData.success) {
      throw new Error(previewData.message || 'Erro ao gerar dados do relatório')
    }

    // Se não deve salvar, retorna apenas os dados
    if (!body.salvar) {
      return res.status(200).json({
        success: true,
        preview: previewData.data,
        message: 'Relatório gerado com sucesso',
      })
    }

    // Salvar no banco de dados
    const { startDate, endDate } = body.filtros.periodo
    const nomeRelatorio = body.nome || `Relatório de Vendas - ${new Date().toLocaleDateString('pt-BR')}`

    const { data: relatorioSalvo, error: saveError } = await supabase
      .from('relatorios_salvos')
      .insert({
        usuario_id: req.user?.id || 1,
        tipo: 'vendas',
        nome: nomeRelatorio,
        configuracao: body,
        periodo_inicio: startDate,
        periodo_fim: endDate,
        dados: previewData.data,
        formato: body.formato,
        status: 'disponivel',
      })
      .select()
      .single()

    if (saveError) {
      console.error('[generate] Erro ao salvar relatório:', saveError)
      throw saveError
    }

    return res.status(200).json({
      success: true,
      reportId: relatorioSalvo.id,
      preview: previewData.data,
      message: 'Relatório gerado e salvo com sucesso',
    })

  } catch (error) {
    console.error('[generate] Erro:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao gerar relatório',
    })
  }
}

export default withSupabaseAuth(handler)
