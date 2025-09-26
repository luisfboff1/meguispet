export const env = {
    // API e Autenticação
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api',
    JWT_SECRET: process.env.NEXT_PUBLIC_JWT_SECRET,

    // Banco de Dados
    DB_HOST: process.env.NEXT_PUBLIC_DB_HOST,
    DB_NAME: process.env.NEXT_PUBLIC_DB_NAME,
    DB_USER: process.env.NEXT_PUBLIC_DB_USER,
    DB_PASSWORD: process.env.NEXT_PUBLIC_DB_PASSWORD,

    // Configurações SMTP
    SMTP_HOST: process.env.NEXT_PUBLIC_SMTP_HOST,
    SMTP_PORT: process.env.NEXT_PUBLIC_SMTP_PORT,
    SMTP_USER: process.env.NEXT_PUBLIC_SMTP_USER,
    SMTP_PASS: process.env.NEXT_PUBLIC_SMTP_PASS,
    SMTP_FROM_NAME: process.env.NEXT_PUBLIC_SMTP_FROM_NAME,
    SMTP_FROM_EMAIL: process.env.NEXT_PUBLIC_SMTP_FROM_EMAIL,

    // Configurações IA
    GROQ_API_KEY: process.env.NEXT_PUBLIC_GROQ_API_KEY,
    GROQ_MODEL: process.env.NEXT_PUBLIC_GROQ_MODEL,
} as const

// Validação das variáveis de ambiente necessárias
export function validateEnv() {
    const requiredEnvs = [
        'API_URL',
        'JWT_SECRET',
        'DB_HOST',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASS',
        'SMTP_FROM_NAME',
        'SMTP_FROM_EMAIL',
        'GROQ_API_KEY',
        'GROQ_MODEL'
    ]

    const missingEnvs = requiredEnvs.filter(key => !env[key as keyof typeof env])

    if (missingEnvs.length > 0) {
        throw new Error(`Variáveis de ambiente necessárias não encontradas: ${missingEnvs.join(', ')}`)
    }
}
