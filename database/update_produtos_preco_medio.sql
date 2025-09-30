-- 📊 ATUALIZAÇÃO DA ESTRUTURA DE PRODUTOS PARA PREÇO MÉDIO PONDERADO
-- Execute este script no seu banco PostgreSQL

-- 1. Adicionar novas colunas na tabela produtos
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS preco_venda DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS preco_custo DECIMAL(10,2) DEFAULT 0;

-- 2. Migrar dados existentes (se a coluna 'preco' existir)
-- Copia o valor de 'preco' para 'preco_venda' e define 'preco_custo' como 70% do preço de venda
DO $$
BEGIN
    -- Verifica se a coluna 'preco' existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'produtos' AND column_name = 'preco') THEN
        
        -- Atualiza preco_venda com o valor de preco existente
        UPDATE produtos 
        SET preco_venda = preco 
        WHERE preco_venda = 0 OR preco_venda IS NULL;
        
        -- Define preco_custo como 70% do preço de venda (ajuste conforme necessário)
        UPDATE produtos 
        SET preco_custo = ROUND(preco_venda * 0.7, 2)
        WHERE preco_custo = 0 OR preco_custo IS NULL;
        
        -- Remove a coluna 'preco' antiga (opcional - descomente se quiser remover)
        -- ALTER TABLE produtos DROP COLUMN preco;
    END IF;
END $$;

-- 3. Adicionar constraints para garantir valores válidos
ALTER TABLE produtos 
ADD CONSTRAINT check_preco_venda_positive CHECK (preco_venda >= 0),
ADD CONSTRAINT check_preco_custo_positive CHECK (preco_custo >= 0);

-- 4. Criar função para calcular preço médio ponderado
CREATE OR REPLACE FUNCTION calcular_preco_medio_ponderado(
    produto_id_param INTEGER,
    nova_quantidade INTEGER,
    novo_preco DECIMAL(10,2)
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    estoque_atual INTEGER;
    preco_atual DECIMAL(10,2);
    estoque_total INTEGER;
    valor_total DECIMAL(10,2);
    preco_medio DECIMAL(10,2);
BEGIN
    -- Buscar estoque e preço atual do produto
    SELECT estoque, preco_custo 
    INTO estoque_atual, preco_atual
    FROM produtos 
    WHERE id = produto_id_param;
    
    -- Calcular estoque total
    estoque_total := estoque_atual + nova_quantidade;
    
    -- Calcular valor total
    valor_total := (estoque_atual * preco_atual) + (nova_quantidade * novo_preco);
    
    -- Calcular preço médio ponderado
    IF estoque_total > 0 THEN
        preco_medio := ROUND(valor_total / estoque_total, 2);
    ELSE
        preco_medio := novo_preco;
    END IF;
    
    RETURN preco_medio;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar função para atualizar estoque e preço médio
CREATE OR REPLACE FUNCTION atualizar_estoque_preco_medio(
    produto_id_param INTEGER,
    quantidade INTEGER,
    preco_unitario DECIMAL(10,2),
    tipo_movimentacao VARCHAR(20)
) RETURNS VOID AS $$
DECLARE
    preco_medio_calculado DECIMAL(10,2);
BEGIN
    IF tipo_movimentacao = 'entrada' THEN
        -- Para entrada: calcular preço médio ponderado
        preco_medio_calculado := calcular_preco_medio_ponderado(produto_id_param, quantidade, preco_unitario);
        
        UPDATE produtos 
        SET 
            estoque = estoque + quantidade,
            preco_custo = preco_medio_calculado,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = produto_id_param;
        
    ELSIF tipo_movimentacao = 'saida' THEN
        -- Para saída: apenas reduzir estoque (mantém preço médio)
        UPDATE produtos 
        SET 
            estoque = estoque - quantidade,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = produto_id_param;
        
    ELSIF tipo_movimentacao = 'ajuste' THEN
        -- Para ajuste: pode ser entrada ou saída dependendo do sinal da quantidade
        IF quantidade > 0 THEN
            -- Ajuste positivo: tratar como entrada
            preco_medio_calculado := calcular_preco_medio_ponderado(produto_id_param, quantidade, preco_unitario);
            
            UPDATE produtos 
            SET 
                estoque = estoque + quantidade,
                preco_custo = preco_medio_calculado,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = produto_id_param;
        ELSE
            -- Ajuste negativo: tratar como saída
            UPDATE produtos 
            SET 
                estoque = estoque + quantidade, -- quantidade já é negativa
                updated_at = CURRENT_TIMESTAMP
            WHERE id = produto_id_param;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para atualizar automaticamente o preço médio
CREATE OR REPLACE FUNCTION trigger_atualizar_preco_medio() RETURNS TRIGGER AS $$
BEGIN
    -- Chamar função de atualização quando uma movimentação é confirmada
    IF NEW.status = 'confirmado' AND OLD.status != 'confirmado' THEN
        -- Atualizar estoque e preço médio para cada item
        PERFORM atualizar_estoque_preco_medio(
            mi.produto_id, 
            mi.quantidade, 
            mi.preco_unitario, 
            NEW.tipo
        )
        FROM movimentacoes_itens mi 
        WHERE mi.movimentacao_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Aplicar trigger na tabela de movimentações
DROP TRIGGER IF EXISTS trigger_movimentacao_preco_medio ON movimentacoes_estoque;
CREATE TRIGGER trigger_movimentacao_preco_medio
    AFTER UPDATE ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION trigger_atualizar_preco_medio();

-- 8. Criar view para relatórios de estoque com valores totais
CREATE OR REPLACE VIEW estoque_com_valores AS
SELECT 
    p.id,
    p.nome,
    p.descricao,
    p.categoria,
    p.codigo_barras,
    p.estoque,
    p.estoque_minimo,
    p.preco_venda,
    p.preco_custo,
    -- Valores totais
    ROUND(p.estoque * p.preco_custo, 2) as valor_total_custo,
    ROUND(p.estoque * p.preco_venda, 2) as valor_total_venda,
    ROUND((p.estoque * p.preco_venda) - (p.estoque * p.preco_custo), 2) as margem_lucro,
    -- Margem percentual
    CASE 
        WHEN p.preco_custo > 0 THEN 
            ROUND(((p.preco_venda - p.preco_custo) / p.preco_custo) * 100, 2)
        ELSE 0 
    END as margem_percentual,
    -- Status do estoque
    CASE 
        WHEN p.estoque = 0 THEN 'sem_estoque'
        WHEN p.estoque <= p.estoque_minimo THEN 'estoque_baixo'
        ELSE 'estoque_ok'
    END as status_estoque,
    p.ativo,
    p.created_at,
    p.updated_at
FROM produtos p
WHERE p.ativo = true;

-- 9. Comentários para documentação
COMMENT ON FUNCTION calcular_preco_medio_ponderado IS 'Calcula o preço médio ponderado baseado no estoque atual e nova entrada';
COMMENT ON FUNCTION atualizar_estoque_preco_medio IS 'Atualiza estoque e preço médio baseado no tipo de movimentação';
COMMENT ON VIEW estoque_com_valores IS 'View com valores totais de custo e venda do estoque';

-- 10. Exemplo de uso das funções (comentado)
/*
-- Exemplo: Entrada de 100 unidades a R$ 15,00
-- SELECT atualizar_estoque_preco_medio(1, 100, 15.00, 'entrada');

-- Exemplo: Saída de 50 unidades
-- SELECT atualizar_estoque_preco_medio(1, 50, 0, 'saida');

-- Consultar estoque com valores
-- SELECT * FROM estoque_com_valores WHERE id = 1;
*/
