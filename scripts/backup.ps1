param(
  [string]$BackupDir = "backups"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $BackupDir "sombetini-$stamp.sql"
$user = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "sombetini" }
$db = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "sombetini_school" }

docker exec sombetini-postgres pg_dump -U $user -d $db --no-owner > $file
Write-Host "Wrote $file"

$days = if ($env:BACKUP_RETENTION_DAYS) { [int]$env:BACKUP_RETENTION_DAYS } else { 30 }
Get-ChildItem $BackupDir -Filter "sombetini-*.sql" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$days) } |
  Remove-Item
