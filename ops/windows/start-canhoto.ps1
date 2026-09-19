$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$frontendDir = Join-Path $repoRoot "frontend"
$container = "canhoto_digital_postgres"

Set-Location $frontendDir

if (-not (Test-Path (Join-Path $frontendDir ".next"))) {
    throw "Build de produção ausente. Execute npm ci e npm run build antes de iniciar o serviço."
}

$deadline = (Get-Date).AddMinutes(5)
do {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
        $health = docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}" $container 2>$null
        if ($LASTEXITCODE -eq 0 -and $health -eq "healthy") {
            break
        }
    }

    Start-Sleep -Seconds 5
} while ((Get-Date) -lt $deadline)

if ((Get-Date) -ge $deadline) {
    throw "Docker/PostgreSQL não ficou disponível dentro de 5 minutos."
}

& npm.cmd run start
exit $LASTEXITCODE
