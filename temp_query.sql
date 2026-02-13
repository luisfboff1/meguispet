-- Comparar valor_final da venda VS soma dos itens de petisco
SELECT
  v.id,
  v.valor_final AS valor_venda_completa,
  SUM(vi.quantidade * vi.preco_unitario) AS valor_apenas_petiscos_frango,
  v.valor_final - SUM(vi.quantidade * vi.preco_unitario) AS diferenca_outros_produtos
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id
JOIN produtos p ON vi.produto_id = p.id
JOIN vendedores vd ON v.vendedor_id = vd.id
WHERE v.status != 'cancelado'
  AND vd.nome = 'RODRIGO NEVES'
  AND p.nome ILIKE '%FRANGO%'
  AND (p.nome ILIKE '%PETICO%' OR p.nome ILIKE '%snack%' OR p.nome ILIKE '%petisco%' OR p.nome ILIKE '%treat%')
GROUP BY v.id, v.valor_final
HAVING v.valor_final - SUM(vi.quantidade * vi.preco_unitario) > 100
ORDER BY diferenca_outros_produtos DESC
LIMIT 10;
