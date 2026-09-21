$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "frontend"
$envLocal = Join-Path $frontendDir ".env.local"

if (-not (Test-Path $envLocal)) {
    throw "frontend/.env.local não encontrado. Configure DATABASE_URL antes de criar o Admin."
}

$databaseLine = Get-Content $envLocal |
    Where-Object { $_ -match '^DATABASE_URL=' } |
    Select-Object -First 1

if (-not $databaseLine) {
    throw "DATABASE_URL não encontrada em frontend/.env.local."
}

$databaseUrl = ($databaseLine -split '=', 2)[1].Trim()
$email = (Read-Host "E-mail do primeiro Admin").Trim().ToLowerInvariant()
$senhaSegura = Read-Host "Senha do Admin (mínimo 4 caracteres)" -AsSecureString

$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaSegura)

try {
    $senha = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)

    if ($senha.Length -lt 4) {
        throw "A senha deve ter pelo menos 4 caracteres."
    }

    $env:DATABASE_URL = $databaseUrl
    $env:ADMIN_BOOTSTRAP_EMAIL = $email
    $env:ADMIN_BOOTSTRAP_PASSWORD = $senha

    Push-Location $frontendDir
    try {
        npm.cmd run admin:create
        if ($LASTEXITCODE -ne 0) {
            throw "Não foi possível criar o usuário Admin."
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:ADMIN_BOOTSTRAP_EMAIL -ErrorAction SilentlyContinue
    Remove-Item Env:ADMIN_BOOTSTRAP_PASSWORD -ErrorAction SilentlyContinue
}
