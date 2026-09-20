$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$frontendDir = Join-Path $repoRoot "frontend"
$container = "canhoto_digital_postgres"

$logDir = Join-Path $env:LOCALAPPDATA "CanhotoDigital\logs"
$logPath = Join-Path $logDir "startup.log"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-StartupLog([string]$Message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logPath -Value "[$timestamp] $Message"
}

function Invoke-NativeWithTimeout {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [int]$TimeoutSeconds = 5
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.Arguments = (($Arguments | ForEach-Object {
        if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\\"') + '"' } else { $_ }
    }) -join " ")

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi

    try {
        if (-not $process.Start()) {
            return @{ TimedOut = $false; ExitCode = -1; StdOut = ""; StdErr = "Could not start process." }
        }

        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            try { $process.Kill() } catch {}
            return @{ TimedOut = $true; ExitCode = -1; StdOut = ""; StdErr = "Timed out." }
        }

        return @{
            TimedOut = $false
            ExitCode = $process.ExitCode
            StdOut = $process.StandardOutput.ReadToEnd().Trim()
            StdErr = $process.StandardError.ReadToEnd().Trim()
        }
    }
    finally {
        $process.Dispose()
    }
}

# Refresh PATH because scheduled tasks can inherit an older environment snapshot.
$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = @($machinePath, $userPath) -join ";"

Write-StartupLog "Startup task invoked."

$docker = Get-Command docker.exe -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-StartupLog "ERROR: docker.exe not found in PATH."
    throw "docker.exe not found in PATH."
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
    Write-StartupLog "ERROR: npm.cmd not found in PATH."
    throw "npm.cmd not found in PATH."
}

Set-Location $frontendDir

if (-not (Test-Path (Join-Path $frontendDir ".next"))) {
    Write-StartupLog "ERROR: production build (.next) is missing."
    throw "Production build is missing. Run npm ci and npm run build first."
}

$deadline = (Get-Date).AddMinutes(5)
$health = ""
$attempt = 0

do {
    $attempt++
    Write-StartupLog "Waiting for Docker/PostgreSQL (attempt $attempt)."

    $dockerInfo = Invoke-NativeWithTimeout -FilePath $docker.Source -Arguments @("info") -TimeoutSeconds 5

    if (-not $dockerInfo.TimedOut -and $dockerInfo.ExitCode -eq 0) {
        $inspect = Invoke-NativeWithTimeout -FilePath $docker.Source -Arguments @("inspect", "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}", $container) -TimeoutSeconds 5

        if (-not $inspect.TimedOut -and $inspect.ExitCode -eq 0) {
            $health = $inspect.StdOut
            if ($health -eq "healthy") {
                Write-StartupLog "Docker is ready and PostgreSQL is healthy."
                break
            }
        }
    }

    Start-Sleep -Seconds 5
} while ((Get-Date) -lt $deadline)

if ($health -ne "healthy") {
    Write-StartupLog "ERROR: Docker/PostgreSQL did not become healthy within 5 minutes."
    throw "Docker/PostgreSQL did not become available within 5 minutes."
}

Write-StartupLog "Starting Next.js on port 3003."

$previousPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    & $npm.Source run start *>> $logPath
    $exitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $previousPreference
}

Write-StartupLog "Next.js process exited with code $exitCode."
exit $exitCode
