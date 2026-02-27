import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Buscar config atual
const { data: config } = await sb.from('role_permissions_config').select('permissions').eq('role', 'vendedor').single();
const perms = typeof config.permissions === 'string' ? JSON.parse(config.permissions) : config.permissions;

console.log('ANTES - clientes_visualizar_todos:', perms.clientes_visualizar_todos);

// Corrigir: vendedor não deve ver todos os clientes, apenas os seus
perms.clientes_visualizar_todos = false;

const { error } = await sb
  .from('role_permissions_config')
  .update({ permissions: perms, updated_at: new Date().toISOString() })
  .eq('role', 'vendedor');

if (error) {
  console.error('ERRO ao atualizar:', error.message);
  process.exit(1);
}

// Confirmar
const { data: updated } = await sb.from('role_permissions_config').select('permissions').eq('role', 'vendedor').single();
const updatedPerms = typeof updated.permissions === 'string' ? JSON.parse(updated.permissions) : updated.permissions;
console.log('DEPOIS - clientes_visualizar_todos:', updatedPerms.clientes_visualizar_todos);
console.log('\n✅ Vendedor agora só vê os próprios clientes (vendedor_id = seu id).');
console.log('✅ Ao criar cliente, o vendedor_id é auto-atribuído para ele.');
