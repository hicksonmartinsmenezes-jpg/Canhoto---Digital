# Funções compartilhadas do backup (carregado por backup-postgres.ps1 e
# decrypt-backup.ps1 com dot-source). Ficam aqui para poderem ser testadas
# sem Docker.

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

# --- Estado e alerta --------------------------------------------------------

# Grava o resultado da última execução num arquivo simples. Serve para a
# loja (ou um monitor futuro) conferir se o backup de ontem rodou.
function Write-BackupStatus {
    param(
        [Parameter(Mandatory = $true)][string]$StatusPath,
        [Parameter(Mandatory = $true)][bool]$Ok,
        [string]$Package = "",
        [string[]]$Warnings = @(),
        [string]$ErrorMessage = ""
    )

    try {
        $dir = Split-Path -Parent $StatusPath
        if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

        [ordered]@{
            ok = $Ok
            finishedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
            package = $Package
            warnings = @($Warnings)
            error = $ErrorMessage
        } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $StatusPath -Encoding UTF8
    }
    catch {
        Write-Warning "Could not write backup status file: $($_.Exception.Message)"
    }
}

# Avisa pelo Telegram (opcional). Nunca lança erro: um alerta que falha não
# pode esconder o erro real do backup. Não inclui caminhos nem senhas.
function Send-BackupAlert {
    param([Parameter(Mandatory = $true)][string]$Message)

    $token = $env:BACKUP_TELEGRAM_BOT_TOKEN
    $chat = $env:BACKUP_TELEGRAM_CHAT_ID
    if (-not $token -or -not $chat) {
        Write-Warning "Telegram alert not configured (BACKUP_TELEGRAM_BOT_TOKEN / BACKUP_TELEGRAM_CHAT_ID)."
        return $false
    }

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $texto = "Canhoto Digital ($env:COMPUTERNAME)`n$Message"
        if ($texto.Length -gt 3500) { $texto = $texto.Substring(0, 3500) }

        Invoke-RestMethod `
            -Uri "https://api.telegram.org/bot$token/sendMessage" `
            -Method Post `
            -Body @{ chat_id = $chat; text = $texto } `
            -TimeoutSec 20 | Out-Null
        return $true
    }
    catch {
        # A mensagem de erro do Invoke-RestMethod pode conter a URL (com o token).
        Write-Warning "Telegram alert failed (details hidden to protect the token)."
        return $false
    }
}

# --- Criptografia da cópia externa -----------------------------------------

function Get-NodePath {
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $node) { $node = Get-Command node -ErrorAction SilentlyContinue }
    if (-not $node) { throw "node not found in PATH (needed to encrypt the external backup copy)." }
    return $node.Source
}

function Invoke-BackupCrypto {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("encrypt", "decrypt", "verify")][string]$Mode,
        [Parameter(Mandatory = $true)][string]$InputFile,
        [string]$OutputFile = ""
    )

    $script = Join-Path $PSScriptRoot "crypto-backup.mjs"
    $arguments = @($script, $Mode, $InputFile)
    if ($OutputFile) { $arguments += $OutputFile }

    $saida = & (Get-NodePath) @arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Backup crypto ($Mode) failed: $(@($saida) -join ' ')"
    }
}

# Compacta o pacote validado num único .zip (sem recompressão: os anexos já
# são zip/JPEG), criptografa para a pasta sincronizada e confere que o
# arquivo final abre com a senha. Só então ele ganha o nome definitivo, para
# o Google Drive nunca sincronizar um arquivo pela metade.
function New-EncryptedMirrorCopy {
    param(
        [Parameter(Mandatory = $true)][string]$PackagePath,
        [Parameter(Mandatory = $true)][string]$MirrorDir,
        [Parameter(Mandatory = $true)][string]$WorkDir
    )

    if (-not $env:BACKUP_ENCRYPTION_PASSPHRASE) {
        throw "BACKUP_ENCRYPTION_PASSPHRASE is not set."
    }

    $name = Split-Path -Leaf $PackagePath
    $finalFile = Join-Path $MirrorDir ($name + ".zip.enc")
    if (Test-Path -LiteralPath $finalFile) {
        throw "Mirror destination already exists: $finalFile"
    }

    New-Item -ItemType Directory -Force -Path $MirrorDir | Out-Null
    $tempZip = Join-Path $WorkDir (".mirror-" + $name + "-" + $PID + ".zip")
    $tempEnc = Join-Path $MirrorDir (".incompleto-" + $name + ".zip.enc")

    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [IO.Compression.ZipFile]::CreateFromDirectory(
            $PackagePath,
            $tempZip,
            [IO.Compression.CompressionLevel]::NoCompression,
            $false
        )

        if (Test-Path -LiteralPath $tempEnc) { Remove-Item -LiteralPath $tempEnc -Force }
        Invoke-BackupCrypto -Mode encrypt -InputFile $tempZip -OutputFile $tempEnc
        Invoke-BackupCrypto -Mode verify -InputFile $tempEnc

        Move-Item -LiteralPath $tempEnc -Destination $finalFile
    }
    finally {
        if (Test-Path -LiteralPath $tempZip) { Remove-Item -LiteralPath $tempZip -Force }
        if (Test-Path -LiteralPath $tempEnc) { Remove-Item -LiteralPath $tempEnc -Force }
    }

    return $finalFile
}

# Retenção da pasta sincronizada: pacotes em pasta (cópia sem senha) e
# arquivos .zip.enc mais antigos que o limite. Nunca mexe em outros arquivos.
function Remove-ExpiredMirrorItems {
    param(
        [Parameter(Mandatory = $true)][string]$MirrorDir,
        [Parameter(Mandatory = $true)][datetime]$Cutoff
    )

    if (-not (Test-Path -LiteralPath $MirrorDir)) { return }

    Get-ChildItem -LiteralPath $MirrorDir -Directory -Filter "canhoto-*" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $Cutoff } |
        Remove-Item -Recurse -Force

    Get-ChildItem -LiteralPath $MirrorDir -File -Filter "canhoto-*.zip.enc" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $Cutoff } |
        Remove-Item -Force
}
