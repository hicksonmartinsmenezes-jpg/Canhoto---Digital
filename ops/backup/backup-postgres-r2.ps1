$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$configPath = Join-Path $scriptDir ".env.backup"
$backupDir = Join-Path $repoRoot "backups"
$container = "canhoto_digital_postgres"

function Import-EnvFile([string]$Path) {
    if (-not (Test-Path $Path)) {
        throw "Arquivo de configuração não encontrado: $Path"
    }

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

foreach ($name in @("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET")) {
    $item = Get-Item ("Env:" + $name) -ErrorAction SilentlyContinue
    if (-not $item -or -not $item.Value) {
        throw "Variável obrigatória ausente em .env.backup: $name"
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker não encontrado no PATH."
}
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    throw "AWS CLI não encontrado no PATH."
}

$running = docker inspect -f "{{.State.Running}}" $container 2>$null
if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
    throw "Container PostgreSQL não está em execução."
}

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "canhoto-$timestamp.dump"
$localPath = Join-Path $backupDir $fileName
$containerPath = "/tmp/$fileName"

$dumpCommand = 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "' + $containerPath + '"'
docker exec $container sh -lc $dumpCommand
if ($LASTEXITCODE -ne 0) {
    throw "pg_dump falhou."
}

try {
    docker cp ($container + ":" + $containerPath) $localPath
    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível copiar o dump para o Windows."
    }
}
finally {
    docker exec $container rm -f $containerPath | Out-Null
}

if (-not (Test-Path $localPath) -or (Get-Item $localPath).Length -le 0) {
    throw "Dump local inválido ou vazio."
}

$endpoint = "https://$env:R2_ACCOUNT_ID.r2.cloudflarestorage.com"
$env:AWS_ACCESS_KEY_ID = $env:R2_ACCESS_KEY_ID
$env:AWS_SECRET_ACCESS_KEY = $env:R2_SECRET_ACCESS_KEY
$env:AWS_DEFAULT_REGION = "auto"

try {
    aws s3 cp $localPath ("s3://" + $env:R2_BUCKET + "/postgres/" + $fileName) --endpoint-url $endpoint --no-cli-pager
    if ($LASTEXITCODE -ne 0) {
        throw "Upload do backup para o R2 falhou."
    }

    $retention = 30
    if ($env:R2_RETENTION_DAYS -match "^\d+$") {
        $retention = [int]$env:R2_RETENTION_DAYS
    }
    $cutoff = (Get-Date).ToUniversalTime().AddDays(-$retention)

    $json = aws s3api list-objects-v2 --bucket $env:R2_BUCKET --prefix "postgres/" --endpoint-url $endpoint --output json --no-cli-pager
    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível listar backups no R2."
    }

    $listing = $json | ConvertFrom-Json
    foreach ($object in @($listing.Contents)) {
        if ($object.Key -and ([DateTime]$object.LastModified).ToUniversalTime() -lt $cutoff) {
            aws s3api delete-object --bucket $env:R2_BUCKET --key $object.Key --endpoint-url $endpoint --no-cli-pager | Out-Null
            if ($LASTEXITCODE -ne 0) {
                throw "Falha ao remover backup antigo: $($object.Key)"
            }
        }
    }

    Get-ChildItem $backupDir -Filter "canhoto-*.dump" |
        Where-Object { $_.LastWriteTimeUtc -lt $cutoff } |
        Remove-Item -Force

    Write-Host "Backup concluído: $fileName"
}
finally {
    Remove-Item Env:AWS_ACCESS_KEY_ID -ErrorAction SilentlyContinue
    Remove-Item Env:AWS_SECRET_ACCESS_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:AWS_DEFAULT_REGION -ErrorAction SilentlyContinue
}
