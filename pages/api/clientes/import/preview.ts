import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import { parseCSV, detectDelimiter, validateCSVStructure } from '@/lib/csv-parser'
import { validarDocumentoDetalhado, limparDocumento } from '@/lib/cnpj-validator'
import { converterParaUF, capitalizarEstado } from '@/lib/estado-mapper'
import { buscarCEPsEmLote, normalizarCidade } from '@/lib/viacep-client'
import type { Cliente, ClienteForm, ApiResponse } from '@/types'
import { getSupabaseServiceRole } from '@/lib/supabase-auth'

// Desabilitar body parser do Next.js para usar formidable
export const config = {
  api: {
    bodyParser: false,
  },
}

interface ClientePreview {
  linha: number
  status: 'valido' | 'aviso' | 'erro' | 'duplicata'
  dados: {
    original: Record<string, string>
    processado: Partial<ClienteForm>
  }
  validacoes: {
    documento: {
      valido: boolean
      tipo: 'cpf' | 'cnpj' | 'invalido'
      mensagem?: string
    }
    nome: {
      valido: boolean
      mensagem?: string
    }
    estado: {
      valido: boolean
      uf?: string
      mensagem?: string
    }
    cep: {
      encontrado: boolean
      aproximado: boolean
      valor?: string
      endereco?: string
      mensagem?: string
    }
  }
  mensagens: string[]
  selecionado: boolean
  duplicata?: {
    clienteExistente: number // ID do cliente existente
    nome: string
  }
}

interface PreviewResponse {
  registros: ClientePreview[]
  resumo: {
    total: number
    validos: number
    avisos: number
    erros: number
    duplicatas: number
  }
  cep: {
    encontrados: number
    aproximados: number
    naoEncontrados: number
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PreviewResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    })
  }

  try {
    // Parse do FormData usando formidable
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)

    // Extrair arquivo
    const file = Array.isArray(files.file) ? files.file[0] : files.file
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      })
    }

    // Extrair opções
    const tipo = (Array.isArray(fields.tipo) ? fields.tipo[0] : fields.tipo) || 'cliente'
    const buscarCEP = (Array.isArray(fields.buscarCEP) ? fields.buscarCEP[0] : fields.buscarCEP) === 'true'
    const duplicatas = (Array.isArray(fields.duplicatas) ? fields.duplicatas[0] : fields.duplicatas) || 'ignorar'

    // Ler conteúdo do arquivo
    const fileContent = fs.readFileSync(file.filepath, 'utf-8')

    // Detectar delimitador
    const delimiter = detectDelimiter(fileContent)

    // Validar estrutura do CSV
    const validation = validateCSVStructure(fileContent, delimiter)
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: `Arquivo CSV inválido: ${validation.errors.join(', ')}`
      })
    }

    // Parsear CSV
    const parseResult = parseCSV(fileContent, {
      delimiter,
      skipEmptyLines: true,
      trimValues: true,
      normalizeHeaders: true
    })

    // Buscar clientes existentes para detectar duplicatas
    const supabase = getSupabaseServiceRole()
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

    // Processar cada registro
    const registros: ClientePreview[] = []
    const cidadesParaBuscar: Array<{ uf: string; cidade: string; index: number }> = []

    parseResult.rows.forEach((row, index) => {
      const preview = processarRegistro(
        row,
        index + 2, // +2 porque linha 1 é header e arrays começam em 0
        tipo as Cliente['tipo'],
        documentosExistentes
      )

      registros.push(preview)

      // Se deve buscar CEP e tem cidade/estado válidos
      if (buscarCEP && preview.validacoes.estado.valido && preview.validacoes.estado.uf) {
        const cidade = preview.dados.processado.cidade
        const uf = preview.validacoes.estado.uf

        if (cidade && uf) {
          cidadesParaBuscar.push({ uf, cidade, index })
        }
      }
    })

    // Buscar CEPs em lote (se habilitado)
    if (buscarCEP && cidadesParaBuscar.length > 0) {
      const cidades = cidadesParaBuscar.map(c => ({ uf: c.uf, cidade: c.cidade }))
      const resultadosCEP = await buscarCEPsEmLote(cidades)

      // Atualizar registros com CEPs encontrados
      cidadesParaBuscar.forEach(({ uf, cidade, index }) => {
        const chave = `${uf.toUpperCase()}-${normalizarCidade(cidade)}`
        const cepInfo = resultadosCEP.get(chave)

        if (cepInfo) {
          registros[index].validacoes.cep = {
            encontrado: true,
            aproximado: cepInfo.aproximado,
            valor: cepInfo.cep,
            endereco: cepInfo.endereco,
            mensagem: cepInfo.aproximado
              ? `CEP aproximado: ${cepInfo.endereco}`
              : `CEP encontrado: ${cepInfo.endereco}`
          }

          // Atualizar dados processados
          registros[index].dados.processado.cep = cepInfo.cep
          registros[index].dados.processado.endereco = cepInfo.endereco

          // Se estava válido, pode virar aviso se CEP for aproximado
          if (registros[index].status === 'valido' && cepInfo.aproximado) {
            registros[index].status = 'aviso'
            registros[index].mensagens.push('CEP aproximado (centro da cidade)')
          }
        } else {
          registros[index].validacoes.cep = {
            encontrado: false,
            aproximado: false,
            mensagem: 'CEP não encontrado para esta cidade'
          }

          if (registros[index].status === 'valido') {
            registros[index].status = 'aviso'
            registros[index].mensagens.push('CEP não encontrado')
          }
        }
      })
    }

    // Calcular resumo
    const resumo = {
      total: registros.length,
      validos: registros.filter(r => r.status === 'valido').length,
      avisos: registros.filter(r => r.status === 'aviso').length,
      erros: registros.filter(r => r.status === 'erro').length,
      duplicatas: registros.filter(r => r.status === 'duplicata').length
    }

    const cepResumo = {
      encontrados: registros.filter(r => r.validacoes.cep.encontrado && !r.validacoes.cep.aproximado).length,
      aproximados: registros.filter(r => r.validacoes.cep.aproximado).length,
      naoEncontrados: registros.filter(r => !r.validacoes.cep.encontrado && buscarCEP).length
    }

    return res.status(200).json({
      success: true,
      data: {
        registros,
        resumo,
        cep: cepResumo
      },
      message: `${resumo.total} registros analisados`
    })

  } catch (error) {
    console.error('Erro no preview de importação:', error)

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao processar arquivo'
    })
  }
}

/**
 * Processa um registro individual do CSV
 */
function processarRegistro(
  row: Record<string, string>,
  linha: number,
  tipo: Cliente['tipo'],
  documentosExistentes: Map<string, { id: number; nome: string }>
): ClientePreview {
  const mensagens: string[] = []
  let status: ClientePreview['status'] = 'valido'

  // Extrair campos (com normalização de nomes)
  const codigo = row.codigo || row.cod || ''
  const nome = row.nome || ''
  const razaoSocial = row.razao_social || row.razao_social || ''
  const documento = row.cnpj_cpf || row.cpf_cnpj || row.documento || ''
  const estado = row.estado || row.uf || ''
  const cidade = row.cidade || row.localidade || ''
  const telefone = row.telefone || row.tel || row.fone || ''

  // Validar nome (obrigatório)
  const nomeValido = nome.trim().length > 0
  if (!nomeValido) {
    mensagens.push('Nome é obrigatório')
    status = 'erro'
  }

  // Validar documento (obrigatório)
  const docValidacao = validarDocumentoDetalhado(documento)
  if (!docValidacao.valido) {
    mensagens.push(docValidacao.erro || 'Documento inválido')
    status = 'erro'
  }

  // Verificar duplicata
  const docLimpo = limparDocumento(documento)
  const duplicata = documentosExistentes.get(docLimpo)
  if (duplicata) {
    status = 'duplicata'
    mensagens.push(`Cliente já existe: ${duplicata.nome}`)
  }

  // Validar e converter estado
  const uf = converterParaUF(estado)
  if (!uf) {
    mensagens.push(`Estado inválido: ${estado}`)
    if (status === 'valido') status = 'erro'
  }

  // Avisos (campos opcionais)
  if (!telefone) {
    mensagens.push('Telefone não informado')
    if (status === 'valido') status = 'aviso'
  }

  if (!cidade) {
    mensagens.push('Cidade não informada')
    if (status === 'valido') status = 'erro'
  }

  // Montar observações
  const observacoes = codigo ? `ID antigo: ${codigo}` : undefined

  // Dados processados
  const processado: Partial<ClienteForm> = {
    nome: nome.trim(),
    nome_fantasia: razaoSocial.trim() || undefined,
    documento: docLimpo || undefined,
    telefone: telefone.trim() || undefined,
    cidade: cidade ? capitalizarEstado(cidade) : undefined,
    estado: uf || undefined,
    tipo,
    ativo: true,
    observacoes
  }

  return {
    linha,
    status,
    dados: {
      original: row,
      processado
    },
    validacoes: {
      documento: {
        valido: docValidacao.valido,
        tipo: docValidacao.tipo,
        mensagem: docValidacao.erro || undefined
      },
      nome: {
        valido: nomeValido,
        mensagem: nomeValido ? undefined : 'Nome é obrigatório'
      },
      estado: {
        valido: !!uf,
        uf: uf || undefined,
        mensagem: uf ? undefined : `Estado inválido: ${estado}`
      },
      cep: {
        encontrado: false,
        aproximado: false
      }
    },
    mensagens,
    selecionado: status !== 'erro', // Por padrão, selecionar tudo exceto erros
    duplicata: duplicata ? { clienteExistente: duplicata.id, nome: duplicata.nome } : undefined
  }
}
