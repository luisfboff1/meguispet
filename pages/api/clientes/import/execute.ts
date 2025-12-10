import type { NextApiRequest, NextApiResponse } from 'next'
import type { Cliente, ClienteForm, ApiResponse } from '@/types'
import { getSupabaseServiceRole } from '@/lib/supabase-auth'
import { limparDocumento } from '@/lib/cnpj-validator'

interface ClienteImport extends ClienteForm {
  linha: number
}

interface RelatorioImportacao {
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

interface ExecuteRequest {
  clientes: ClienteImport[]
  opcoes: {
    tipo: Cliente['tipo']
    duplicatas: 'ignorar' | 'atualizar' | 'novo'
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RelatorioImportacao>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    })
  }

  try {
    const { clientes, opcoes } = req.body as ExecuteRequest

    if (!clientes || !Array.isArray(clientes) || clientes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum cliente para importar'
      })
    }

    const supabase = getSupabaseServiceRole()

    // Buscar clientes existentes para detectar duplicatas
    const { data: clientesExistentes } = await supabase
      .from('clientes_fornecedores')
      .select('id, nome, documento')

    const documentosExistentes = new Map<string, { id: number; nome: string }>()
    if (clientesExistentes) {
      clientesExistentes.forEach(c => {
        if (c.documento) {
          documentosExistentes.set(limparDocumento(c.documento), {
            id: c.id,
            nome: c.nome
          })
        }
      })
    }

    // Inicializar relatório
    const relatorio: RelatorioImportacao = {
      total: clientes.length,
      importados: 0,
      duplicatas: 0,
      erros: 0,
      avisos: 0,
      detalhes: {
        importados: [],
        duplicatas: [],
        erros: [],
        avisos: []
      },
      cep: {
        encontrados: 0,
        aproximados: 0,
        naoEncontrados: 0
      },
      mapa: {
        adicionados: 0,
        semCoordenadas: 0
      },
      timestamp: new Date().toISOString()
    }

    // Processar cada cliente
    for (const cliente of clientes) {
      try {
        const docLimpo = limparDocumento(cliente.documento || '')
        const duplicata = documentosExistentes.get(docLimpo)

        // Tratar duplicatas conforme configuração
        if (duplicata) {
          if (opcoes.duplicatas === 'ignorar') {
            relatorio.duplicatas++
            relatorio.detalhes.duplicatas.push({
              linha: cliente.linha,
              nome: cliente.nome,
              cpf_cnpj: docLimpo,
              mensagem: `Cliente já existe: ${duplicata.nome}`,
              clienteExistente: duplicata.id
            })
            continue
          }

          if (opcoes.duplicatas === 'atualizar') {
            // Atualizar cliente existente
            const { error } = await supabase
              .from('clientes_fornecedores')
              .update({
                nome: cliente.nome,
                documento: cliente.documento,
                telefone: cliente.telefone,
                email: cliente.email,
                endereco: cliente.endereco,
                cidade: cliente.cidade,
                estado: cliente.estado,
                cep: cliente.cep,
                bairro: cliente.bairro,
                tipo: cliente.tipo,
                observacoes: cliente.observacoes,
                updated_at: new Date().toISOString()
              })
              .eq('id', duplicata.id)

            if (error) {
              relatorio.erros++
              relatorio.detalhes.erros.push({
                linha: cliente.linha,
                nome: cliente.nome,
                mensagem: `Erro ao atualizar: ${error.message}`
              })
              continue
            }

            relatorio.importados++
            relatorio.detalhes.importados.push({
              linha: cliente.linha,
              nome: cliente.nome,
              cpf_cnpj: docLimpo,
              id: duplicata.id
            })
            continue
          }

          // opcoes.duplicatas === 'novo' - criar novo registro mesmo sendo duplicata
          relatorio.avisos++
          relatorio.detalhes.avisos.push({
            linha: cliente.linha,
            nome: cliente.nome,
            mensagem: 'Cliente com documento duplicado foi importado'
          })
        }

        // Preparar dados para inserção
        const novoCliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'> = {
          nome: cliente.nome,
          documento: docLimpo || undefined,
          telefone: cliente.telefone || undefined,
          email: cliente.email || undefined,
          endereco: cliente.endereco || undefined,
          cidade: cliente.cidade || undefined,
          estado: cliente.estado || undefined,
          cep: cliente.cep || undefined,
          bairro: cliente.bairro || undefined,
          observacoes: cliente.observacoes || undefined,
          tipo: cliente.tipo,
          vendedor_id: cliente.vendedor_id || null,
          ativo: true
        }

        // Inserir novo cliente
        const { data: clienteInserido, error } = await supabase
          .from('clientes_fornecedores')
          .insert(novoCliente)
          .select('id')
          .single()

        if (error) {
          relatorio.erros++
          relatorio.detalhes.erros.push({
            linha: cliente.linha,
            nome: cliente.nome,
            mensagem: `Erro ao importar: ${error.message}`
          })
          continue
        }

        relatorio.importados++
        relatorio.detalhes.importados.push({
          linha: cliente.linha,
          nome: cliente.nome,
          cpf_cnpj: docLimpo,
          id: clienteInserido.id
        })

        // Contabilizar CEPs
        if (cliente.cep) {
          // Verificar se é aproximado (poderia ter uma flag no objeto cliente)
          relatorio.cep.encontrados++

          // Se tem CEP, adicionar ao mapa (assumindo geocodificação lazy)
          relatorio.mapa.adicionados++
        } else {
          relatorio.cep.naoEncontrados++
          relatorio.mapa.semCoordenadas++
        }

      } catch (error) {
        relatorio.erros++
        relatorio.detalhes.erros.push({
          linha: cliente.linha,
          nome: cliente.nome,
          mensagem: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }

    // Mensagem de sucesso baseada no resultado
    let mensagem = `${relatorio.importados} cliente(s) importado(s) com sucesso`

    if (relatorio.duplicatas > 0) {
      mensagem += `, ${relatorio.duplicatas} duplicata(s)`
    }

    if (relatorio.erros > 0) {
      mensagem += `, ${relatorio.erros} erro(s)`
    }

    if (relatorio.avisos > 0) {
      mensagem += `, ${relatorio.avisos} aviso(s)`
    }

    return res.status(200).json({
      success: true,
      data: relatorio,
      message: mensagem
    })

  } catch (error) {
    console.error('Erro na importação:', error)

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao importar clientes'
    })
  }
}
