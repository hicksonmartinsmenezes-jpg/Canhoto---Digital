$ErrorActionPreference = "Stop"

$origin = "http://127.0.0.1:3003"

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    throw "cloudflared não encontrado no PATH. Instale a versão Windows oficial antes de continuar."
}

foreach ($nome in @("config.yml", "config.yaml")) {
    $config = Join-Path $env:USERPROFILE ".cloudflared\$nome"
    if (Test-Path $config) {
        throw "Quick Tunnel não suporta a configuração encontrada em $config. Renomeie-a temporariamente e execute o script novamente."
    }
}

try {
    $resposta = Invoke-WebRequest "$origin/motorista/login" -UseBasicParsing -TimeoutSec 5
    if ($resposta.StatusCode -ne 200) {
        throw "A área do motorista respondeu HTTP $($resposta.StatusCode)."
    }
}
catch {
    throw "O Next.js não está respondendo em $origin. Inicie primeiro com npm run start. Detalhe: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Quick Tunnel de TESTE será iniciado para $origin"
Write-Host "A URL *.trycloudflare.com aparecerá abaixo."
Write-Host "Mantenha este PowerShell aberto durante o teste."
Write-Host "Use Ctrl+C para encerrar."
Write-Host ""

& $cloudflared.Source tunnel --url $origin
