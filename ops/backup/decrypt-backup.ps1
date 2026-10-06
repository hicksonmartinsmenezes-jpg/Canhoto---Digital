param(
    [Parameter(Mandatory = $true)][string]$File,
    [string]$OutDir = ""
)

# Abre uma cópia externa criptografada (canhoto-AAAAMMDD-HHMMSS.zip.enc) e
# devolve o pacote em pasta, no mesmo formato do backup local — pronto para o
# test-restore.ps1 -BackupPath <pasta> ou para restauração manual.
#
# A senha é a BACKUP_ENCRYPTION_PASSPHRASE. Se não estiver no .env.backup
# deste PC (por exemplo, restaurando em outro computador), o script pergunta.

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDir "backup-lib.ps1")
Import-EnvFile (Join-Path $scriptDir ".env.backup")

if (-not (Test-Path -LiteralPath $File -PathType Leaf)) {
    throw "File not found: $File"
}

if (-not $env:BACKUP_ENCRYPTION_PASSPHRASE) {
    $secure = Read-Host "Senha do backup (BACKUP_ENCRYPTION_PASSPHRASE)" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $env:BACKUP_ENCRYPTION_PASSPHRASE = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$nome = (Split-Path -Leaf $File) -replace "\.zip\.enc$", ""
if (-not $OutDir) {
    $OutDir = Join-Path ([IO.Path]::GetTempPath()) ("canhoto-restore-" + $nome)
}
$destino = Join-Path $OutDir $nome

if (Test-Path -LiteralPath $destino) {
    throw "Destination already exists: $destino"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$zipTemporario = Join-Path $OutDir ($nome + ".zip")

try {
    Invoke-BackupCrypto -Mode decrypt -InputFile $File -OutputFile $zipTemporario

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory($zipTemporario, $destino)
}
finally {
    if (Test-Path -LiteralPath $zipTemporario) { Remove-Item -LiteralPath $zipTemporario -Force }
}

# Confere hashes do pacote aberto (mesma checagem do backup).
$manifest = Get-Content -LiteralPath (Join-Path $destino "manifest.json") -Raw | ConvertFrom-Json
foreach ($parte in @("database", "uploads", "reports")) {
    if ($manifest.PSObject.Properties.Name -notcontains $parte) { continue }
    $arquivo = Join-Path $destino $manifest.$parte.file
    $hash = (Get-FileHash -LiteralPath $arquivo -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne $manifest.$parte.sha256.ToLowerInvariant()) {
        throw "SHA-256 mismatch in $($manifest.$parte.file) - the backup is corrupted."
    }
}

Write-Host "Backup aberto e conferido em: $destino"
Write-Host "Para validar a restauração em banco separado:"
Write-Host "  .\ops\backup\test-restore.ps1 -BackupPath `"$destino`""
