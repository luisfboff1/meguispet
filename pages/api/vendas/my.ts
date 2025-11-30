import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Venda } from '@/types'

/**
 * API: GET /api/vendas/my
 *
 * Retorna as vendas do usuário autenticado.
 * - Admin: retorna TODAS as vendas
 * - Vendedor: retorna APENAS suas vendas (filtrado por vendedor_id)
 * - Outros roles: retorna baseado em permissões
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Criar cliente Supabase com service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Buscar usuário autenticado do header ou cookie
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer '

    // Verificar o token e obter o usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    // Buscar dados do usuário no banco
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, tipo_usuario, vendedor_id, permissoes')
      .eq('supabase_user_id', user.id)
      .single()

    if (userError || !usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado no banco' })
    }

    // Construir query base de vendas
    let query = supabase
      .from('vendas')
      .select(`
        *,
        cliente:cliente_id(id, nome, documento, telefone, email),
        vendedor:vendedor_id(id, nome, email, comissao),
        itens:itens_venda(
          *,
          produto:produto_id(id, nome, preco_venda)
        ),
        parcelas:venda_parcelas(*)
      `)
      .order('created_at', { ascending: false })

    // 🔐 FILTRAR BASEADO NO TIPO DE USUÁRIO

    if (usuario.tipo_usuario === 'admin') {
      // Admin: retorna TODAS as vendas (sem filtro)
      // Query já está OK
    } else if (usuario.tipo_usuario === 'vendedor' && usuario.vendedor_id) {
      // Vendedor: retorna APENAS suas vendas
      query = query.eq('vendedor_id', usuario.vendedor_id)
    } else if (usuario.tipo_usuario === 'financeiro' || usuario.tipo_usuario === 'gerente') {
      // Financeiro e Gerente: podem ver todas as vendas
      // Query já está OK
    } else {
      // Outros roles: retornar vazio (sem permissão)
      return res.json({ success: true, data: [] })
    }

    // Executar query
    const { data: vendas, error: vendasError } = await query.limit(100)

    if (vendasError) {
      console.error('Erro ao buscar vendas:', vendasError)
      throw vendasError
    }

    return res.json({
      success: true,
      data: vendas as Venda[],
      usuario: {
        tipo: usuario.tipo_usuario,
        vendedor_id: usuario.vendedor_id,
      },
    })

  } catch (error) {
    console.error('Erro no endpoint /api/vendas/my:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar vendas',
    })
  }
}
