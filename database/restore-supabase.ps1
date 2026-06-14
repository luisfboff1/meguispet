param(
  [Alias("h", "?")]
  [switch]$Help,

  [Parameter(Position = 0)]
  [string]$Label,

  [Parameter(Position = 1)]
  [ValidateSet("full", "structure", "data")]
  [string]$Type = "full",

  [switch]$Yes
)

$ErrorActionPreference = "Stop"

trap {
  Write-Host "[ERROR] $($_.Exception.Message)"
  exit 1
}

function Show-Help {
  @'
Restaura um backup .sql (gerado por db:backup) para o Supabase via psql.

Uso:
  pnpm db:restore -- <label> [full|structure|data]
  pnpm db:restore -- 2026_06_14_115206 full
  pnpm db:restore                      (lista os backups disponiveis)

Le a connection string de SUPABASE_DB_URL (fallback DATABASE_URL). NUNCA hardcode
senha. Rode via Doppler (pnpm db:restore) para injetar a URL automaticamente.

Tipos:
  full       estrutura + dados   (ideal para banco VAZIO / disaster recovery)
  structure  apenas DDL
  data       apenas dados        (estrutura ja precisa existir)

Flags:
  -Yes       pula a confirmacao (use com cuidado em automacao)

Variaveis opcionais:
  RESTORE_PREFIX   default: meguispet  (use auth para restaurar o schema auth)
  BACKUP_ROOT      default: database\backups
  PG_BIN           ex: C:\Program Files\PostgreSQL\18\bin

ATENCAO: restaurar por cima de um banco com dados causa conflitos
(already exists / chave duplicada). Restaure em banco vazio, ou trunque as
tabelas alvo antes de um restore data. Para producao, prefira o PITR/snapshot
do Supabase.
'@
}

if ($Help) { Show-Help; exit 0 }

function Resolve-Psql {
  if ($env:PG_BIN) {
    $candidate = Join-Path $env:PG_BIN "psql.exe"
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }
  $cmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($version in 18, 17, 16, 15, 14, 13) {
    $candidate = "C:\Program Files\PostgreSQL\$version\bin\psql.exe"
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  throw "psql nao encontrado. Instale o PostgreSQL client ou defina PG_BIN."
}

$dbUrl = $null
$dbUrlSource = $null
if ($env:SUPABASE_DB_URL) {
  $dbUrl = $env:SUPABASE_DB_URL
  $dbUrlSource = "SUPABASE_DB_URL"
} elseif ($env:DATABASE_URL) {
  $dbUrl = $env:DATABASE_URL
  $dbUrlSource = "DATABASE_URL"
} else {
  throw "Falta SUPABASE_DB_URL. Rode: pnpm db:restore (via Doppler)."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backupRoot = if ($env:BACKUP_ROOT) { $env:BACKUP_ROOT } else { Join-Path $scriptDir "backups" }

if ([string]::IsNullOrWhiteSpace($Label)) {
  Write-Host "Backups disponiveis em $backupRoot :"
  if (Test-Path -LiteralPath $backupRoot) {
    Get-ChildItem -LiteralPath $backupRoot -Directory |
      Sort-Object Name -Descending |
      ForEach-Object { Write-Host "  $($_.Name)" }
  } else {
    Write-Host "  (nenhum - rode 'pnpm db:backup' primeiro)"
  }
  Write-Host ""
  Write-Host "Uso: pnpm db:restore -- <label> [full|structure|data]"
  exit 0
}

$psql = Resolve-Psql
$prefix = if ($env:RESTORE_PREFIX) { $env:RESTORE_PREFIX } else { "meguispet" }
$backupDir = Join-Path $backupRoot $Label
$file = Join-Path $backupDir "${prefix}_${Type}_${Label}.sql"

if (-not (Test-Path -LiteralPath $file)) {
  throw "Arquivo nao encontrado: $file"
}

# Host (mascarado) so para o usuario confirmar o destino.
$hostMatch = [regex]::Match($dbUrl, '@([^/:]+)')
$targetHost = if ($hostMatch.Success) { $hostMatch.Groups[1].Value } else { "(desconhecido)" }

Write-Host ""
Write-Host "==================================================="
Write-Host "SUPABASE RESTORE"
Write-Host "==================================================="
Write-Host "Arquivo:    $file"
Write-Host "Tipo:       $Type"
Write-Host "URL source: $dbUrlSource"
Write-Host "Destino:    $targetHost"
Write-Host ""
Write-Host "[!] Isto VAI ESCREVER no banco de destino e pode sobrescrever dados."
Write-Host "    Restaure em banco vazio ou trunque as tabelas antes (restore data)."
Write-Host ""

if (-not $Yes) {
  $confirm = Read-Host "Digite RESTAURAR para confirmar"
  if ($confirm -ne "RESTAURAR") {
    Write-Host "Cancelado."
    exit 0
  }
}

Write-Host ""
Write-Host "[RUN] psql restore ($Type)..."
& $psql $dbUrl "-v" "ON_ERROR_STOP=1" "--single-transaction" "-f" $file
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  throw "Restore falhou (psql exit=$exitCode). Nenhuma mudanca aplicada (transacao unica)."
}

Write-Host ""
Write-Host "==================================================="
Write-Host "RESTORE CONCLUIDO"
Write-Host "==================================================="
Write-Host "Arquivo: $file"
Write-Host ""
Write-Host "Proximos passos: confira contagem de registros e teste a aplicacao."
