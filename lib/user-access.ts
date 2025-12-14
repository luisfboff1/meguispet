import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { getUserFinalPermissions } from "./role-permissions";
import type { UserRole, Permissoes } from "@/types";

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

    const tipoUsuario = (record?.tipo_usuario ?? record?.role ?? "operador") as UserRole;
    const vendedorId = usedLegacyQuery ? null : record?.vendedor_id ?? null;

    // Buscar permissões DINÂMICAS de role_permissions_config + custom
    const customPermissions = parsePermissions(record?.permissoes_custom);
    const permissions = await getUserFinalPermissions(
        supabase,
        tipoUsuario,
        customPermissions
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
        schemaVersion: usedLegacyQuery ? "legacy" : "modern",
    };
};
