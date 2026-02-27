import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 1) Vendedor 17
const { data: vend } = await sb.from('vendedores').select('id, nome, usuario_id, email').eq('id', 17).single();
console.log('\n=== VENDEDOR 17 ===');
console.log(JSON.stringify(vend, null, 2));

// 2) Usuario vinculado
if (vend?.usuario_id) {
  const { data: usr } = await sb.from('usuarios').select('id, nome, email, tipo_usuario, vendedor_id').eq('id', vend.usuario_id).single();
  console.log('\n=== USUÁRIO VINCULADO ===');
  console.log(JSON.stringify(usr, null, 2));
}

// 3) Vendas com vendedor_id = 17
const { data: vendas, count } = await sb
  .from('vendas')
  .select('id, numero_venda, data_venda, valor_final, status, vendedor_id', { count: 'exact' })
  .eq('vendedor_id', 17);
console.log(`\n=== VENDAS com vendedor_id=17: ${count} ===`);
if (vendas?.length) console.log('Primeiras:', JSON.stringify(vendas.slice(0, 5), null, 2));

// 4) Todos vendedor_ids distintos nas vendas
const { data: todasVendas } = await sb.from('vendas').select('vendedor_id').limit(2000);
if (todasVendas) {
  const ids = [...new Set(todasVendas.map(v => v.vendedor_id))].filter(Boolean).sort((a, b) => a - b);
  console.log('\n=== vendedor_ids distintos em todas as vendas ===');
  console.log(ids);
}

// 5) Todos vendedores na tabela
const { data: todosVendedores } = await sb.from('vendedores').select('id, nome, usuario_id').order('id');
console.log('\n=== TODOS OS VENDEDORES ===');
console.log(JSON.stringify(todosVendedores, null, 2));

// 6) Nome do vendedor nas vendas (join)
const { data: amostra } = await sb
  .from('vendas')
  .select('id, numero_venda, data_venda, status, vendedor_id')
  .order('data_venda', { ascending: false })
  .limit(10);
console.log('\n=== ÚLTIMAS 10 VENDAS (qualquer vendedor) ===');
console.log(JSON.stringify(amostra, null, 2));
