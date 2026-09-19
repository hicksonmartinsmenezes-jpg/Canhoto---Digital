$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$startScript = Join-Path $scriptDir "start-canhoto.ps1"
$taskName = "Canhoto Digital - Next.js"
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`""

# Docker Desktop é iniciado na sessão do usuário, por isso o gatilho é AtLogOn.
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RestartCount 10 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 3650)

$principal = New-ScheduledTaskPrincipal `
    -UserId $userId `
    -LogonType Interactive `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Inicia o Next.js do Canhoto Digital na porta 3003 após o login do Windows." `
    -Force | Out-Null

Write-Host "Tarefa registrada: $taskName"
