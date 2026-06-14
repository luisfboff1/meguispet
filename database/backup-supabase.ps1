param(
  [Alias("h", "?")]
  [switch]$Help,

  [Parameter(Position = 0)]
  [string]$BackupLabel
)

$ErrorActionPreference = "Stop"

trap {
  Write-Host "[ERROR] $($_.Exception.Message)"
  exit 1
}

function Show-Help {
  @"
Backup do Supabase Postgres (pg_dump) para arquivos .sql locais.

Uso:
  pnpm db:backup
  pnpm db:backup -- 2026_06_14_antes_da_migration
  pnpm db:backup:local   (sem Doppler, usa env ja carregada no terminal)

Le a connection string de (nesta ordem):
  SUPABASE_DB_URL   (preferido)
  DATABASE_URL      (fallback)

NUNCA coloque a senha neste arquivo. Use Doppler ou variavel de ambiente.

Variaveis opcionais:
  BACKUP_SCHEMAS    default: public        (ex: "public,auth")
  BACKUP_PREFIX     default: meguispet
  BACKUP_ROOT       default: database\backups
  PG_BIN            ex: C:\Program Files\PostgreSQL\18\bin
"@
}

if ($Help -or $BackupLabel -in @("-h", "--help", "/?")) {
  Show-Help
  exit 0
}

function Resolve-PgDump {
  if ($env:PG_BIN) {
    $candidate = Join-Path $env:PG_BIN "pg_dump.exe"
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  foreach ($version in 18, 17, 16, 15, 14, 13) {
    $candidate = "C:\Program Files\PostgreSQL\$version\bin\pg_dump.exe"
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }

  throw "pg_dump nao encontrado. Instale o PostgreSQL client ou defina PG_BIN."
}

$pgDump = Resolve-PgDump
Write-Host "[INFO] pg_dump: $pgDump"

$dbUrl = $null
$dbUrlSource = $null
if ($env:SUPABASE_DB_URL) {
  $dbUrl = $env:SUPABASE_DB_URL
  $dbUrlSource = "SUPABASE_DB_URL"
} elseif ($env:DATABASE_URL) {
  $dbUrl = $env:DATABASE_URL
  $dbUrlSource = "DATABASE_URL"
  Write-Host "[WARN] SUPABASE_DB_URL nao definida. Usando DATABASE_URL."
} else {
  throw "Falta SUPABASE_DB_URL. Rode: pnpm db:backup (via Doppler)."
}

$timestamp = Get-Date -Format "yyyy_MM_dd_HHmmss"
if ([string]::IsNullOrWhiteSpace($BackupLabel)) {
  $BackupLabel = $timestamp
}

$schemasRaw = if ($env:BACKUP_SCHEMAS) { $env:BACKUP_SCHEMAS } else { "public" }
$schemas = $schemasRaw.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
if ($schemas.Count -eq 0) { throw "BACKUP_SCHEMAS nao contem nenhum schema." }

$prefix = if ($env:BACKUP_PREFIX) { $env:BACKUP_PREFIX } else { "meguispet" }
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backupRoot = if ($env:BACKUP_ROOT) { $env:BACKUP_ROOT } else { Join-Path $scriptDir "backups" }
$backupDir = Join-Path $backupRoot $BackupLabel

if (Test-Path -LiteralPath $backupDir) {
  throw "Pasta de backup ja existe: $backupDir"
}
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$logFile = Join-Path $backupDir "backup.log"
$metaFile = Join-Path $backupDir "backup.meta"
$hashFile = Join-Path $backupDir "SHA256SUMS.txt"

@(
  "backup_label=$BackupLabel"
  "generated_at=$timestamp"
  "db_url_source=$dbUrlSource"
  "schemas=$schemasRaw"
  "format=plain_sql"
) | Set-Content -LiteralPath $metaFile -Encoding ascii

@(
  "==================================================="
  "BACKUP STARTED"
  "Label: $BackupLabel"
  "URL source: $dbUrlSource"
  "Schemas: $schemasRaw"
  "Output: $backupDir"
  "==================================================="
) | Set-Content -LiteralPath $logFile -Encoding ascii

function Invoke-Dump {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("full", "structure", "data")]
    [string]$Mode,

    [Parameter(Mandatory = $true)]
    [string]$FileName
  )

  $outFile = Join-Path $backupDir $FileName
  Write-Host "[RUN] mode=$Mode file=$FileName"
  Add-Content -LiteralPath $logFile -Encoding ascii -Value "[RUN] mode=$Mode file=$FileName"

  $dumpArgs = @()
  foreach ($schema in $schemas) { $dumpArgs += @("-n", $schema) }
  $dumpArgs += @("-F", "p", "-b", "--no-owner", "--no-privileges", "--verbose")
  if ($Mode -eq "structure") { $dumpArgs += "-s" }
  elseif ($Mode -eq "data") { $dumpArgs += "-a" }
  $dumpArgs += @("-f", $outFile, $dbUrl)

  $oldPref = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & $pgDump @dumpArgs 2>&1
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $oldPref
  if ($output) { $output | Out-File -LiteralPath $logFile -Encoding utf8 -Append }

  if ($exitCode -ne 0) { throw "Dump falhou: mode=$Mode. Veja o log: $logFile" }

  Write-Host "[OK] $FileName"
  Add-Content -LiteralPath $logFile -Encoding ascii -Value "[OK] $FileName"
}

Write-Host ""
Write-Host "==================================================="
Write-Host "SUPABASE POSTGRES BACKUP"
Write-Host "==================================================="
Write-Host "Label:      $BackupLabel"
Write-Host "URL source: $dbUrlSource"
Write-Host "Schemas:    $schemasRaw"
Write-Host "Output:     $backupDir"
Write-Host ""

Invoke-Dump -Mode "full" -FileName "${prefix}_full_${BackupLabel}.sql"
Invoke-Dump -Mode "structure" -FileName "${prefix}_structure_${BackupLabel}.sql"
Invoke-Dump -Mode "data" -FileName "${prefix}_data_${BackupLabel}.sql"

Write-Host ""
Write-Host "[INFO] Gerando checksums SHA256..."
Get-ChildItem -LiteralPath $backupDir -Filter "*.sql" |
  Sort-Object Name |
  Get-FileHash -Algorithm SHA256 |
  ForEach-Object { "{0}  {1}" -f $_.Hash, (Split-Path $_.Path -Leaf) } |
  Set-Content -LiteralPath $hashFile -Encoding ascii

Add-Content -LiteralPath $logFile -Encoding ascii -Value "[OK] SHA256SUMS: $hashFile"

Write-Host "[OK] SHA256SUMS: $hashFile"
Write-Host ""
Write-Host "==================================================="
Write-Host "BACKUP COMPLETO"
Write-Host "==================================================="
Write-Host "Pasta:     $backupDir"
Write-Host "Log:       $logFile"
Write-Host "Metadata:  $metaFile"
Write-Host "Checksums: $hashFile"
Write-Host ""
Write-Host "IMPORTANTE:"
Write-Host "- Dumps podem conter dados pessoais/financeiros. Nao commite no git."
Write-Host "- Para incluir usuarios/senhas do auth: BACKUP_SCHEMAS=public,auth"
Write-Host "==================================================="
