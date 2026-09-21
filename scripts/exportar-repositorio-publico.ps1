param(
    [string]$Branch = "chore/public-repo-sanitization",
    [string]$Destino = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not $Destino) {
    $parent = Split-Path -Parent $repoRoot
    $Destino = Join-Path $parent "Canhoto-Digital-public"
}

Push-Location $repoRoot
try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "Git não foi encontrado no PATH."
    }

    git rev-parse --is-inside-work-tree *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Execute este script dentro de um clone Git válido."
    }

    git show-ref --verify --quiet "refs/heads/$Branch"
    if ($LASTEXITCODE -ne 0) {
        git show-ref --verify --quiet "refs/remotes/origin/$Branch"
        if ($LASTEXITCODE -ne 0) {
            throw "A branch $Branch não foi encontrada localmente nem em origin."
        }
        $Branch = "origin/$Branch"
    }

    if (Test-Path $Destino) {
        $itens = @(Get-ChildItem -Force $Destino -ErrorAction SilentlyContinue)
        if ($itens.Count -gt 0) {
            throw "A pasta de destino já existe e não está vazia: $Destino"
        }
    } else {
        New-Item -ItemType Directory -Path $Destino | Out-Null
    }

    $arquivo = Join-Path ([System.IO.Path]::GetTempPath()) ("canhoto-public-" + [guid]::NewGuid().ToString("N") + ".tar")

    try {
        git archive --format=tar --output="$arquivo" $Branch
        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao exportar a branch $Branch."
        }

        tar -xf "$arquivo" -C "$Destino"
        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao extrair o snapshot sanitizado."
        }
    }
    finally {
        Remove-Item -LiteralPath $arquivo -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path (Join-Path $Destino ".git")) {
        throw "Falha de segurança: a exportação não deveria conter histórico Git."
    }

    $proibidos = @(
        (Join-Path $Destino "romaneio"),
        (Join-Path $Destino "backend\supabase"),
        (Join-Path $Destino "frontend\.env.local")
    )

    foreach ($item in $proibidos) {
        if (Test-Path $item) {
            throw "Falha de segurança: item proibido encontrado na exportação: $item"
        }
    }

    Write-Host ""
    Write-Host "Snapshot público criado com sucesso:"
    Write-Host $Destino
    Write-Host ""
    Write-Host "Nenhum histórico Git foi copiado."
    Write-Host "Revise os arquivos antes de criar o novo repositório público."
}
finally {
    Pop-Location
}
