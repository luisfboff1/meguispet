import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

console.log('=== DIAGNÓSTICO ANTES DA CORREÇÃO ===');

// Conferir vendas no vendedor 15
const { data: vendas15, count: c15 } = await sb
  .from('vendas')
  .select('id, numero_venda, data_venda, valor_final, status', { count: 'exact' })
  .eq('vendedor_id', 15)
  .order('data_venda', { ascending: false });
console.log(`Vendedor 15 (MATHEUS LUCAS MURANO): ${c15} vendas`);
if (vendas15?.length) console.log('Últimas 5:', JSON.stringify(vendas15.slice(0,5), null, 2));

// Conferir vendas no vendedor 16
const { count: c16 } = await sb.from('vendas').select('id', { count: 'exact' }).eq('vendedor_id', 16);
console.log(`Vendedor 16 (Matheus Luca duplicado): ${c16} vendas`);

// Conferir vendas no vendedor 17
const { count: c17 } = await sb.from('vendas').select('id', { count: 'exact' }).eq('vendedor_id', 17);
console.log(`Vendedor 17 (Matheus Luca vinculado ao user 14): ${c17} vendas`);

console.log('\n=== APLICANDO CORREÇÃO ===');
console.log('1. Desvinculando user 14 do vendedor 17...');
const { error: e1 } = await sb.from('vendedores').update({ usuario_id: null }).eq('id', 17);
if (e1) { console.error('ERRO:', e1.message); process.exit(1); }
console.log('   OK');

console.log('2. Vinculando user 14 ao vendedor 15 (onde estão as vendas)...');
const { error: e2 } = await sb.from('vendedores').update({ usuario_id: 14 }).eq('id', 15);
if (e2) { console.error('ERRO:', e2.message); process.exit(1); }
console.log('   OK');

console.log('3. Atualizando usuarios.vendedor_id de 17 para 15...');
const { error: e3 } = await sb.from('usuarios').update({ vendedor_id: 15 }).eq('id', 14);
if (e3) { console.error('ERRO:', e3.message); process.exit(1); }
console.log('   OK');

console.log('\n=== VERIFICAÇÃO FINAL ===');
const { data: vEnd } = await sb.from('vendedores').select('id, nome, usuario_id').in('id', [15, 16, 17]);
console.log('Vendedores 15/16/17:', JSON.stringify(vEnd, null, 2));

const { data: uEnd } = await sb.from('usuarios').select('id, nome, tipo_usuario, vendedor_id').eq('id', 14).single();
console.log('Usuário 14:', JSON.stringify(uEnd, null, 2));

const { count: cFinal } = await sb.from('vendas').select('id', { count: 'exact' }).eq('vendedor_id', 15);
console.log(`Vendas do vendedor 15 (agora vinculado ao Matheus): ${cFinal}`);

console.log('\n✅ Correção aplicada! Matheus Luca (user 14) agora está vinculado ao vendedor 15 com todas as vendas históricas.');
