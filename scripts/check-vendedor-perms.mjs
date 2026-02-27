import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Verificar permissões configuradas para o role 'vendedor' no banco
const { data: config, error } = await sb
  .from('role_permissions_config')
  .select('*')
  .eq('role', 'vendedor')
  .single();

console.log('Config vendedor no banco:', JSON.stringify(config, null, 2));
console.log('Erro:', error?.message);

// Verificar campos específicos
if (config?.permissions) {
  const perms = typeof config.permissions === 'string' ? JSON.parse(config.permissions) : config.permissions;
  console.log('\nPermissões chave:');
  console.log('  clientes_visualizar_todos:', perms.clientes_visualizar_todos);
  console.log('  vendas_visualizar_todas:', perms.vendas_visualizar_todas);
  console.log('\nTodas as permissões:', JSON.stringify(perms, null, 2));
}
