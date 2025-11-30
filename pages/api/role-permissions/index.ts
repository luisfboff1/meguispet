import { createServerClient } from "@supabase/ssr";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Permissoes, UserRole } from "@/types/permissions";
import { PERMISSIONS_PRESETS } from "@/types/permissions";

/**
 * API Route: /api/role-permissions
 *
 * GET - Lista todas as configurações de permissões por role
 * POST - Salva/atualiza configuração de permissões de um role
 *
 * Gerencia a tabela role_permissions_config no banco de dados
 */

interface RolePermissionConfig {
    role: UserRole;
    permissions: Partial<Permissoes>;
    updated_at: string;
    updated_by?: number;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<
        ApiResponse<RolePermissionConfig | RolePermissionConfig[]>
    >,
) {
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

        // Authenticate user
        const { data: { user }, error: authError } = await supabase.auth
            .getUser();

        if (authError || !user) {
            return res.status(401).json({
                success: false,
                error: "Não autenticado",
            });
        }

        // Check if user is admin
        const { data: currentUser } = await supabase
            .from("usuarios")
            .select("tipo_usuario")
            .eq("supabase_user_id", user.id)
            .single();

        if (!currentUser || currentUser.tipo_usuario !== "admin") {
            return res.status(403).json({
                success: false,
                error:
                    "Apenas administradores podem configurar permissões de roles",
            });
        }

        // Handle methods
        switch (req.method) {
            case "GET":
                return handleGetAll(supabase, res);
            case "POST":
                return handleSave(supabase, req.body, res);
            default:
                return res.status(405).json({
                    success: false,
                    error: "Method not allowed",
                });
        }
    } catch (error) {
        console.error("Error in role-permissions API:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno do servidor",
        });
    }
}

/**
 * GET /api/role-permissions
 * Lista todas as configurações de roles
 */
async function handleGetAll(
    supabase: ReturnType<typeof createServerClient>,
    res: NextApiResponse<ApiResponse<RolePermissionConfig[]>>,
) {
    const { data: configs, error } = await supabase
        .from("role_permissions_config")
        .select("*")
        .order("role", { ascending: true });

    if (error) {
        console.error("Error fetching role configs:", error);
        return res.status(500).json({
            success: false,
            error: "Erro ao buscar configurações",
        });
    }

    // Se não existe configuração no banco, retornar presets padrão
    const allConfigs: RolePermissionConfig[] = [];
    const roles: UserRole[] = [
        "admin",
        "gerente",
        "vendedor",
        "financeiro",
        "estoque",
        "operador",
        "visualizador",
    ];

    for (const role of roles) {
        const existingConfig = configs?.find((c: RolePermissionConfig) =>
            c.role === role
        );
        if (existingConfig) {
            allConfigs.push(existingConfig as RolePermissionConfig);
        } else {
            // Usar preset padrão
            allConfigs.push({
                role,
                permissions: PERMISSIONS_PRESETS[role],
                updated_at: new Date().toISOString(),
            });
        }
    }

    return res.status(200).json({
        success: true,
        data: allConfigs,
    });
}

/**
 * POST /api/role-permissions
 * Salva/atualiza configuração de um role
 */
async function handleSave(
    supabase: ReturnType<typeof createServerClient>,
    body: { role: UserRole; permissions: Partial<Permissoes> },
    res: NextApiResponse<ApiResponse<RolePermissionConfig>>,
) {
    const { role, permissions } = body;

    if (!role || !permissions) {
        return res.status(400).json({
            success: false,
            error: "Role e permissions são obrigatórios",
        });
    }

    // Verificar se role é válido
    const validRoles: UserRole[] = [
        "admin",
        "gerente",
        "vendedor",
        "financeiro",
        "estoque",
        "operador",
        "visualizador",
    ];
    if (!validRoles.includes(role)) {
        return res.status(400).json({
            success: false,
            error: "Role inválido",
        });
    }

    // Upsert na tabela (insert or update)
    const { data, error } = await supabase
        .from("role_permissions_config")
        .upsert({
            role,
            permissions,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: "role",
        })
        .select()
        .single();

    if (error) {
        console.error("Error saving role config:", error);
        return res.status(500).json({
            success: false,
            error: "Erro ao salvar configuração",
        });
    }

    return res.status(200).json({
        success: true,
        data: data as RolePermissionConfig,
        message: "Configuração salva com sucesso",
    });
}
