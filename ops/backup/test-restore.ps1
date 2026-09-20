param(
    [string]$BackupPath = ""
)

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

if (-not $BackupPath) {
    $latest = Get-ChildItem $backupDir -Filter "canhoto-*.dump" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latest -and $env:BACKUP_MIRROR_DIR) {
        $mirrorDir = [Environment]::ExpandEnvironmentVariables($env:BACKUP_MIRROR_DIR.Trim())
        $latest = Get-ChildItem $mirrorDir -Filter "canhoto-*.dump" -File -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
    }

    if (-not $latest) {
        throw "No backup found. Run backup-postgres.ps1 first."
    }

    $BackupPath = $latest.FullName
}

$BackupPath = (Resolve-Path -LiteralPath $BackupPath).Path
if ((Get-Item $BackupPath).Length -le 0) {
    throw "Backup file is empty."
}

$running = docker inspect -f "{{.State.Running}}" $container 2>$null
if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
    throw "PostgreSQL container is not running."
}

$fileName = Split-Path $BackupPath -Leaf
$containerPath = "/tmp/$fileName"
$restoreDb = "canhoto_restore_" + (Get-Date -Format "yyyyMMddHHmmss")

docker cp $BackupPath ($container + ":" + $containerPath)
if ($LASTEXITCODE -ne 0) {
    throw "Could not copy backup into PostgreSQL container."
}

try {
    $listCommand = 'pg_restore -l "' + $containerPath + '" >/dev/null'
    docker exec $container sh -lc $listCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Backup failed pg_restore validation."
    }

    $createCommand = 'PGPASSWORD="$POSTGRES_PASSWORD" createdb -h 127.0.0.1 -U "$POSTGRES_USER" "' + $restoreDb + '"'
    docker exec $container sh -lc $createCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Could not create restore-test database."
    }

    $restoreCommand = 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -h 127.0.0.1 -U "$POSTGRES_USER" -d "' + $restoreDb + '" "' + $containerPath + '"'
    docker exec $container sh -lc $restoreCommand
    if ($LASTEXITCODE -ne 0) {
        throw "pg_restore failed."
    }

    $requiredTables = docker exec $container psql -At -U canhoto_app -d $restoreDb -c "select count(*) from information_schema.tables where table_schema='public' and table_name in ('colaboradores','entrega_anexos','entrega_historico','entregas','motoboys','setores','usuarios_admin');"
    if ($LASTEXITCODE -ne 0 -or [int]$requiredTables -ne 7) {
        throw "Restore finished, but required-table validation failed."
    }

    Write-Host "Restore validated successfully."
    Write-Host "Source: $BackupPath"
    Write-Host "Test database: $restoreDb"
    Write-Host "The restore-test database was NOT deleted automatically."
}
finally {
    docker exec $container rm -f $containerPath | Out-Null
}
