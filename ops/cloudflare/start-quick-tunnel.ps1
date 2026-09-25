$ErrorActionPreference = "Stop"

$origin = "http://127.0.0.1:3003"

# Refresh PATH so PowerShell sessions opened before the MSI installation can
# discover cloudflared without requiring a full logoff/restart.
$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = @($machinePath, $userPath) -join ";"

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    throw "cloudflared not found in PATH. Close and reopen PowerShell or run 'where.exe cloudflared' in CMD to locate the executable."
}

foreach ($nome in @("config.yml", "config.yaml")) {
    $config = Join-Path $env:USERPROFILE ".cloudflared\$nome"
    if (Test-Path $config) {
        throw "Quick Tunnel does not support the configuration file found at $config. Rename it temporarily and run the script again."
    }
}

try {
    $resposta = Invoke-WebRequest "$origin/motorista/login" -UseBasicParsing -TimeoutSec 5
    if ($resposta.StatusCode -ne 200) {
        throw "Motorista area returned HTTP $($resposta.StatusCode)."
    }
}
catch {
    throw "Next.js is not responding at $origin. Start it first with npm run start. Detail: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Quick Tunnel TEST will start for $origin"
Write-Host "The *.trycloudflare.com URL will appear below."
Write-Host "Keep this PowerShell window open during the test."
Write-Host "Use Ctrl+C to stop the tunnel."
Write-Host ""

# --protocol http2: forces cloudflared to use HTTP/2 (TCP) instead of the
# default QUIC (UDP). Some ISPs/routers silently drop the QUIC control
# connection after the initial handshake, which registers fine but then
# serves 404s for every request. HTTP/2 avoids that failure mode.
& $cloudflared.Source tunnel --protocol http2 --url $origin
