#!/usr/bin/env node

/**
 * Script para verificar se o Doppler CLI está instalado e configurado
 * Usado antes de rodar comandos que dependem do Doppler
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Cores para output (funciona em Windows e Unix)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkDopplerInstalled() {
  try {
    execSync('doppler --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkDopplerConfigured() {
  const dopplerConfigPath = join(projectRoot, '.doppler.yaml');
  return existsSync(dopplerConfigPath);
}

function checkDopplerAuthenticated() {
  try {
    execSync('doppler me', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  log('\n🔍 Verificando configuração do Doppler...\n', 'cyan');

  // 1. Verificar se Doppler está instalado
  if (!checkDopplerInstalled()) {
    log('❌ Doppler CLI não está instalado!', 'red');
    log('\n📚 Como instalar:', 'yellow');
    log('   Windows (PowerShell como Admin): scoop install doppler');
    log('   macOS: brew install dopplerhq/cli/doppler');
    log('   Linux: veja DOPPLER_SETUP.md\n');
    log('💡 Alternativa: use pnpm dev:local para rodar sem Doppler\n', 'blue');
    process.exit(1);
  }
  log('✅ Doppler CLI instalado', 'green');

  // 2. Verificar se está autenticado
  if (!checkDopplerAuthenticated()) {
    log('❌ Não está autenticado no Doppler!', 'red');
    log('\n📚 Execute:', 'yellow');
    log('   doppler login\n');
    process.exit(1);
  }
  log('✅ Autenticado no Doppler', 'green');

  // 3. Verificar se o projeto está configurado
  if (!checkDopplerConfigured()) {
    log('⚠️  Projeto não está configurado!', 'yellow');
    log('\n📚 Execute:', 'yellow');
    log('   doppler setup\n');
    log('💡 Selecione o projeto "meguispet" e ambiente "dev"\n', 'blue');
    process.exit(1);
  }
  log('✅ Projeto configurado (.doppler.yaml encontrado)', 'green');

  // 3.1 Verificar se é o projeto correto (meguispet)
  try {
    const currentProject = execSync('doppler configure get project', {
      stdio: 'pipe',
      encoding: 'utf-8'
    }).trim();

    if (currentProject !== 'meguispet') {
      log(`⚠️  Projeto incorreto: "${currentProject}"`, 'yellow');
      log('\n📚 Este projeto deve usar o projeto Doppler "meguispet"', 'yellow');
      log('Execute:', 'yellow');
      log('   doppler setup --project meguispet --config dev\n', 'yellow');
      process.exit(1);
    }
    log('✅ Projeto correto: meguispet', 'green');
  } catch {
    log('⚠️  Não foi possível verificar o projeto', 'yellow');
  }

  // 4. Verificar secrets disponíveis
  try {
    const secrets = execSync('doppler secrets --json', {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    const secretsObj = JSON.parse(secrets);
    const secretCount = Object.keys(secretsObj).length;

    log(`✅ ${secretCount} variável(is) de ambiente disponível(is)`, 'green');

    // Verificar variáveis críticas do Supabase
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missingVars = requiredVars.filter(v => !secretsObj[v]);

    if (missingVars.length > 0) {
      log('\n⚠️  Variáveis críticas faltando:', 'yellow');
      missingVars.forEach(v => log(`   - ${v}`, 'yellow'));
      log('\n💡 Configure essas variáveis no dashboard do Doppler:', 'blue');
      log('   https://dashboard.doppler.com/\n');
    }
  } catch (error) {
    log('⚠️  Não foi possível verificar secrets', 'yellow');
  }

  log('\n✨ Tudo pronto! Você pode rodar pnpm dev\n', 'green');
  process.exit(0);
}

main();
