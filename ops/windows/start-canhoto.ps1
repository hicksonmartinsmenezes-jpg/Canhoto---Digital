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

# Scheduled tasks can start with an environment snapshot that differs from an
# interactive shell. Refresh both machine and user PATH values before looking
# for Docker/Node.
$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = @($machinePath, $userPath) -join ";"

Write-StartupLog "Startup task invoked."

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-StartupLog "ERROR: docker not found in PATH."
    throw "docker not found in PATH."
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

# Docker Desktop often needs a few seconds after Windows logon before its
# engine accepts commands. Native stderr during that window must not abort the
# script, otherwise the scheduled task exits before the retry loop can work.
$deadline = (Get-Date).AddMinutes(5)
$health = ""

do {
    $dockerReady = $false

    try {
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        & $docker.Source info 1>$null 2>$null
        $dockerReady = ($LASTEXITCODE -eq 0)
    }
    catch {
        $dockerReady = $false
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($dockerReady) {
        try {
            $previousPreference = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            $health = (& $docker.Source inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}" $container 2>$null | Select-Object -First 1)
            $inspectOk = ($LASTEXITCODE -eq 0)
        }
        catch {
            $inspectOk = $false
            $health = ""
        }
        finally {
            $ErrorActionPreference = $previousPreference
        }

        if ($inspectOk -and $health -eq "healthy") {
            Write-StartupLog "Docker is ready and PostgreSQL is healthy."
            break
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
