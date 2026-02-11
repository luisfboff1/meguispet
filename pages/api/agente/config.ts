import type { NextApiResponse } from 'next'
import {
  withSupabaseAuth,
  type AuthenticatedRequest,
} from '@/lib/supabase-middleware'
import { encryptApiKey, decryptApiKey } from '@/lib/agent-crypto'

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req
  const supabase = req.supabaseClient
  const userId = req.user.id

  try {
    // GET - Buscar configuracao do usuario
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('agent_configs')
        .select('*')
        .eq('usuario_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (user has no config yet)
        throw error
      }

      if (!data) {
        return res.status(200).json({ success: true, data: null })
      }

      // Never return the encrypted API key to the frontend
      const { api_key_encrypted, ...safeData } = data
      return res.status(200).json({
        success: true,
        data: {
          ...safeData,
          has_api_key: !!api_key_encrypted,
          api_key_preview: api_key_encrypted ? 'sk-...configurada' : null,
        },
      })
    }

    // PUT - Salvar/atualizar configuracao
    if (method === 'PUT') {
      const {
        provider,
        model,
        api_key,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty,
        system_prompt,
        recursion_limit,
        skills,
        mcp_servers,
      } = req.body

      if (!provider || !model) {
        return res.status(400).json({
          success: false,
          message: 'Provider e model sao obrigatorios',
        })
      }

      // Build update data
      const updateData: Record<string, unknown> = {
        usuario_id: userId,
        provider,
        model,
        temperature: temperature ?? 0.3,
        max_tokens: max_tokens ?? 4096,
        top_p: top_p ?? 1.0,
        frequency_penalty: frequency_penalty ?? 0,
        presence_penalty: presence_penalty ?? 0,
        system_prompt: system_prompt || null,
        recursion_limit: Math.min(Math.max(recursion_limit ?? 25, 5), 50),
        skills: skills ?? ['sql_query', 'schema_explorer', 'data_analysis'],
        mcp_servers: mcp_servers ?? [],
      }

      // Only update API key if provided (don't overwrite existing with empty)
      if (api_key) {
        // Validate api_key is a proper string
        if (typeof api_key !== 'string') {
          console.error(`[API Agente Config] api_key type invalido: ${typeof api_key}, value: ${JSON.stringify(api_key).substring(0, 100)}`)
          return res.status(400).json({
            success: false,
            message: 'API key deve ser uma string valida.',
          })
        }

        const trimmedKey = api_key.trim()

        // Basic format validation
        if (trimmedKey.length < 10) {
          return res.status(400).json({
            success: false,
            message: 'API key muito curta. Verifique e tente novamente.',
          })
        }

        // Warn if key doesn't look like a known provider key
        if (!trimmedKey.startsWith('sk-') && !trimmedKey.startsWith('key-')) {
          console.warn(`[API Agente Config] API key com formato incomum (nao comeca com sk- ou key-). Primeiros 4 chars: ${trimmedKey.substring(0, 4)}`)
        }

        console.log(`[API Agente Config] Encriptando API key: type=${typeof trimmedKey}, length=${trimmedKey.length}, starts=${trimmedKey.substring(0, 7)}, ends=${trimmedKey.substring(trimmedKey.length - 4)}`)
        const encrypted = encryptApiKey(trimmedKey)

        // Verify round-trip: decrypt immediately to ensure data integrity
        const decrypted = decryptApiKey(encrypted)
        if (decrypted !== trimmedKey) {
          console.error(`[API Agente Config] ROUND-TRIP FALHOU! Original length: ${trimmedKey.length}, Decrypted length: ${decrypted.length}`)
          return res.status(500).json({
            success: false,
            message: 'Erro interno ao encriptar API key. Tente novamente.',
          })
        }
        console.log(`[API Agente Config] Round-trip OK. Encrypted length: ${encrypted.length}`)

        updateData.api_key_encrypted = encrypted
      }

      // Upsert: insert if not exists, update if exists
      const { data, error } = await supabase
        .from('agent_configs')
        .upsert(updateData, { onConflict: 'usuario_id' })
        .select()
        .single()

      if (error) throw error

      // Return safe data (without encrypted key)
      const { api_key_encrypted, ...safeData } = data
      return res.status(200).json({
        success: true,
        data: {
          ...safeData,
          has_api_key: !!api_key_encrypted,
          api_key_preview: api_key_encrypted ? 'sk-...configurada' : null,
        },
        message: 'Configuracao salva com sucesso',
      })
    }

    res.setHeader('Allow', ['GET', 'PUT'])
    return res.status(405).json({
      success: false,
      message: `Method ${method} Not Allowed`,
    })
  } catch (error) {
    console.error('[API Agente Config] Erro:', error)
    const rawMsg = error instanceof Error ? error.message : String(error)
    let userMessage = rawMsg
    if (rawMsg.includes('AGENT_ENCRYPTION_KEY')) {
      userMessage = 'Chave de encriptacao do servidor nao configurada (AGENT_ENCRYPTION_KEY). Contate o administrador para adicionar no Doppler.'
    } else if (rawMsg.includes('duplicate key') || rawMsg.includes('unique constraint')) {
      userMessage = 'Configuracao ja existe. Tente novamente.'
    } else if (rawMsg.includes('permission denied') || rawMsg.includes('RLS')) {
      userMessage = 'Sem permissao para acessar configuracoes. Verifique as politicas RLS no Supabase.'
    }
    return res.status(500).json({
      success: false,
      message: userMessage,
    })
  }
}

export default withSupabaseAuth(handler)
