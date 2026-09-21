$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "frontend"
$envLocal = Join-Path $frontendDir ".env.local"

if (-not (Test-Path $envLocal)) {
    throw "frontend/.env.local não encontrado. Configure DATABASE_URL antes de dar acesso a um gestor de setor."
}

$databaseLine = Get-Content $envLocal |
    Where-Object { $_ -match '^DATABASE_URL=' } |
    Select-Object -First 1

if (-not $databaseLine) {
    throw "DATABASE_URL não encontrada em frontend/.env.local."
}

$databaseUrl = ($databaseLine -split '=', 2)[1].Trim()
$email = (Read-Host "E-mail do colaborador (já cadastrado em Colaboradores, com setor definido)").Trim().ToLowerInvariant()
$senhaSegura = Read-Host "Senha de acesso (mínimo 4 caracteres)" -AsSecureString

$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaSegura)

try {
    $senha = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)

    if ($senha.Length -lt 4) {
        throw "A senha deve ter pelo menos 4 caracteres."
    }

    $env:DATABASE_URL = $databaseUrl
    $env:GESTOR_SETOR_EMAIL = $email
    $env:GESTOR_SETOR_PASSWORD = $senha

    Push-Location $frontendDir
    try {
        npm.cmd run gestor-setor:create
        if ($LASTEXITCODE -ne 0) {
            throw "Não foi possível dar acesso de login a esse colaborador."
        }
    } finally {
        Pop-Location
    }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:GESTOR_SETOR_EMAIL -ErrorAction SilentlyContinue
    Remove-Item Env:GESTOR_SETOR_PASSWORD -ErrorAction SilentlyContinue
}
