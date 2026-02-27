import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const { data } = await sb.from('clientes_fornecedores').select('*').limit(2);
console.log('Colunas:', Object.keys(data?.[0] ?? {}));
console.log('Amostra:', JSON.stringify(data?.[0], null, 2));

// Checar se há campo vendedor_id
const temVendedor = Object.keys(data?.[0] ?? {}).includes('vendedor_id');
console.log('\nTem campo vendedor_id?', temVendedor);

// Contar clientes com vendedor_id preenchido
const { count: comVendedor } = await sb.from('clientes_fornecedores').select('id', { count: 'exact' }).not('vendedor_id', 'is', null).eq('tipo', 'cliente');
const { count: total } = await sb.from('clientes_fornecedores').select('id', { count: 'exact' }).eq('tipo', 'cliente');
console.log(`\nClientes totais: ${total}, com vendedor_id preenchido: ${comVendedor}`);

// Clientes do vendedor 15 (Matheus)
const { count: doMatheus } = await sb.from('clientes_fornecedores').select('id', { count: 'exact' }).eq('vendedor_id', 15).eq('tipo', 'cliente');
console.log(`Clientes com vendedor_id=15 (Matheus): ${doMatheus}`);
