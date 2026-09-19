param(
    [string]$ObjectKey = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$configPath = Join-Path $scriptDir ".env.backup"
$restoreDir = Join-Path $repoRoot "backups\restore-tests"
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

$endpoint = "https://$env:R2_ACCOUNT_ID.r2.cloudflarestorage.com"
$env:AWS_ACCESS_KEY_ID = $env:R2_ACCESS_KEY_ID
$env:AWS_SECRET_ACCESS_KEY = $env:R2_SECRET_ACCESS_KEY
$env:AWS_DEFAULT_REGION = "auto"

try {
    if (-not $ObjectKey) {
        $json = aws s3api list-objects-v2 --bucket $env:R2_BUCKET --prefix "postgres/" --endpoint-url $endpoint --output json --no-cli-pager
        if ($LASTEXITCODE -ne 0) {
            throw "Não foi possível listar os backups no R2."
        }

        $listing = $json | ConvertFrom-Json
        $latest = @($listing.Contents) |
            Sort-Object { [DateTime]$_.LastModified } -Descending |
            Select-Object -First 1

        if (-not $latest) {
            throw "Nenhum backup encontrado no R2."
        }

        $ObjectKey = $latest.Key
    }

    New-Item -ItemType Directory -Force -Path $restoreDir | Out-Null
    $fileName = Split-Path $ObjectKey -Leaf
    $localPath = Join-Path $restoreDir $fileName

    aws s3 cp ("s3://" + $env:R2_BUCKET + "/" + $ObjectKey) $localPath --endpoint-url $endpoint --no-cli-pager
    if ($LASTEXITCODE -ne 0) {
        throw "Download do backup falhou."
    }

    $restoreDb = "canhoto_restore_" + (Get-Date -Format "yyyyMMddHHmmss")
    $containerPath = "/tmp/" + $fileName

    docker cp $localPath ($container + ":" + $containerPath)
    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível copiar o dump para o container."
    }

    try {
        $createCommand = 'PGPASSWORD="$POSTGRES_PASSWORD" createdb -h 127.0.0.1 -U "$POSTGRES_USER" "' + $restoreDb + '"'
        docker exec $container sh -lc $createCommand
        if ($LASTEXITCODE -ne 0) {
            throw "Não foi possível criar o banco de restauração."
        }

        $restoreCommand = 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -h 127.0.0.1 -U "$POSTGRES_USER" -d "' + $restoreDb + '" "' + $containerPath + '"'
        docker exec $container sh -lc $restoreCommand
        if ($LASTEXITCODE -ne 0) {
            throw "pg_restore falhou."
        }

        $tableCount = docker exec $container psql -At -U canhoto_app -d $restoreDb -c "select count(*) from information_schema.tables where table_schema = 'public';"
        if ($LASTEXITCODE -ne 0 -or [int]$tableCount -lt 7) {
            throw "Restauração terminou, mas a validação das tabelas falhou."
        }

        Write-Host "Restauração validada com sucesso no banco: $restoreDb"
        Write-Host "O banco de teste NÃO foi apagado automaticamente para permitir inspeção."
    }
    finally {
        docker exec $container rm -f $containerPath | Out-Null
    }
}
finally {
    Remove-Item Env:AWS_ACCESS_KEY_ID -ErrorAction SilentlyContinue
    Remove-Item Env:AWS_SECRET_ACCESS_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:AWS_DEFAULT_REGION -ErrorAction SilentlyContinue
}
