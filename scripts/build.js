#!/usr/bin/env node
/**
 * 🚀 Build Script Unificado - MeguisPet Admin
 * 
 * Compatível com Next.js + PHP (Hostinger)
 * - Detecta ambiente (local vs CI/CD)
 * - Carrega variáveis de ambiente (.env.local ou process.env)
 * - Cria build do Next + export estático
 * - Gera .env do PHP e copia API
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const distDir = join(rootDir, "dist");
const nextOutDir = join(rootDir, "out");
const apiDir = join(rootDir, "api");
const distApiDir = join(distDir, "api");

/* ----------------------------
 * Detectar ambiente
 * ---------------------------- */
function detectEnvironment() {
  const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  const isLocal = !isCI;
  console.log(`📍 Ambiente detectado: ${isCI ? "CI/CD (GitHub Actions)" : "Local"}`);
  return { isCI, isLocal };
}

/* ----------------------------
 * Carregar variáveis de ambiente
 * ---------------------------- */
function loadEnvironmentVariables(isLocal) {
  const envVars = {};

  if (isLocal) {
    const envLocalPath = join(rootDir, ".env.local");
    if (existsSync(envLocalPath)) {
      console.log("📄 Carregando variáveis do .env.local...");
      const content = readFileSync(envLocalPath, "utf8");
      content.split("\n").forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
          }
        }
      });
    } else {
      console.log("⚠️ .env.local não encontrado — usando variáveis padrão.");
    }
  } else {
    console.log("📄 Carregando variáveis do ambiente CI (GitHub Secrets)...");
    Object.keys(process.env).forEach(key => {
      if (key.startsWith("NEXT_PUBLIC_") || key.match(/^(DB_|SMTP_|JWT_|GROQ_)/)) {
        envVars[key] = process.env[key];
      }
    });
  }

  // Fallback
  if (!envVars.NEXT_PUBLIC_API_URL) {
    envVars.NEXT_PUBLIC_API_URL = "/api";
  }

  console.log(`✅ Carregadas ${Object.keys(envVars).length} variáveis de ambiente.`);
  return envVars;
}

/* ----------------------------
 * Preparar diretórios
 * ---------------------------- */
function prepareDirectories() {
  if (existsSync(distDir)) {
    console.log("🧹 Limpando dist/ anterior...");
    rmSync(distDir, { recursive: true, force: true });
  }
  if (existsSync(nextOutDir)) {
    rmSync(nextOutDir, { recursive: true, force: true });
  }
}

/* ----------------------------
 * Build e export do Next.js
 * ---------------------------- */
function buildNext(envVars) {
  console.log("🏗️ Executando build/export do Next.js...");
  try {
    // Injetar envs públicas no processo do build
    Object.keys(envVars).forEach(k => (process.env[k] = envVars[k]));
    execSync("npx next build", { cwd: rootDir, stdio: "inherit" });

    if (existsSync(nextOutDir)) {
      if (existsSync(distDir)) {
        try {
          rmSync(distDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.warn("⚠️ Não foi possível limpar dist/ antes do rename:", cleanupError.message);
        }
      }

      try {
        renameSync(nextOutDir, distDir);
      } catch (renameError) {
        if (renameError.code === "EPERM" || renameError.code === "EXDEV") {
          console.warn("⚠️ Falha ao renomear out → dist (", renameError.code, ") — tentando cópia em vez disso.");
          mkdirSync(distDir, { recursive: true });
          cpSync(nextOutDir, distDir, { recursive: true });
          rmSync(nextOutDir, { recursive: true, force: true });
        } else {
          throw renameError;
        }
      }
    } else if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }
    console.log("✅ Next.js build/export concluído.");
  } catch (err) {
    console.error("❌ Erro ao executar build do Next.js:", err.message);
    process.exit(1);
  }
}

/* ----------------------------
 * Gerar .env para PHP
 * ---------------------------- */
function generatePhpEnv(envVars) {
  console.log("🔧 Gerando .env da API PHP...");
  mkdirSync(distApiDir, { recursive: true });
  const phpKeys = [
    "DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET",
    "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM_NAME",
    "SMTP_FROM_EMAIL", "GROQ_API_KEY", "GROQ_MODEL"
  ];
  let content = "# .env gerado automaticamente\n";
  phpKeys.forEach(k => (content += `${k}=${envVars[k] || ""}\n`));
  writeFileSync(join(distApiDir, ".env"), content);
  console.log("✅ dist/api/.env criado.");
}

/* ----------------------------
 * Copiar API PHP
 * ---------------------------- */
function copyApi() {
  console.log("📋 Copiando API PHP...");
  if (!existsSync(apiDir)) {
    console.warn("⚠️ Pasta api/ não encontrada.");
    return;
  }
  mkdirSync(distApiDir, { recursive: true });
  cpSync(apiDir, distApiDir, {
    recursive: true,
    filter: src => !src.includes("vendor") && !src.endsWith(".env") && !src.includes("composer.lock"),
  });
  console.log("✅ API copiada para dist/api.");
}

/* ----------------------------
 * Copiar .htaccess
 * ---------------------------- */
function copyHtaccess() {
  const htaccessPath = join(rootDir, ".htaccess");
  if (existsSync(htaccessPath)) {
    cpSync(htaccessPath, join(distDir, ".htaccess"));
    console.log("✅ .htaccess copiado.");
  } else {
    console.log("⚠️ .htaccess não encontrado.");
  }
}

/* ----------------------------
 * Verificar resultado final
 * ---------------------------- */
function verifyBuild() {
  console.log("🔍 Verificando estrutura final...");
  const checks = [
    { name: "Frontend Next.js", path: join(distDir, "index.html") },
    { name: "API PHP", path: join(distApiDir, "index.php") },
    { name: ".env PHP", path: join(distApiDir, ".env") },
  ];

  let allGood = true;
  for (const check of checks) {
    if (existsSync(check.path)) console.log(`✅ ${check.name}`);
    else {
      console.warn(`❌ ${check.name} ausente`);
      allGood = false;
    }
  }

  if (allGood) console.log("🎉 Build unificado concluído com sucesso!");
  else {
    console.error("⚠️ Falha parcial — verifique dist/");
    process.exit(1);
  }
}

/* ----------------------------
 * Execução principal
 * ---------------------------- */
(async () => {
  const { isLocal } = detectEnvironment();
  const envVars = loadEnvironmentVariables(isLocal);
//   prepareDirectories();
  buildNext(envVars);
  generatePhpEnv(envVars);
  copyApi();
  copyHtaccess();
  verifyBuild();
})();
