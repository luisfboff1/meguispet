-- ============================================================================
-- MIGRATION 008: Reports System
-- ============================================================================
-- Descrição: Cria tabelas para o sistema de relatórios customizáveis
-- Data: 2025-01-13
-- Autor: Claude Code
-- ============================================================================

-- Tabela de relatórios salvos
-- Armazena relatórios gerados pelos usuários
CREATE TABLE IF NOT EXISTS relatorios_salvos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('vendas', 'produtos', 'clientes', 'financeiro')),
  nome VARCHAR(255) NOT NULL,
  configuracao JSONB NOT NULL, -- Filtros, métricas, gráficos, etc.
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  dados JSONB, -- Dados calculados (cache para otimização)
  formato VARCHAR(20) CHECK (formato IN ('pdf', 'excel', 'csv', 'web')),
  arquivo_url TEXT, -- URL do arquivo gerado (se PDF/Excel)
  status VARCHAR(20) DEFAULT 'disponivel' CHECK (status IN ('processando', 'disponivel', 'erro')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de templates de relatórios
-- Templates pré-configurados que podem ser reutilizados
CREATE TABLE IF NOT EXISTS relatorios_templates (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('vendas', 'produtos', 'clientes', 'financeiro')),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  configuracao JSONB NOT NULL, -- Configuração do template (filtros, métricas, etc.)
  publico BOOLEAN DEFAULT FALSE, -- Template público (visível para outros usuários) ou privado
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para otimização de queries
-- Índice para buscar relatórios por usuário
CREATE INDEX IF NOT EXISTS idx_relatorios_usuario ON relatorios_salvos(usuario_id);

-- Índice para buscar relatórios por tipo
CREATE INDEX IF NOT EXISTS idx_relatorios_tipo ON relatorios_salvos(tipo);

-- Índice composto para buscar relatórios por período
CREATE INDEX IF NOT EXISTS idx_relatorios_data ON relatorios_salvos(periodo_inicio, periodo_fim);

-- Índice para buscar relatórios por status
CREATE INDEX IF NOT EXISTS idx_relatorios_status ON relatorios_salvos(status);

-- Índice composto para buscar relatórios recentes de um usuário
CREATE INDEX IF NOT EXISTS idx_relatorios_usuario_data ON relatorios_salvos(usuario_id, created_at DESC);

-- Índice para buscar templates por usuário
CREATE INDEX IF NOT EXISTS idx_templates_usuario ON relatorios_templates(usuario_id);

-- Índice para buscar templates públicos
CREATE INDEX IF NOT EXISTS idx_templates_publico ON relatorios_templates(publico) WHERE publico = TRUE;

-- Índice composto para buscar templates por tipo e visibilidade
CREATE INDEX IF NOT EXISTS idx_templates_tipo_publico ON relatorios_templates(tipo, publico);

-- Comentários nas tabelas e colunas
COMMENT ON TABLE relatorios_salvos IS 'Armazena relatórios gerados pelos usuários com configurações e dados';
COMMENT ON TABLE relatorios_templates IS 'Templates de relatórios reutilizáveis compartilháveis entre usuários';

COMMENT ON COLUMN relatorios_salvos.configuracao IS 'JSON com filtros, métricas, gráficos e outras configurações';
COMMENT ON COLUMN relatorios_salvos.dados IS 'Cache dos dados calculados para evitar recalcular';
COMMENT ON COLUMN relatorios_salvos.arquivo_url IS 'URL do arquivo gerado no storage (PDF/Excel)';
COMMENT ON COLUMN relatorios_templates.publico IS 'Se TRUE, template é visível para todos os usuários';

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_relatorios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER trigger_relatorios_salvos_updated_at
  BEFORE UPDATE ON relatorios_salvos
  FOR EACH ROW
  EXECUTE FUNCTION update_relatorios_updated_at();

CREATE TRIGGER trigger_relatorios_templates_updated_at
  BEFORE UPDATE ON relatorios_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_relatorios_updated_at();

-- Seed de templates públicos padrão (exemplos úteis)
INSERT INTO relatorios_templates (usuario_id, tipo, nome, descricao, configuracao, publico)
VALUES
  (
    1,
    'vendas',
    'Relatório Mensal de Vendas',
    'Relatório completo de vendas do mês com todos os gráficos e métricas',
    '{"tipo":"vendas","filtros":{"periodo":{"startDate":"2025-01-01","endDate":"2025-01-31"}},"metricas":{"incluirTotalVendas":true,"incluirFaturamento":true,"incluirTicketMedio":true,"incluirImpostos":true,"incluirMargemLucro":true},"graficos":{"incluirGraficoTemporal":true,"incluirGraficoVendedor":true,"incluirGraficoProduto":true}}'::jsonb,
    TRUE
  ),
  (
    1,
    'produtos',
    'Top 10 Produtos Mais Vendidos',
    'Lista dos produtos mais vendidos no período com análise de performance',
    '{"tipo":"produtos","filtros":{"periodo":{"startDate":"2025-01-01","endDate":"2025-01-31"}},"metricas":{"incluirProdutosMaisVendidos":true,"incluirRotatividade":true},"ordenacao":{"campo":"quantidade","direcao":"desc"},"limite":10}'::jsonb,
    TRUE
  ),
  (
    1,
    'clientes',
    'Novos Clientes do Mês',
    'Relatório de clientes cadastrados no período com análise de perfil',
    '{"tipo":"clientes","filtros":{"periodo":{"startDate":"2025-01-01","endDate":"2025-01-31"}},"metricas":{"incluirNovosClientes":true,"incluirClientesAtivos":true},"graficos":{"incluirGraficoTemporal":true}}'::jsonb,
    TRUE
  ),
  (
    1,
    'financeiro',
    'DRE Mensal Completo',
    'Demonstrativo de Resultados do Exercício com todas as métricas financeiras',
    '{"tipo":"financeiro","filtros":{"periodo":{"startDate":"2025-01-01","endDate":"2025-01-31"}},"metricas":{"incluirReceitas":true,"incluirDespesas":true,"incluirLucro":true,"incluirDRE":true},"graficos":{"incluirGraficoTemporal":true,"incluirGraficoCategoria":true}}'::jsonb,
    TRUE
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIM DA MIGRATION 008
-- ============================================================================
