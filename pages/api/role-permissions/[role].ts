import { createServerClient } from "@supabase/ssr";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Permissoes, UserRole } from "@/types/permissions";
import { PERMISSIONS_PRESETS } from "@/types/permissions";

/**
 * API Route: /api/role-permissions/[role]
 *
 * GET - Busca configuração de permissões de um role específico
 */

interface RolePermissionConfig {
    role: UserRole;
    permissions: Partial<Permissoes>;
    updated_at: string;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<RolePermissionConfig>>,
) {
    const { role } = req.query;

    if (!role || Array.isArray(role)) {
        return res.status(400).json({
            success: false,
            error: "Role inválido",
        });
    }

    // Only GET is supported
    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            error: "Method not allowed",
        });
    }

    try {
        // Create Supabase client
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return Object.keys(req.cookies).map((name) => ({
                            name,
                            value: req.cookies[name] || "",
                        }));
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) => {
                            res.setHeader(
                                "Set-Cookie",
                                `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict`,
                            );
                        });
                    },
                },
            },
        );

        // Buscar configuração do banco
        const { data: config, error } = await supabase
            .from("role_permissions_config")
            .select("*")
            .eq("role", role)
            .single();

        if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
            console.error("Error fetching role config:", error);
            return res.status(500).json({
                success: false,
                error: "Erro ao buscar configuração",
            });
        }

        // Se não existe configuração, retornar preset padrão
        if (!config) {
            const defaultPerms = PERMISSIONS_PRESETS[role as UserRole];
            if (!defaultPerms) {
                return res.status(404).json({
                    success: false,
                    error: "Role não encontrado",
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    role: role as UserRole,
                    permissions: defaultPerms,
                    updated_at: new Date().toISOString(),
                },
            });
        }

        return res.status(200).json({
            success: true,
            data: config as RolePermissionConfig,
        });
    } catch (error) {
        console.error("Error in role-permissions/[role] API:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno do servidor",
        });
    }
}
