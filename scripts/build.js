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
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, renameSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const distDir = join(rootDir, "dist");
const nextOutDir = join(rootDir, "out");
const apiDir = join(rootDir, "api");
const distApiDir = join(distDir, "api");
const nextDir = join(distDir, "_next");
const nextStaticDir = join(nextDir, "static");

const EXPORTED_HTML_FOLDERS_TO_SKIP = new Set(["api", "_next"]);

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
    let acessoViolado = false;
    try {
      execSync("npx next build", { cwd: rootDir, stdio: "inherit" });
    } catch (err) {
      const statusCode = typeof err?.status === "number" ? err.status : undefined;
      const isAccessViolation = statusCode === 3221225477 || statusCode === -1073741819;

      if (isAccessViolation) {
        if (!existsSync(nextOutDir)) {
          console.error("❌ Build encerrou com acesso inválido e a pasta 'out/' não foi gerada.");
          process.exit(1);
        }

        acessoViolado = true;
        console.warn("⚠️ Next.js finalizou com código 0xC0000005 (Access Violation em Windows).");
        console.warn("   Continuando processo de build. Considere executar com Node 20.x ou em ambiente Linux para evitar este aviso.");
      } else {
        throw err;
      }
    }

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
    if (acessoViolado) {
      console.warn("⚠️ Build concluído com aviso: Access Violation detectado, mas artefatos foram preservados.");
    }
  } catch (err) {
    console.error("❌ Erro ao executar build do Next.js:", err.message);
    if (typeof err.status !== "undefined") {
      console.error("   -> status:", err.status);
    }
    if (typeof err.signal !== "undefined") {
      console.error("   -> signal:", err.signal);
    }
    process.exit(1);
  }
}

/* ----------------------------
 * Gerar arquivos _next/data para autoExport
 * ---------------------------- */
function getBuildId() {
  if (!existsSync(nextStaticDir)) {
    console.warn("⚠️ Pasta _next/static não encontrada, pulando geração de _next/data.");
    return null;
  }

  const candidates = readdirSync(nextStaticDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !["chunks", "css", "media"].includes(name))
    .filter((name) => existsSync(join(nextStaticDir, name, "_buildManifest.js")));

  if (!candidates.length) {
    console.warn("⚠️ Nenhum buildId encontrado em _next/static.");
    return null;
  }

  if (candidates.length > 1) {
    console.warn("⚠️ Múltiplos buildIds encontrados, usando o primeiro:", candidates);
  }

  return candidates[0];
}

function collectHtmlFiles(dir, results = []) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXPORTED_HTML_FOLDERS_TO_SKIP.has(entry.name)) continue;
      collectHtmlFiles(fullPath, results);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) {
      results.push(fullPath);
    }
  }

  return results;
}

function getRouteFromHtml(relativePath) {
  const normalized = relativePath.split(/\\|\//).filter(Boolean);

  if (!normalized.length) return "index";

  const last = normalized[normalized.length - 1];

  if (last === "index.html") {
    normalized.pop();
    if (!normalized.length) return "index";
    return normalized.join("/");
  }

  normalized[normalized.length - 1] = last.replace(/\.html$/, "");
  return normalized.join("/");
}

function ensureDataFilesFromHtml(buildId) {
  if (!buildId) return;

  const htmlFiles = collectHtmlFiles(distDir);
  if (!htmlFiles.length) {
    console.warn("⚠️ Nenhum arquivo HTML encontrado para gerar _next/data.");
    return;
  }

  const dataBaseDir = join(nextDir, "data", buildId);
  mkdirSync(dataBaseDir, { recursive: true });

  htmlFiles.forEach((filePath) => {
    const relative = filePath.slice(distDir.length + 1);
    const routePath = getRouteFromHtml(relative);
    const htmlContent = readFileSync(filePath, "utf8");
    const dataMatch = htmlContent.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

    if (!dataMatch) {
      console.warn(`⚠️ Não foi possível extrair __NEXT_DATA__ de ${relative}`);
      return;
    }

    let jsonContent;
    try {
      const parsed = JSON.parse(dataMatch[1]);
      jsonContent = JSON.stringify(parsed);
    } catch (parseError) {
      console.warn(`⚠️ Falha ao parsear __NEXT_DATA__ de ${relative}:`, parseError.message);
      return;
    }

    const outputPath = join(dataBaseDir, `${routePath}.json`);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, jsonContent);
  });

  console.log(`✅ Arquivos _next/data gerados para ${htmlFiles.length} páginas.`);
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
  const buildId = getBuildId();
  ensureDataFilesFromHtml(buildId);
  generatePhpEnv(envVars);
  copyApi();
  copyHtaccess();
  verifyBuild();
})();
