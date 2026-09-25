param(
    [string]$BackupPath = "",
    [switch]$KeepTestArtifacts
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$configPath = Join-Path $scriptDir ".env.backup"
$backupRoot = Join-Path (Join-Path $repoRoot "backups") "Canhoto Backups"
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

function Resolve-OperationalPath([string]$Value) {
    $expanded = [Environment]::ExpandEnvironmentVariables($Value.Trim())
    if ([IO.Path]::IsPathRooted($expanded)) {
        return [IO.Path]::GetFullPath($expanded)
    }

    return [IO.Path]::GetFullPath((Join-Path $repoRoot $expanded))
}

function Get-DatabaseValues(
    [string]$Sql,
    [string]$DatabaseName
) {
    # Envia o SQL pelo stdin para evitar problemas de escaping entre
    # PowerShell -> docker exec -> sh -> psql.
    $command = 'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$1"'
    $result = @($Sql | docker exec -i $container sh -lc $command sh $DatabaseName)

    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL query failed during restore validation."
    }

    return @(
        $result |
            ForEach-Object { "$_".Trim() } |
            Where-Object { $_ }
    )
}

function Assert-ZipReadable([string]$Path) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $null = $zip.Entries.Count
    }
    finally {
        $zip.Dispose()
    }
}

function Assert-BackupPackage([string]$PackagePath) {
    $manifestPath = Join-Path $PackagePath "manifest.json"
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "Backup manifest is missing."
    }

    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.formatVersion -ne 1) {
        throw "Unsupported backup format version: $($manifest.formatVersion)"
    }

    $databasePath = Join-Path $PackagePath $manifest.database.file
    $uploadsPath = Join-Path $PackagePath $manifest.uploads.file
    $reportsPath = $null

    if ($manifest.PSObject.Properties.Name -contains "reports") {
        $reportsPath = Join-Path $PackagePath $manifest.reports.file
    }

    $requiredFiles = @($databasePath, $uploadsPath)
    if ($reportsPath) {
        $requiredFiles += $reportsPath
    }

    foreach ($required in $requiredFiles) {
        if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
            throw "Backup package is incomplete: $required"
        }

        if ((Get-Item -LiteralPath $required).Length -le 0) {
            throw "Backup file is empty: $required"
        }
    }

    $databaseHash = (Get-FileHash -LiteralPath $databasePath -Algorithm SHA256).Hash.ToLowerInvariant()
    $uploadsHash = (Get-FileHash -LiteralPath $uploadsPath -Algorithm SHA256).Hash.ToLowerInvariant()

    if ($databaseHash -ne $manifest.database.sha256.ToLowerInvariant()) {
        throw "Database dump SHA-256 mismatch."
    }

    if ($uploadsHash -ne $manifest.uploads.sha256.ToLowerInvariant()) {
        throw "Uploads archive SHA-256 mismatch."
    }

    Assert-ZipReadable $uploadsPath

    if ($reportsPath) {
        $reportsHash = (Get-FileHash -LiteralPath $reportsPath -Algorithm SHA256).Hash.ToLowerInvariant()

        if ($reportsHash -ne $manifest.reports.sha256.ToLowerInvariant()) {
            throw "Reports archive SHA-256 mismatch."
        }

        Assert-ZipReadable $reportsPath
    }

    return $manifest
}

Import-EnvFile $configPath

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker not found in PATH."
}

if (-not $BackupPath) {
    $latest = Get-ChildItem -LiteralPath $backupRoot -Directory -Filter "canhoto-*" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latest -and $env:BACKUP_MIRROR_DIR) {
        $mirrorDir = Resolve-OperationalPath $env:BACKUP_MIRROR_DIR
        $latest = Get-ChildItem -LiteralPath $mirrorDir -Directory -Filter "canhoto-*" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
    }

    if (-not $latest) {
        throw "No complete backup package found. Run backup-postgres.ps1 first."
    }

    $BackupPath = $latest.FullName
}

$BackupPath = (Resolve-Path -LiteralPath $BackupPath).Path
if (-not (Test-Path -LiteralPath $BackupPath -PathType Container)) {
    throw "BackupPath must point to a complete backup directory, not a legacy .dump file."
}

$manifest = Assert-BackupPackage $BackupPath

$running = docker inspect -f "{{.State.Running}}" $container 2>$null
if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
    throw "PostgreSQL container is not running."
}

$databasePath = Join-Path $BackupPath $manifest.database.file
$uploadsArchivePath = Join-Path $BackupPath $manifest.uploads.file
$reportsArchivePath = if ($manifest.PSObject.Properties.Name -contains "reports") {
    Join-Path $BackupPath $manifest.reports.file
} else {
    $null
}

$containerPath = "/tmp/canhoto-restore-" + [guid]::NewGuid().ToString("N") + ".dump"
$restoreDb = "canhoto_restore_" + (Get-Date -Format "yyyyMMddHHmmss") + "_" + (Get-Random -Minimum 1000 -Maximum 9999)
$restoreUploadsDir = Join-Path ([IO.Path]::GetTempPath()) ("canhoto-uploads-" + [guid]::NewGuid().ToString("N"))
$restoreReportsDir = Join-Path ([IO.Path]::GetTempPath()) ("canhoto-relatorios-" + [guid]::NewGuid().ToString("N"))
$databaseCreated = $false

docker cp $databasePath ($container + ":" + $containerPath)
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
    $databaseCreated = $true

    $restoreCommand = 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -h 127.0.0.1 -U "$POSTGRES_USER" -d "' + $restoreDb + '" "' + $containerPath + '"'
    docker exec $container sh -lc $restoreCommand
    if ($LASTEXITCODE -ne 0) {
        throw "pg_restore failed."
    }

    $tableNames = @($manifest.requiredTables)
    if ($tableNames.Count -eq 0) {
        throw "Backup manifest does not declare required tables."
    }

    $quotedTables = ($tableNames | ForEach-Object { "'" + $_.Replace("'", "''") + "'" }) -join ","
    $tableQuery = "select count(*) from information_schema.tables where table_schema='public' and table_name in ($quotedTables);"
    $requiredTableCountValues = @(Get-DatabaseValues $tableQuery $restoreDb)

    if (
        $requiredTableCountValues.Count -ne 1 -or
        $requiredTableCountValues[0] -notmatch '^\d+$'
    ) {
        throw "Restore finished, but the required-table count query returned an invalid result: $($requiredTableCountValues -join ', ')."
    }

    $requiredTableCount = [int]$requiredTableCountValues[0]
    if ($requiredTableCount -ne $tableNames.Count) {
        throw "Restore finished, but required-table validation failed. Expected $($tableNames.Count), found $requiredTableCount."
    }

    New-Item -ItemType Directory -Force -Path $restoreUploadsDir | Out-Null
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory($uploadsArchivePath, $restoreUploadsDir)

    $restoredFiles = @(Get-ChildItem -LiteralPath $restoreUploadsDir -File -Recurse)
    if ($restoredFiles.Count -ne [int]$manifest.uploads.fileCount) {
        throw "Upload file count mismatch after extraction. Expected $($manifest.uploads.fileCount), found $($restoredFiles.Count)."
    }

    $attachmentQuery = "select arquivo_url from entrega_anexos where arquivo_url is not null and btrim(arquivo_url) <> '' order by arquivo_url;"
    $attachmentPaths = @(Get-DatabaseValues $attachmentQuery $restoreDb)

    $root = [IO.Path]::GetFullPath($restoreUploadsDir).TrimEnd(
        [IO.Path]::DirectorySeparatorChar,
        [IO.Path]::AltDirectorySeparatorChar
    )
    $rootPrefix = $root + [IO.Path]::DirectorySeparatorChar

    foreach ($relativeRaw in $attachmentPaths) {
        $relative = "$relativeRaw".Trim()
        if (-not $relative) { continue }

        $normalized = $relative.Replace("/", [IO.Path]::DirectorySeparatorChar)
        $candidate = [IO.Path]::GetFullPath((Join-Path $root $normalized))

        if (-not $candidate.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Unsafe attachment path restored from database: $relative"
        }

        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            throw "Database attachment has no matching restored file: $relative"
        }
    }

    $restoredReports = @()
    if ($reportsArchivePath) {
        New-Item -ItemType Directory -Force -Path $restoreReportsDir | Out-Null
        [IO.Compression.ZipFile]::ExtractToDirectory($reportsArchivePath, $restoreReportsDir)

        $restoredReports = @(Get-ChildItem -LiteralPath $restoreReportsDir -File -Recurse)
        if ($restoredReports.Count -ne [int]$manifest.reports.fileCount) {
            throw "Report file count mismatch after extraction. Expected $($manifest.reports.fileCount), found $($restoredReports.Count)."
        }
    }

    Write-Host "Complete restore validated successfully."
    Write-Host "Source: $BackupPath"
    Write-Host "Tables validated: $requiredTableCount"
    Write-Host "Upload files validated: $($restoredFiles.Count)"

    if ($reportsArchivePath) {
        Write-Host "Report files validated: $($restoredReports.Count)"
    }

    if ($KeepTestArtifacts) {
        Write-Host "Restore-test database kept: $restoreDb"
        Write-Host "Extracted uploads kept: $restoreUploadsDir"

        if ($reportsArchivePath) {
            Write-Host "Extracted reports kept: $restoreReportsDir"
        }
    }
}
finally {
    docker exec $container rm -f $containerPath 2>$null | Out-Null

    if (-not $KeepTestArtifacts) {
        if ($databaseCreated) {
            $dropCommand = 'PGPASSWORD="$POSTGRES_PASSWORD" dropdb -h 127.0.0.1 -U "$POSTGRES_USER" --if-exists "' + $restoreDb + '"'
            docker exec $container sh -lc $dropCommand 2>$null | Out-Null
        }

        if (Test-Path -LiteralPath $restoreUploadsDir) {
            Remove-Item -LiteralPath $restoreUploadsDir -Recurse -Force
        }

        if (Test-Path -LiteralPath $restoreReportsDir) {
            Remove-Item -LiteralPath $restoreReportsDir -Recurse -Force
        }
    }
}
