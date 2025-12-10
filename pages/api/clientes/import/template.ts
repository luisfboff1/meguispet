import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Endpoint para download do template de importação de clientes
 *
 * GET /api/clientes/import/template
 *
 * Retorna um arquivo CSV de exemplo com o formato esperado
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' })
  }

  // Template CSV com dados de exemplo
  const templateCSV = `Código;Nome;Razão social;CNPJ/CPF;Estado;Cidade;Telefone;
1;Empresa Exemplo LTDA;Empresa Exemplo LTDA;12.345.678/0001-90;Rio Grande do Sul;Caxias do Sul;(54) 3000-0000;
2;Pet Shop ABC;Pet Shop ABC LTDA;98.765.432/0001-10;São Paulo;São Paulo;(11) 9000-0000;
3;João da Silva;João da Silva;123.456.789-09;Paraná;Curitiba;(41) 9800-0000;`

  // Headers para download de arquivo
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename=template-importacao-clientes.csv')
  res.setHeader('Cache-Control', 'no-cache')

  // Adicionar BOM para garantir UTF-8 no Excel
  const BOM = '\uFEFF'

  return res.status(200).send(BOM + templateCSV)
}
