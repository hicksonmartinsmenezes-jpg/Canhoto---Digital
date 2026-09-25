$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$backupConfigPath = Join-Path $repoRoot "ops\backup\.env.backup"
$container = "canhoto_digital_postgres"

function Import-EnvFile([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return }

    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }

        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            Set-Item -Path ("Env:" + $parts[0].Trim()) -Value $parts[1].Trim()
        }
    }
}

function Resolve-OperationalPath([string]$Value, [string]$DefaultPath) {
    if (-not $Value) {
        return [IO.Path]::GetFullPath($DefaultPath)
    }

    $expanded = [Environment]::ExpandEnvironmentVariables($Value.Trim())
    if ([IO.Path]::IsPathRooted($expanded)) {
        return [IO.Path]::GetFullPath($expanded)
    }

    return [IO.Path]::GetFullPath((Join-Path $repoRoot $expanded))
}

function ConvertTo-SafeFolderName([string]$Value) {
    $decomposed = $Value.Normalize([Text.NormalizationForm]::FormD)
    $builder = New-Object Text.StringBuilder

    foreach ($char in $decomposed.ToCharArray()) {
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
        if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($char)
        }
    }

    $slug = $builder.ToString().ToLowerInvariant()
    $slug = [Text.RegularExpressions.Regex]::Replace($slug, "[^a-z0-9]+", "-")
    $slug = $slug.Trim("-")

    if ($slug.Length -gt 80) {
        $slug = $slug.Substring(0, 80).TrimEnd("-")
    }

    if (-not $slug) {
        return "cliente-sem-nome"
    }

    $reserved = @(
        "con", "prn", "aux", "nul",
        "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9",
        "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9"
    )

    if ($reserved -contains $slug) {
        return "cliente-$slug"
    }

    return $slug
}

function Assert-PathInsideRoot([string]$Root, [string]$Candidate, [string]$Label) {
    $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd(
        [IO.Path]::DirectorySeparatorChar,
        [IO.Path]::AltDirectorySeparatorChar
    )
    $candidateFull = [IO.Path]::GetFullPath($Candidate)
    $prefix = $rootFull + [IO.Path]::DirectorySeparatorChar

    if (-not $candidateFull.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label is outside the upload root: $candidateFull"
    }

    return $candidateFull
}

function Invoke-Postgres([string]$Sql) {
    $command = 'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    $result = @($Sql | docker exec -i $container sh -lc $command)

    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL command failed."
    }

    return @($result)
}

Import-EnvFile $backupConfigPath

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker not found in PATH."
}

$running = docker inspect -f "{{.State.Running}}" $container 2>$null
if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
    throw "PostgreSQL container is not running."
}

$defaultUploadDir = Join-Path (Join-Path $repoRoot "storage") "uploads"
$uploadDir = Resolve-OperationalPath $env:CANHOTO_UPLOAD_DIR $defaultUploadDir

if (-not (Test-Path -LiteralPath $uploadDir -PathType Container)) {
    throw "Upload directory does not exist: $uploadDir"
}

$query = @'
select json_build_object(
  'anexoId', a.id,
  'entregaId', e.id,
  'numero', e.numero,
  'clienteNome', e.cliente_nome,
  'arquivoUrl', a.arquivo_url,
  'dataEntrega', e.data
)::text
from entrega_anexos a
inner join entregas e on e.id = a.entrega_id
order by e.numero, a.capturado_em, a.id;
'@

$rawRows = @(Invoke-Postgres $query | Where-Object { "$_".Trim() })
if ($rawRows.Count -eq 0) {
    Write-Host "No delivery attachments found. Nothing to organize."
    exit 0
}

$rows = @($rawRows | ForEach-Object { "$_".Trim() | ConvertFrom-Json })
$changes = New-Object System.Collections.Generic.List[object]
$alreadyOrganized = 0

foreach ($row in $rows) {
    $oldRelative = "$($row.arquivoUrl)".Replace("\", "/").TrimStart("/")
    $fileName = ($oldRelative -split "/")[-1]

    if (-not $fileName) {
        throw "Attachment $($row.anexoId) has an invalid file path: $oldRelative"
    }

    $dataEntrega = [DateTime]::Parse("$($row.dataEntrega)", [Globalization.CultureInfo]::InvariantCulture)
    $mesFolder = $dataEntrega.ToString("yyyy-MM")
    $diaFolder = $dataEntrega.ToString("yyyy-MM-dd")
    $clientFolder = ConvertTo-SafeFolderName "$($row.clienteNome)"
    $deliveryFolder = "entrega-{0:D6}" -f [int]$row.numero
    $newRelative = "entregas/$mesFolder/$diaFolder/$clientFolder/$deliveryFolder/$fileName"

    if ($oldRelative -eq $newRelative) {
        $alreadyOrganized++
        continue
    }

    $oldNative = $oldRelative.Replace("/", [IO.Path]::DirectorySeparatorChar)
    $newNative = $newRelative.Replace("/", [IO.Path]::DirectorySeparatorChar)
    $sourcePath = Assert-PathInsideRoot $uploadDir (Join-Path $uploadDir $oldNative) "Source path"
    $destinationPath = Assert-PathInsideRoot $uploadDir (Join-Path $uploadDir $newNative) "Destination path"

    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Attachment file is missing: $oldRelative"
    }

    $destinationDir = Split-Path -Parent $destinationPath
    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null

    if (Test-Path -LiteralPath $destinationPath -PathType Leaf) {
        $sourceHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash
        $destinationHash = (Get-FileHash -LiteralPath $destinationPath -Algorithm SHA256).Hash

        if ($sourceHash -ne $destinationHash) {
            throw "Destination already exists with different content: $newRelative"
        }
    }
    else {
        Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
    }

    $changes.Add([pscustomobject]@{
        AnexoId = "$($row.anexoId)"
        OldRelative = $oldRelative
        NewRelative = $newRelative
        SourcePath = $sourcePath
        DestinationPath = $destinationPath
    })
}

if ($changes.Count -eq 0) {
    Write-Host "All delivery attachments are already organized by client and delivery."
    Write-Host "Attachments checked: $($rows.Count)"
    exit 0
}

$sql = New-Object Text.StringBuilder
[void]$sql.AppendLine("begin;")

foreach ($change in $changes) {
    $id = $change.AnexoId.Replace("'", "''")
    $old = $change.OldRelative.Replace("'", "''")
    $new = $change.NewRelative.Replace("'", "''")

    [void]$sql.AppendLine(
        "update entrega_anexos set arquivo_url = '$new' where id = '$id' and arquivo_url = '$old';"
    )
}

[void]$sql.AppendLine("commit;")
$null = Invoke-Postgres ($sql.ToString())

$verifyRawRows = @(Invoke-Postgres $query | Where-Object { "$_".Trim() })
$verifyRows = @($verifyRawRows | ForEach-Object { "$_".Trim() | ConvertFrom-Json })
$pathsByAttachment = @{}

foreach ($row in $verifyRows) {
    $pathsByAttachment["$($row.anexoId)"] = "$($row.arquivoUrl)".Replace("\", "/")
}

foreach ($change in $changes) {
    if ($pathsByAttachment[$change.AnexoId] -ne $change.NewRelative) {
        throw "Database path validation failed for attachment $($change.AnexoId). Source files were preserved."
    }
}

foreach ($change in $changes) {
    if (
        $change.SourcePath -ne $change.DestinationPath -and
        (Test-Path -LiteralPath $change.SourcePath -PathType Leaf)
    ) {
        Remove-Item -LiteralPath $change.SourcePath -Force
    }
}

$entregasRoot = Join-Path $uploadDir "entregas"
if (Test-Path -LiteralPath $entregasRoot -PathType Container) {
    Get-ChildItem -LiteralPath $entregasRoot -Directory -Recurse -ErrorAction SilentlyContinue |
        Sort-Object { $_.FullName.Length } -Descending |
        ForEach-Object {
            if (-not (Get-ChildItem -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue | Select-Object -First 1)) {
                Remove-Item -LiteralPath $_.FullName -Force
            }
        }
}

Write-Host "Attachment organization completed successfully."
Write-Host "Attachments checked: $($rows.Count)"
Write-Host "Files reorganized: $($changes.Count)"
Write-Host "Already organized: $alreadyOrganized"
Write-Host "Structure: storage\uploads\entregas\<AAAA-MM>\<AAAA-MM-DD>\<cliente>\entrega-000123\<arquivo>"
