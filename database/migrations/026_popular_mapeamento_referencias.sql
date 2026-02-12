-- ============================================================================
-- Migration 026: Popular Mapeamento de Produtos Bling → Produtos Locais
-- Data: 2026-02-12
-- Descrição: Importa dados de referencias.csv para bling_produtos_mapeamento
-- ============================================================================

-- STEP 1: Criar produto "Colher" que não existe no banco
INSERT INTO produtos (
  id,
  nome,
  descricao,
  preco,
  preco_venda,
  preco_custo,
  estoque,
  estoque_minimo,
  categoria,
  codigo_barras,
  ativo,
  created_at,
  updated_at,
  ipi,
  icms,
  st,
  icms_proprio
) VALUES (
  9,  -- Próximo ID disponível
  'Colher Espremedora de Sachês MeguisPet',
  'Colher de alimentação espremedoura de sachês de petiscos para Gatos',
  0.00,
  3.00,  -- Ajuste conforme preço real
  1.00,  -- Ajuste conforme custo real
  0,
  0,
  'acessorios',
  NULL,
  true,
  NOW(),
  NOW(),
  0.00,
  0.00,
  0.00,
  4.00
);

-- STEP 2: Popular bling_produtos_mapeamento
INSERT INTO bling_produtos_mapeamento (bling_produto_id, codigo, descricao, observacoes, ativo, created_at, updated_at) VALUES
-- Mapeamentos 1:1 simples
(16601937060, '16601937060', 'Kit10 Petisco Snack Cremoso MeguisPet p/Gatos Atum 1+1 = 2 Pacotes = 10 saches Total 150g', NULL, true, NOW(), NOW()),
(16582297799, '16582297799', 'Areia Higiênica para Gatos MeguisPet Bentonita Premium 3kg', NULL, true, NOW(), NOW()),
(16578760874, '16578760874', 'Petisco Snack Cremoso p/Gatos Sabor Frango MeguisPet 5 saches 15g Total 75g', NULL, true, NOW(), NOW()),
(16570431774, '16570431774', 'Petisco Cremoso Sabor Atum 15g', NULL, true, NOW(), NOW()),
(16570431147, '16570431147', 'Petisco Cremoso Sabor Frango 15g', NULL, true, NOW(), NOW()),
(16570429992, '16570429992', 'Petisco Cremoso Sabor Salmao 15g', NULL, true, NOW(), NOW()),
(16566512618, '16566512618', 'Kit15 Petisco Snack Cremoso MeguisPet p/Gatos Sabor Frango 1+1+1 = 3 Pacotes=15 saches Total 225g', NULL, true, NOW(), NOW()),
(16566512365, '16566512365', 'Kit10 Petisco Snack Cremoso MeguisPet p/Gatos Atum 1+1 = 2 Pacotes = 10 saches Total 150g', NULL, true, NOW(), NOW()),
(16566512281, '16566512281', 'Kit10 Petisco Snack Cremoso MeguisPet p/Gatos Sabor Salmao 1+1 = 2 Pacotes = 10 saches Total 150g', NULL, true, NOW(), NOW()),
(16566512239, '16566512239', 'Petisco Snack Cremoso p/Gatos Sabor Salmao MeguisPet 5 saches 15g Total 75g', NULL, true, NOW(), NOW()),
(16566512151, '16566512151', 'Kit10 Petisco Snack Cremoso MeguisPet para Gatos Sabor frango 1+1 = 2 Pacotes = 10 saches Total 150g', NULL, true, NOW(), NOW()),
(16566512035, '16566512035', 'Kit15 Petisco Snack Cremoso MeguisPet p/Gatos Sabor Atum 1+1+1 = 3 Pacotes=15 saches Total 225g', NULL, true, NOW(), NOW()),
(16566511970, '16566511970', 'Kit15 Petisco Snack Cremoso MeguisPet p/Gatos Sabor Salmao 1+1+1=3 Pacotes=15 saches Total 225g', NULL, true, NOW(), NOW()),
(16566511938, '16566511938', 'Petisco Snack Cremoso p/Gatos Sabor Frango MeguisPet 5 saches 15g Total 75g', NULL, true, NOW(), NOW()),
(16566511784, '16566511784', 'Kit10 Petisco Snack Cremoso MeguisPet p/Gatos Sabor Frango 1+1 = 2 Pacotes = Total 150g', NULL, true, NOW(), NOW()),
(16566511639, '16566511639', 'Colher de alimentação espremedoura de sachês de petiscos para Gatos Meguispet', NULL, true, NOW(), NOW()),
(16566511328, '16566511328', 'Petisco Snack Cremoso p/Gatos Sabor Atum MeguisPet 5 saches 15g Total 75g', NULL, true, NOW(), NOW()),
-- Mapeamentos 1:N (kits mistos)
(16566512474, '16566512474', 'Kit15 Petisco Snack Cremoso MeguisPet p/Gatos Sabor 1Frango +1Atum +1Salmao= 3 Pacotes Total 225g', 'Kit misto: 5 frango + 5 atum + 5 salmão', true, NOW(), NOW()),
(16566511550, '16566511550', 'Kit30 Petisco Snack Cremoso MeguisPet p/Gatos Sabor 2 Frango +2 Atum +2 Salmao Total 450g 30 saches', 'Kit misto: 10 frango + 10 atum + 10 salmão', true, NOW(), NOW()),
(16566511466, '16566511466', 'MeguisBox-60 Petisco Snack Cremoso p/Gatos 20 Frango - 20 Atum - 20 Salmao Total 900g - 60 saches + Colher Espremedora', 'Box misto: 20 frango + 20 atum + 20 salmão + 1 colher', true, NOW(), NOW());

-- STEP 3: Popular bling_produtos_mapeamento_itens

-- 1. Kit10 Atum (10 saches atum)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 5, 10 FROM bling_produtos_mapeamento WHERE codigo = '16601937060';

-- 2. Areia Bentonita 3kg
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 8, 1 FROM bling_produtos_mapeamento WHERE codigo = '16582297799';

-- 3. Petisco Frango 5 saches
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 5 FROM bling_produtos_mapeamento WHERE codigo = '16578760874';

-- 4. Petisco Atum 1 sachê
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 5, 1 FROM bling_produtos_mapeamento WHERE codigo = '16570431774';

-- 5. Petisco Frango 1 sachê
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 1 FROM bling_produtos_mapeamento WHERE codigo = '16570431147';

-- 6. Petisco Salmão 1 sachê
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 1, 1 FROM bling_produtos_mapeamento WHERE codigo = '16570429992';

-- 7. Kit15 Frango (15 saches frango)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 15 FROM bling_produtos_mapeamento WHERE codigo = '16566512618';

-- 8. Kit15 Misto (5 frango + 5 atum + 5 salmão)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 5 FROM bling_produtos_mapeamento WHERE codigo = '16566512474'
UNION ALL
SELECT id, 5, 5 FROM bling_produtos_mapeamento WHERE codigo = '16566512474'
UNION ALL
SELECT id, 1, 5 FROM bling_produtos_mapeamento WHERE codigo = '16566512474';

-- 9. Kit10 Atum (duplicado - mesmo que #1)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 5, 10 FROM bling_produtos_mapeamento WHERE codigo = '16566512365';

-- 10. Kit10 Salmão (10 saches salmão)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 1, 10 FROM bling_produtos_mapeamento WHERE codigo = '16566512281';

-- 11. Petisco Salmão 5 saches
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 1, 5 FROM bling_produtos_mapeamento WHERE codigo = '16566512239';

-- 12. Kit10 Frango (10 saches frango)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 10 FROM bling_produtos_mapeamento WHERE codigo = '16566512151';

-- 13. Kit15 Atum (15 saches atum)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 5, 15 FROM bling_produtos_mapeamento WHERE codigo = '16566512035';

-- 14. Kit15 Salmão (15 saches salmão)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 1, 15 FROM bling_produtos_mapeamento WHERE codigo = '16566511970';

-- 15. Petisco Frango 5 saches (duplicado - mesmo que #3)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 5 FROM bling_produtos_mapeamento WHERE codigo = '16566511938';

-- 16. Kit10 Frango (duplicado - mesmo que #12)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 10 FROM bling_produtos_mapeamento WHERE codigo = '16566511784';

-- 17. Colher espremedora
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 9, 1 FROM bling_produtos_mapeamento WHERE codigo = '16566511639';

-- 18. Kit30 Misto (10 frango + 10 atum + 10 salmão)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 10 FROM bling_produtos_mapeamento WHERE codigo = '16566511550'
UNION ALL
SELECT id, 5, 10 FROM bling_produtos_mapeamento WHERE codigo = '16566511550'
UNION ALL
SELECT id, 1, 10 FROM bling_produtos_mapeamento WHERE codigo = '16566511550';

-- 19. MeguisBox-60 (20 frango + 20 atum + 20 salmão + 1 colher)
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 4, 20 FROM bling_produtos_mapeamento WHERE codigo = '16566511466'
UNION ALL
SELECT id, 5, 20 FROM bling_produtos_mapeamento WHERE codigo = '16566511466'
UNION ALL
SELECT id, 1, 20 FROM bling_produtos_mapeamento WHERE codigo = '16566511466'
UNION ALL
SELECT id, 9, 1 FROM bling_produtos_mapeamento WHERE codigo = '16566511466';

-- 20. Petisco Atum 5 saches
INSERT INTO bling_produtos_mapeamento_itens (mapeamento_id, produto_local_id, quantidade)
SELECT id, 5, 5 FROM bling_produtos_mapeamento WHERE codigo = '16566511328';

-- ============================================================================
-- VERIFICAÇÃO: Contar registros criados
-- ============================================================================

-- Deve retornar 20 mapeamentos
SELECT COUNT(*) as total_mapeamentos FROM bling_produtos_mapeamento;

-- Deve retornar 28 itens (16 simples + 3*3 mistos + 4 box)
SELECT COUNT(*) as total_itens FROM bling_produtos_mapeamento_itens;

-- Ver todos os mapeamentos com seus produtos
SELECT
  m.codigo,
  m.descricao as desc_bling,
  COUNT(i.id) as qtd_produtos_locais,
  STRING_AGG(p.nome || ' (x' || i.quantidade || ')', ', ') as produtos
FROM bling_produtos_mapeamento m
LEFT JOIN bling_produtos_mapeamento_itens i ON m.id = i.mapeamento_id
LEFT JOIN produtos p ON i.produto_local_id = p.id
GROUP BY m.id, m.codigo, m.descricao
ORDER BY m.codigo;
