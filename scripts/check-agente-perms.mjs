import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// 1) Permissão 'agente' em todos os roles configurados no banco
console.log('=== PERMISSÃO "agente" POR ROLE (role_permissions_config) ===');
const { data: roles } = await sb.from('role_permissions_config').select('role, permissions').order('role');
for (const r of roles || []) {
  const p = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
  console.log(`  ${r.role}: agente = ${p?.agente ?? 'NÃO DEFINIDO (undefined)'}`);
}

// 2) Todos os usuários ativos com tipo_usuario, permissoes, permissoes_custom
console.log('\n=== USUÁRIOS ATIVOS - ACESSO AO AGENTE ===');
const { data: users } = await sb
  .from('usuarios')
  .select('id, nome, email, tipo_usuario, permissoes, permissoes_custom, ativo')
  .eq('ativo', true)
  .order('tipo_usuario');

for (const u of users || []) {
  const perms = typeof u.permissoes === 'string' ? JSON.parse(u.permissoes) : (u.permissoes || {});
  const custom = typeof u.permissoes_custom === 'string' ? JSON.parse(u.permissoes_custom) : (u.permissoes_custom || {});
  const agenteBase = perms?.agente;
  const agenteCustom = custom?.agente;
  const agenteEfetivo = agenteCustom !== undefined ? agenteCustom : agenteBase;
  
  const status = agenteEfetivo === true ? '✅ TEM ACESSO' : '❌ SEM ACESSO';
  const detalhe = agenteCustom !== undefined ? `(custom: ${agenteCustom})` : `(base: ${agenteBase})`;
  console.log(`  [${u.tipo_usuario}] ${u.nome} — ${status} ${detalhe}`);
}

// 3) Verificar onde o agente é guardado e checado no backend
console.log('\n=== PERMISSÃO "agente" NO PRESET DO CÓDIGO (fallback) ===');
// Mostrar o que o banco tem para admin
const adminConfig = roles?.find(r => r.role === 'admin');
if (adminConfig) {
  const p = typeof adminConfig.permissions === 'string' ? JSON.parse(adminConfig.permissions) : adminConfig.permissions;
  const temAgente = 'agente' in (p || {});
  console.log(`  admin no banco: campo 'agente' existe? ${temAgente} | valor: ${p?.agente}`);
}
