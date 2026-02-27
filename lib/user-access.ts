import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { getUserFinalPermissions } from "./role-permissions";
import { getSupabaseServiceRole } from "./supabase-auth";
import type { Permissoes, UserRole } from "@/types";

export type UserAccessQuery = {
    id?: number;
    email?: string;
    supabaseUserId?: string;
};

export type UserAccessProfile = {
    id: number;
    email?: string | null;
    tipoUsuario: string;
    role: string | null;
    vendedorId: number | null;
    permissions: Permissoes;
    canViewAllSales: boolean;
    canDeleteAllSales: boolean;
    canEditAllSales: boolean;
    canViewAllClients: boolean;
    schemaVersion: "modern" | "legacy";
};

const FULL_COLUMN_SET =
    "id, email, role, tipo_usuario, roles, permissoes_custom, vendedor_id";
const LEGACY_COLUMN_SET = "id, email, role";
const VIEW_ALL_ROLES = new Set(["admin", "gerente", "financeiro"]);
const DELETE_ALL_ROLES = new Set(["admin", "gerente"]);
const EDIT_ALL_ROLES = new Set(["admin", "gerente"]);

const isMissingColumnError = (error?: PostgrestError | null) => {
    if (!error) return false;
    if (error.code === "42703") return true;
    return error.message.toLowerCase().includes("does not exist");
};

const parsePermissions = (raw: unknown): Record<string, boolean> => {
    if (!raw) return {};
    if (typeof raw === "object" && !Array.isArray(raw)) {
        return raw as Record<string, boolean>;
    }
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                return parsed as Record<string, boolean>;
            }
        } catch (error) {
            return {};
        }
    }
    return {};
};

type RawUserRecord = {
    id?: number;
    email?: string | null;
    role?: string | null;
    tipo_usuario?: string | null;
    permissoes?: unknown;
    permissoes_custom?: unknown;
    vendedor_id?: number | null;
};

const buildUserQuery = (
    supabase: SupabaseClient,
    query: UserAccessQuery,
    columns: string,
) => {
    const builder = supabase.from("usuarios").select(columns);

    if (typeof query.id === "number") {
        return builder.eq("id", query.id).maybeSingle();
    }

    if (query.email) {
        return builder.eq("email", query.email).maybeSingle();
    }

    if (query.supabaseUserId) {
        return builder.eq("supabase_user_id", query.supabaseUserId)
            .maybeSingle();
    }

    throw new Error("fetchUserAccessProfile: missing user identifier");
};

export const fetchUserAccessProfile = async (
    supabase: SupabaseClient,
    query: UserAccessQuery,
): Promise<UserAccessProfile | null> => {
    let usedLegacyQuery = false;

    let { data, error } = await buildUserQuery(
        supabase,
        query,
        FULL_COLUMN_SET,
    );

    if (isMissingColumnError(error)) {
        usedLegacyQuery = true;
        ({ data, error } = await buildUserQuery(
            supabase,
            query,
            LEGACY_COLUMN_SET,
        ));
    }

    if (error || !data) {
        return null;
    }

    const record = data as RawUserRecord;

    if (!record?.id) {
        return null;
    }

    const tipoUsuario =
        (record?.tipo_usuario ?? record?.role ?? "operador") as UserRole;
    let vendedorId = usedLegacyQuery ? null : record?.vendedor_id ?? null;

    console.log("[user-access] fetchUserAccessProfile:", {
        userId: record?.id,
        email: record?.email,
        tipoUsuario,
        vendedor_id_from_db: record?.vendedor_id ?? "NULL",
        usedLegacyQuery,
    });

    // Fallback: if usuarios.vendedor_id is not set, look up from vendedores.usuario_id
    // Must use service role because the vendedores RLS policy blocks vendedor users from
    // selecting their own record (only admin/gerente/estoque can SELECT from vendedores).
    if (!vendedorId && !usedLegacyQuery && record?.id) {
        console.log(
            `[user-access] usuarios.vendedor_id é NULL para user ${record.id}, tentando fallback via vendedores.usuario_id...`,
        );
        try {
            const serviceClient = getSupabaseServiceRole();
            const { data: vendedor, error: vendedorLookupError } =
                await serviceClient
                    .from("vendedores")
                    .select("id, nome")
                    .eq("usuario_id", record.id)
                    .maybeSingle();
            console.log("[user-access] Fallback por usuario_id:", {
                record_id: record.id,
                vendedor_encontrado: vendedor?.id ?? null,
                vendedor_nome: vendedor?.nome ?? null,
                error: vendedorLookupError?.message ?? null,
            });
            vendedorId = vendedor?.id ?? null;

            // If still not found by usuario_id, try matching by email
            if (!vendedorId && record?.email) {
                const { data: vendedorByEmail, error: emailLookupError } =
                    await serviceClient
                        .from("vendedores")
                        .select("id, nome")
                        .eq("email", record.email)
                        .maybeSingle();
                console.log("[user-access] Fallback por email:", {
                    email: record.email,
                    vendedor_encontrado: vendedorByEmail?.id ?? null,
                    vendedor_nome: vendedorByEmail?.nome ?? null,
                    error: emailLookupError?.message ?? null,
                });
                vendedorId = vendedorByEmail?.id ?? null;
            }
        } catch (fallbackError) {
            console.error(
                "[user-access] Erro no fallback de vendedorId:",
                fallbackError,
            );
            // Service role unavailable — skip fallback
        }
    }

    console.log(
        `[user-access] vendedorId FINAL para user ${record?.id}: ${
            vendedorId ?? "NULL"
        }`,
    );

    // Buscar permissões DINÂMICAS de role_permissions_config + custom
    const customPermissions = parsePermissions(record?.permissoes_custom);
    const permissions = await getUserFinalPermissions(
        supabase,
        tipoUsuario,
        customPermissions,
    );

    const canViewAllSales = usedLegacyQuery
        ? true
        : VIEW_ALL_ROLES.has(tipoUsuario) ||
            permissions.vendas_visualizar_todas === true;

    const canDeleteAllSales = usedLegacyQuery
        ? true
        : DELETE_ALL_ROLES.has(tipoUsuario) ||
            permissions.vendas_deletar === true;

    const canEditAllSales = usedLegacyQuery
        ? true
        : EDIT_ALL_ROLES.has(tipoUsuario) ||
            permissions.vendas_editar === true;

    const canViewAllClients = usedLegacyQuery
        ? true
        : VIEW_ALL_ROLES.has(tipoUsuario) ||
            permissions.clientes_visualizar_todos === true;

    return {
        id: record.id,
        email: record?.email ?? null,
        tipoUsuario,
        role: record?.role ?? null,
        vendedorId,
        permissions,
        canViewAllSales,
        canDeleteAllSales,
        canEditAllSales,
        canViewAllClients,
        schemaVersion: usedLegacyQuery ? "legacy" : "modern",
    };
};
