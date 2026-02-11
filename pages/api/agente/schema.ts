import type { NextApiResponse } from 'next'
import {
  withSupabaseAuth,
  type AuthenticatedRequest,
} from '@/lib/supabase-middleware'
import {
  AGENT_ACCESSIBLE_TABLES,
  TABLE_DESCRIPTIONS,
} from '@/lib/agent-schema'

// Cache schema info for 5 minutes
let schemaCache: { data: unknown; expiresAt: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`,
    })
  }

  try {
    const tableFilter = req.query.table as string | undefined
    const now = Date.now()

    // Return cached data if still valid
    if (schemaCache && now < schemaCache.expiresAt && !tableFilter) {
      return res.status(200).json({
        success: true,
        data: schemaCache.data,
        cached: true,
      })
    }

    // Build schema info from metadata
    const tables = AGENT_ACCESSIBLE_TABLES
      .filter((t) => !tableFilter || t === tableFilter)
      .map((tableName) => ({
        name: tableName,
        description: TABLE_DESCRIPTIONS[tableName] || '',
      }))

    const data = { tables }

    // Cache full response (not filtered)
    if (!tableFilter) {
      schemaCache = { data, expiresAt: now + CACHE_TTL }
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('[API Agente Schema] Erro:', error)
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export default withSupabaseAuth(handler)
