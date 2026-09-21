$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$configPath = Join-Path $scriptDir ".env.backup"
$backupRoot = Join-Path (Join-Path $repoRoot "backups") "canhoto"
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

function Resolve-OperationalPath([string]$Value, [string]$DefaultPath) {
    if (-not $Value) {
        return [IO.Path]::GetFullPath($DefaultPath)
    }

    $expanded = [Environment]::ExpandEnvironmentVariables($Value.Trim())
    if ([IO.Path]::IsPathRooted($expanded)) {
        return [IO.Path]::GetFullPath($expanded)
    }

    return [IO.Path]::GetFullPath((Join-Path $repoRoot $expanded))
}

function Get-DatabaseValues([string]$Sql, [string]$DatabaseExpression = '"$POSTGRES_DB"') {
    $escapedSql = $Sql.Replace('"', '\"')
    $command = 'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -At -h 127.0.0.1 -U "$POSTGRES_USER" -d ' + $DatabaseExpression + ' -c "' + $escapedSql + '"'
    $result = @(docker exec $container sh -lc $command)

    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL query failed during backup validation."
    }

    return @($result | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

function Assert-ReferencedUploadsExist([string]$UploadDir) {
    $referenced = @(Get-DatabaseValues "select arquivo_url from entrega_anexos where arquivo_url is not null and btrim(arquivo_url) <> '' order by arquivo_url;")
    if ($referenced.Count -eq 0) { return }

    if (-not (Test-Path -LiteralPath $UploadDir -PathType Container)) {
        throw "The database references delivery attachments, but the upload directory does not exist: $UploadDir"
    }

    $root = [IO.Path]::GetFullPath($UploadDir).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $rootPrefix = $root + [IO.Path]::DirectorySeparatorChar

    foreach ($relative in $referenced) {
        $normalized = $relative.Replace("/", [IO.Path]::DirectorySeparatorChar)
        $candidate = [IO.Path]::GetFullPath((Join-Path $root $normalized))

        if (-not $candidate.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Unsafe attachment path found in database: $relative"
        }

        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            throw "Attachment referenced by the database is missing from storage: $relative"
        }
    }
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
        throw "Backup manifest is missing: $manifestPath"
    }

    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.formatVersion -ne 1) {
        throw "Unsupported backup format version: $($manifest.formatVersion)"
    }

    $databasePath = Join-Path $PackagePath $manifest.database.file
    $uploadsPath = Join-Path $PackagePath $manifest.uploads.file

    foreach ($required in @($databasePath, $uploadsPath)) {
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
    $mirrorDir = Resolve-OperationalPath $env:BACKUP_MIRROR_DIR ""
}

$defaultUploadDir = Join-Path (Join-Path $repoRoot "storage") "uploads"
$uploadDir = Resolve-OperationalPath $env:CANHOTO_UPLOAD_DIR $defaultUploadDir

New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "canhoto-$timestamp"
$finalPath = Join-Path $backupRoot $packageName
$partialPath = Join-Path $backupRoot (".partial-" + $packageName + "-" + $PID)
$databasePath = Join-Path $partialPath "database.dump"
$uploadsArchivePath = Join-Path $partialPath "uploads.zip"
$manifestPath = Join-Path $partialPath "manifest.json"
$containerPath = "/tmp/$packageName.dump"

if (Test-Path -LiteralPath $finalPath) {
    throw "Backup destination already exists: $finalPath"
}

New-Item -ItemType Directory -Force -Path $partialPath | Out-Null

try {
    Assert-ReferencedUploadsExist $uploadDir

    $dumpCommand = 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "' + $containerPath + '"'
    docker exec $container sh -lc $dumpCommand
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed."
    }

    $validateCommand = 'pg_restore -l "' + $containerPath + '" >/dev/null'
    docker exec $container sh -lc $validateCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Generated dump failed pg_restore validation."
    }

    docker cp ($container + ":" + $containerPath) $databasePath
    if ($LASTEXITCODE -ne 0) {
        throw "Could not copy dump from container."
    }

    $sourceUploadDir = $uploadDir
    $temporaryEmptyUploadDir = $null

    if (-not (Test-Path -LiteralPath $uploadDir -PathType Container)) {
        $temporaryEmptyUploadDir = Join-Path $partialPath "_empty-uploads"
        New-Item -ItemType Directory -Force -Path $temporaryEmptyUploadDir | Out-Null
        $sourceUploadDir = $temporaryEmptyUploadDir
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::CreateFromDirectory(
        $sourceUploadDir,
        $uploadsArchivePath,
        [IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    if ($temporaryEmptyUploadDir) {
        Remove-Item -LiteralPath $temporaryEmptyUploadDir -Recurse -Force
    }

    $uploadFiles = @()
    if (Test-Path -LiteralPath $uploadDir -PathType Container) {
        $uploadFiles = @(Get-ChildItem -LiteralPath $uploadDir -File -Recurse)
    }

    $gitCommit = $null
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $previousErrorAction = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        $gitCommit = (git -C $repoRoot rev-parse HEAD 2>$null)
        $ErrorActionPreference = $previousErrorAction
        if ($LASTEXITCODE -ne 0) { $gitCommit = $null }
    }

    $requiredTables = @(
        "setores",
        "colaboradores",
        "usuarios_admin",
        "motoboys",
        "motoboy_localizacoes",
        "veiculos",
        "veiculo_gastos",
        "treinamento_progresso",
        "entregas",
        "entrega_anexos",
        "entrega_historico"
    )

    $manifest = [ordered]@{
        formatVersion = 1
        createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
        gitCommit = if ($gitCommit) { "$gitCommit".Trim() } else { $null }
        database = [ordered]@{
            file = "database.dump"
            sha256 = (Get-FileHash -LiteralPath $databasePath -Algorithm SHA256).Hash.ToLowerInvariant()
        }
        uploads = [ordered]@{
            file = "uploads.zip"
            sha256 = (Get-FileHash -LiteralPath $uploadsArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
            fileCount = $uploadFiles.Count
            totalBytes = [long](($uploadFiles | Measure-Object -Property Length -Sum).Sum ?? 0)
        }
        requiredTables = $requiredTables
    }

    $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

    Assert-BackupPackage $partialPath

    Move-Item -LiteralPath $partialPath -Destination $finalPath

    if ($mirrorDir) {
        New-Item -ItemType Directory -Force -Path $mirrorDir | Out-Null
        $mirrorPath = Join-Path $mirrorDir $packageName

        if (Test-Path -LiteralPath $mirrorPath) {
            throw "Mirror destination already exists: $mirrorPath"
        }

        Copy-Item -LiteralPath $finalPath -Destination $mirrorPath -Recurse
        Assert-BackupPackage $mirrorPath
        Write-Host "Mirror copy: $mirrorPath"
    }
    else {
        Write-Warning "BACKUP_MIRROR_DIR is not configured. Backup exists only on this machine."
    }

    $cutoff = (Get-Date).AddDays(-$retention)

    Get-ChildItem -LiteralPath $backupRoot -Directory -Filter "canhoto-*" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        Remove-Item -Recurse -Force

    if ($mirrorDir -and (Test-Path -LiteralPath $mirrorDir)) {
        Get-ChildItem -LiteralPath $mirrorDir -Directory -Filter "canhoto-*" -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -lt $cutoff } |
            Remove-Item -Recurse -Force
    }

    Write-Host "Complete backup created: $finalPath"
    Write-Host "Database + delivery uploads are in the same validated package."
    Write-Host "Retention: $retention days"
}
finally {
    docker exec $container rm -f $containerPath 2>$null | Out-Null

    if (Test-Path -LiteralPath $partialPath) {
        Remove-Item -LiteralPath $partialPath -Recurse -Force
    }
}
