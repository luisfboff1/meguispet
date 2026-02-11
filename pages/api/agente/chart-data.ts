import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface ChartDataRequest {
  conversationId: string
  chartId: string
  filters: Record<string, string>
  sql: string // Base SQL query with filter placeholders
}

/**
 * API endpoint to fetch updated chart data based on filter changes.
 * POST /api/agente/chart-data
 * Body: { conversationId, chartId, filters, sql }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { conversationId, chartId, filters, sql }: ChartDataRequest = req.body

    if (!conversationId || !sql) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get database connection from env
    const dbUrl = process.env.SUPABASE_DB_URL
    if (!dbUrl) {
      return res.status(500).json({ error: 'Database URL not configured' })
    }

    // Apply filters to SQL
    // For now, we'll execute the SQL as-is since the agent provides filtered data
    // In a production system, you'd want to parse and modify the SQL safely

    // Execute SQL query
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase.rpc('execute_sql', { query: sql })

    if (error) {
      console.error('SQL execution error:', error)
      return res.status(500).json({ error: 'Failed to execute query', details: error.message })
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      filters
    })

  } catch (error) {
    console.error('Chart data API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
