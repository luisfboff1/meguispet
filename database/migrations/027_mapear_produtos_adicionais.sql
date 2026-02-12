-- ============================================================================
-- Migration 027: Mapear Produtos Adicionais do Bling (IDs diferentes)
-- Data: 2026-02-12
-- Descrição: Mapeia produtos do Bling com IDs diferentes mas descrições similares
-- ============================================================================

-- Produtos não mapeados identificados na interface:
-- 1. Kit30 (ID: 16518343621)
-- 2. Kit15 Misto (ID: 16507480665)
-- 3. Kit10 Frango (ID: 16548907746)
-- 4. Kit15 Frango (ID: 16522775757)
-- 5. MeguisBox-60 (ID: 16562027038)

-- MAPEAMENTOS PRINCIPAIS
INSERT INTO bling_produtos_mapeamento (bling_produto_id, codigo, descricao, observacoes, ativo, created_at, updated_at)
VALUES
-- Kit30 Misto
(16518343621, '16518343621', 'Kit30 Petisco Snack Cremoso MeguisPet p/Gatos Sabor 2 Frango +2 Atum +2 Salmao Total 450g 30 saches', 'Kit misto: 10 frango + 10 atum + 10 salmão', true, NOW(), NOW()),
-- Kit15 Misto
(16507480665, '16507480665', 'Kit15 Petisco Snack Cremoso MeguisPet p/Gatos Sabor 1Frango +1Atum +1Salmao= 3 Pacotes Total 225g', 'Kit misto: 5 frango + 5 atum + 5 salmão', true, NOW(), NOW()),
-- Kit10 Frango
(16548907746, '16548907746', 'Kit10 Petisco Snack Cremoso MeguisPet p/Gatos Sabor Frango 1+1 = 2 Pacotes = Total 150g', NULL, true, NOW(), NOW()),
-- Kit15 Frango
(16522775757, '16522775757', 'Kit15 Petisco Snack Cremoso MeguisPet p/Gatos Sabor Frango 1+1+1 = 3 Pacotes=15 saches Total 225g', NULL, true, NOW(), NOW()),
-- MeguisBox-60
(16562027038, '16562027038', 'MeguisBox-60 Petisco Snack Cremoso p/Gatos 20 Frango - 20 Atum - 20 Salmao Total 900g - 60 saches + Colher Espremedora', 'Box misto: 20 frango + 20 atum + 20 salmão + 1 colher', true, NOW(), NOW())
ON CONFLICT (bling_produto_id) DO NOTHING;

-- MAPEAMENTO DE ITENS

-- 1. Kit30 Misto (10 frango + 10 atum + 10 salmão)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 10 FROM bling_produtos_mapeamento WHERE codigo = '16518343621'  -- Frango
UNION ALL
SELECT id, 5, 10 FROM bling_produtos_mapeamento WHERE codigo = '16518343621'  -- Atum
UNION ALL
SELECT id, 1, 10 FROM bling_produtos_mapeamento WHERE codigo = '16518343621'; -- Salmão

-- 2. Kit15 Misto (5 frango + 5 atum + 5 salmão)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 5 FROM bling_produtos_mapeamento WHERE codigo = '16507480665'  -- Frango
UNION ALL
SELECT id, 5, 5 FROM bling_produtos_mapeamento WHERE codigo = '16507480665'  -- Atum
UNION ALL
SELECT id, 1, 5 FROM bling_produtos_mapeamento WHERE codigo = '16507480665'; -- Salmão

-- 3. Kit10 Frango (10 saches frango)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 10 FROM bling_produtos_mapeamento WHERE codigo = '16548907746';

-- 4. Kit15 Frango (15 saches frango)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 15 FROM bling_produtos_mapeamento WHERE codigo = '16522775757';

-- 5. MeguisBox-60 (20 frango + 20 atum + 20 salmão + 1 colher)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 20 FROM bling_produtos_mapeamento WHERE codigo = '16562027038'  -- Frango
UNION ALL
SELECT id, 5, 20 FROM bling_produtos_mapeamento WHERE codigo = '16562027038'  -- Atum
UNION ALL
SELECT id, 1, 20 FROM bling_produtos_mapeamento WHERE codigo = '16562027038'  -- Salmão
UNION ALL
SELECT id, 9, 1 FROM bling_produtos_mapeamento WHERE codigo = '16562027038';  -- Colher

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Deve retornar 5 novos mapeamentos
SELECT COUNT(*) as novos_mapeamentos
FROM bling_produtos_mapeamento
WHERE codigo IN ('16518343621', '16507480665', '16548907746', '16522775757', '16562027038');

-- Deve retornar 12 novos itens (3+3+1+1+4)
SELECT COUNT(*) as novos_itens
FROM bling_produtos_mapeamento_itens i
JOIN bling_produtos_mapeamento m ON i.mapeamento_id = m.id
WHERE m.codigo IN ('16518343621', '16507480665', '16548907746', '16522775757', '16562027038');

-- Ver os novos mapeamentos
SELECT
  m.codigo,
  m.descricao as desc_bling,
  COUNT(i.id) as qtd_produtos_locais,
  STRING_AGG(p.nome || ' (x' || i.quantidade || ')', ', ') as produtos
FROM bling_produtos_mapeamento m
LEFT JOIN bling_produtos_mapeamento_itens i ON m.id = i.mapeamento_id
LEFT JOIN produtos p ON i.produto_local_id = p.id
WHERE m.codigo IN ('16518343621', '16507480665', '16548907746', '16522775757', '16562027038')
GROUP BY m.id, m.codigo, m.descricao
ORDER BY m.codigo;
