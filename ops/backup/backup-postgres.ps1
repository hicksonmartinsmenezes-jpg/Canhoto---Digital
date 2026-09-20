$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$configPath = Join-Path $scriptDir ".env.backup"
$backupDir = Join-Path $repoRoot "backups\postgres"
$container = "canhoto_digital_postgres"

function Import-EnvFile([string]$Path) {
    if (-not (Test-Path $Path)) { return }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }

        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            Set-Item -Path ("Env:" + $parts[0].Trim()) -Value $parts[1].Trim()
        }
    }
}

Import-EnvFile $configPath

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker not found in PATH."
}

$running = docker inspect -f "{{.State.Running}}" $container 2>$null
if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
    throw "PostgreSQL container is not running."
}

$retention = 30
if ($env:BACKUP_RETENTION_DAYS -match "^\d+$" -and [int]$env:BACKUP_RETENTION_DAYS -gt 0) {
    $retention = [int]$env:BACKUP_RETENTION_DAYS
}

$mirrorDir = $null
if ($env:BACKUP_MIRROR_DIR) {
    $mirrorDir = [Environment]::ExpandEnvironmentVariables($env:BACKUP_MIRROR_DIR.Trim())
}

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "canhoto-$timestamp.dump"
$localPath = Join-Path $backupDir $fileName
$containerPath = "/tmp/$fileName"

$dumpCommand = 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "' + $containerPath + '"'
docker exec $container sh -lc $dumpCommand
if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed."
}

try {
    $validateCommand = 'pg_restore -l "' + $containerPath + '" >/dev/null'
    docker exec $container sh -lc $validateCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Generated dump failed pg_restore validation."
    }

    docker cp ($container + ":" + $containerPath) $localPath
    if ($LASTEXITCODE -ne 0) {
        throw "Could not copy dump from container to Windows."
    }
}
finally {
    docker exec $container rm -f $containerPath | Out-Null
}

if (-not (Test-Path $localPath) -or (Get-Item $localPath).Length -le 0) {
    throw "Local dump is missing or empty."
}

if ($mirrorDir) {
    New-Item -ItemType Directory -Force -Path $mirrorDir | Out-Null
    $mirrorPath = Join-Path $mirrorDir $fileName
    Copy-Item -LiteralPath $localPath -Destination $mirrorPath -Force

    if (-not (Test-Path $mirrorPath) -or (Get-Item $mirrorPath).Length -ne (Get-Item $localPath).Length) {
        throw "Mirror copy validation failed."
    }

    Write-Host "Mirror copy: $mirrorPath"
}
else {
    Write-Warning "BACKUP_MIRROR_DIR is not configured. Backup exists only on this machine."
}

$cutoff = (Get-Date).AddDays(-$retention)

Get-ChildItem $backupDir -Filter "canhoto-*.dump" -File |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    Remove-Item -Force

if ($mirrorDir -and (Test-Path $mirrorDir)) {
    Get-ChildItem $mirrorDir -Filter "canhoto-*.dump" -File |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        Remove-Item -Force
}

Write-Host "Backup completed: $localPath"
Write-Host "Retention: $retention days"
