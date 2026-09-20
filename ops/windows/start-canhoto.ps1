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
            try { $process.WaitForExit(1000) | Out-Null } catch {}
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

try {
    # Scheduled tasks may inherit an older PATH snapshot.
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = @($machinePath, $userPath) -join ";"

    Write-StartupLog "Startup task invoked."

    $docker = Get-Command docker.exe -ErrorAction SilentlyContinue
    if (-not $docker) {
        throw "docker.exe not found in PATH."
    }

    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npm) {
        throw "npm.cmd not found in PATH."
    }

    Set-Location $frontendDir

    if (-not (Test-Path (Join-Path $frontendDir ".next"))) {
        throw "Production build is missing. Run npm ci and npm run build first."
    }

    # Give Docker Desktop a short grace period after Windows logon.
    Write-StartupLog "Waiting 20 seconds for Docker Desktop startup."
    Start-Sleep -Seconds 20

    $deadline = (Get-Date).AddMinutes(5)
    $health = ""
    $attempt = 0

    do {
        $attempt++
        Write-StartupLog "Checking PostgreSQL health (attempt $attempt)."

        $inspect = Invoke-NativeWithTimeout -FilePath $docker.Source -Arguments @(
            "inspect",
            "--format",
            "{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}",
            $container
        ) -TimeoutSeconds 5

        if ($inspect.TimedOut) {
            Write-StartupLog "Docker inspect timed out."
        }
        elseif ($inspect.ExitCode -ne 0) {
            $detail = $inspect.StdErr
            if ($detail.Length -gt 180) { $detail = $detail.Substring(0, 180) }
            Write-StartupLog "Docker inspect not ready (exit $($inspect.ExitCode)): $detail"
        }
        else {
            $health = $inspect.StdOut
            Write-StartupLog "PostgreSQL health: $health"

            if ($health -eq "healthy") {
                Write-StartupLog "Docker is ready and PostgreSQL is healthy."
                break
            }
        }

        Start-Sleep -Seconds 5
    } while ((Get-Date) -lt $deadline)

    if ($health -ne "healthy") {
        throw "Docker/PostgreSQL did not become healthy within 5 minutes."
    }

    Write-StartupLog "Starting Next.js on port 3003."

    $env:NO_COLOR = "1"
    $env:FORCE_COLOR = "0"

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
}
catch {
    Write-StartupLog ("ERROR: " + $_.Exception.Message)
    exit 1
}
