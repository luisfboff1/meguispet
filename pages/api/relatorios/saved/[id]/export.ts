import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ReportConfiguration, ReportFormat, ReportType } from '@/types/reports'

const EXPORT_FORMATS: ReportFormat[] = ['pdf', 'excel', 'csv']
const REPORT_TYPES: ReportType[] = ['vendas', 'produtos', 'clientes', 'financeiro']

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function isExportFormat(value: unknown): value is ReportFormat {
  return typeof value === 'string' && EXPORT_FORMATS.includes(value as ReportFormat)
}

function isReportType(value: unknown): value is ReportType {
  return typeof value === 'string' && REPORT_TYPES.includes(value as ReportType)
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      success: false,
      message: 'Metodo nao permitido',
    })
  }

  const { id, format } = req.query
  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID invalido',
    })
  }

  const formato = isExportFormat(Array.isArray(format) ? format[0] : format)
    ? Array.isArray(format) ? format[0] : format
    : 'pdf'

  try {
    const reportId = Number(id)
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID invalido',
      })
    }

    const { data: report, error } = await req.supabaseClient
      .from('relatorios_salvos')
      .select('id, tipo, nome, configuracao')
      .eq('id', reportId)
      .eq('usuario_id', req.user.id)
      .single()

    if (error || !report) {
      return res.status(404).json({
        success: false,
        message: 'Relatorio nao encontrado',
      })
    }

    if (!isReportType(report.tipo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de relatorio invalido',
      })
    }

    const configuration = report.configuracao as ReportConfiguration
    const protocol = firstHeader(req.headers['x-forwarded-proto']) || 'http'
    const host = firstHeader(req.headers.host) || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const cookie = firstHeader(req.headers.cookie)
    const authorization = firstHeader(req.headers.authorization)
    if (cookie) headers.Cookie = cookie
    if (authorization) headers.Authorization = authorization

    const exportResponse = await fetch(
      `${baseUrl}/api/relatorios/${report.tipo}/export`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...configuration,
          formato,
        }),
      }
    )

    if (!exportResponse.ok) {
      let detail = 'Erro ao exportar relatorio'
      try {
        const parsed = await exportResponse.json() as { message?: string }
        detail = parsed.message || detail
      } catch {
        detail = await exportResponse.text()
      }
      return res.status(exportResponse.status).json({
        success: false,
        message: detail,
      })
    }

    const buffer = Buffer.from(await exportResponse.arrayBuffer())
    res.setHeader(
      'Content-Type',
      exportResponse.headers.get('content-type') || 'application/octet-stream'
    )
    res.setHeader(
      'Content-Disposition',
      exportResponse.headers.get('content-disposition') ||
        `attachment; filename="relatorio-${reportId}.${formato === 'excel' ? 'xlsx' : formato}"`
    )
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).send(buffer)
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao exportar relatorio',
    })
  }
}

export default withSupabaseAuth(handler)
