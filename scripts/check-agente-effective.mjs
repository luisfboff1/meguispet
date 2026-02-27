import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Presets from code (simplified to only 'agente' key for this check)
const ADMIN_PRESET_AGENTE = true;   // PERMISSIONS_PRESETS.admin.agente = true
const VENDEDOR_PRESET_AGENTE = false;

// 1) role_permissions_config rows
console.log('=== ROLE_PERMISSIONS_CONFIG ===');
const { data: roles } = await sb.from('role_permissions_config').select('role, permissions').order('role');
const roleMap = {};
for (const r of roles || []) {
  const p = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
  roleMap[r.role] = p;
  console.log(`  ${r.role}: agente = ${p?.agente ?? 'KEY MISSING (fallback to preset)'}`);
}
if ((roles || []).length === 0) console.log('  (nenhum row)');

// 2) Per-user effective agente permission (simulating getUserFinalPermissions)
console.log('\n=== PERMISSÃO EFECTIVA "agente" POR USUÁRIO ===');
const { data: users } = await sb
  .from('usuarios')
  .select('id, nome, email, tipo_usuario, permissoes_custom, ativo')
  .eq('ativo', true)
  .order('tipo_usuario');

for (const u of users || []) {
  const role = u.tipo_usuario;
  // Step 1: role base from DB or preset
  let roleAgente;
  if (roleMap[role] && 'agente' in roleMap[role]) {
    roleAgente = roleMap[role].agente;
    var source = `DB role_permissions_config[${role}]`;
  } else {
    // Fallback to preset
    roleAgente = role === 'admin' ? ADMIN_PRESET_AGENTE : VENDEDOR_PRESET_AGENTE;
    var source = `PRESET[${role}]`;
  }

  // Step 2: apply permissoes_custom override
  const custom = typeof u.permissoes_custom === 'string' ? JSON.parse(u.permissoes_custom || '{}') : (u.permissoes_custom || {});
  let finalAgente = roleAgente;
  let overrideNote = '';
  if ('agente' in custom) {
    finalAgente = custom.agente;
    overrideNote = ` [OVERRIDE custom.agente=${custom.agente}]`;
  }

  const status = finalAgente === true ? '✅ ACESSO' : '❌ BLOQUEADO';
  console.log(`  [${role}] ${u.nome} — ${status} (base: ${source}=${roleAgente}${overrideNote})`);
}
