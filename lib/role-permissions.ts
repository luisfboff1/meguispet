import type { SupabaseClient } from "@supabase/supabase-js";
import type { Permissoes, UserRole } from "@/types";
import { PERMISSIONS_PRESETS } from "@/types";

/**
 * Busca permissões dinâmicas do role em role_permissions_config
 * Se não existir configuração, retorna preset padrão
 */
export async function getRolePermissions(
  supabase: SupabaseClient,
  role: UserRole
): Promise<Partial<Permissoes>> {
  try {
    // Buscar configuração do banco
    const { data: config, error } = await supabase
      .from("role_permissions_config")
      .select("permissions")
      .eq("role", role)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching role permissions:", error);
      // Fallback to preset
      return PERMISSIONS_PRESETS[role] || {};
    }

    // Se não existe configuração, retornar preset padrão
    if (!config || !config.permissions) {
      return PERMISSIONS_PRESETS[role] || {};
    }

    // Parse JSON se for string
    let permissions = config.permissions;
    if (typeof permissions === "string") {
      try {
        permissions = JSON.parse(permissions);
      } catch (parseError) {
        console.error("Failed to parse permissions JSON:", parseError);
        return PERMISSIONS_PRESETS[role] || {};
      }
    }

    // Retornar permissões do banco
    return permissions as Partial<Permissoes>;
  } catch (error) {
    console.error("Error in getRolePermissions:", error);
    // Fallback to preset em caso de erro
    return PERMISSIONS_PRESETS[role] || {};
  }
}

/**
 * Busca permissões finais do usuário:
 * role_permissions_config[tipo_usuario] + permissoes_custom
 */
export async function getUserFinalPermissions(
  supabase: SupabaseClient,
  tipoUsuario: UserRole,
  permissoesCustom?: Partial<Permissoes> | null
): Promise<Permissoes> {
  // 1. Buscar permissões base do role (dinâmico!)
  const rolePermissions = await getRolePermissions(supabase, tipoUsuario);

  // 2. Merge com permissões customizadas (custom sobrescreve)
  const finalPermissions = {
    ...rolePermissions,
    ...(permissoesCustom || {}),
  };

  return finalPermissions as Permissoes;
}
