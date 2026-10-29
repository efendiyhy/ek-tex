# Shared copy routine for ZIP installation and GitHub updates.
# It copies application files only and NEVER touches user documents in workspace/.
function Copy-EKTexApp {
    param(
        [Parameter(Mandatory=$true)][string]$SourceDir,
        [Parameter(Mandatory=$true)][string]$TargetDir
    )
    $SourceDir = [IO.Path]::GetFullPath($SourceDir).TrimEnd('\', '/')
    $TargetDir = [IO.Path]::GetFullPath($TargetDir).TrimEnd('\', '/')

    if (-not (Test-Path -LiteralPath (Join-Path $SourceDir 'server.js')) -or
        -not (Test-Path -LiteralPath (Join-Path $SourceDir 'install-windows.ps1'))) {
        throw 'Folder sumber tidak berisi source EK TeX yang lengkap.'
    }

    if ([string]::Equals($SourceDir, $TargetDir, [StringComparison]::OrdinalIgnoreCase)) {
        New-Item -ItemType Directory -Path (Join-Path $TargetDir 'workspace') -Force | Out-Null
        return
    }

    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    $files = @(
        'server.js', 'package.json', 'README.md', 'CHANGELOG.md', '.gitignore', '.gitattributes',
        'install-windows.ps1', 'install-windows.bat', 'start-windows.bat',
        'setup-windows.ps1', 'run-windows.ps1', 'run-windows.cmd',
        'install-from-github.ps1', 'update-windows.cmd',
        'setup-linux.sh', 'start-linux.sh', 'update-linux.sh'
    )
    foreach ($file in $files) {
        $from = Join-Path $SourceDir $file
        if (Test-Path -LiteralPath $from -PathType Leaf) {
            Copy-Item -LiteralPath $from -Destination (Join-Path $TargetDir $file) -Force
        }
    }

    foreach ($folder in @('public', 'scripts', 'assets', 'tests', 'docs', 'lib')) {
        $from = Join-Path $SourceDir $folder
        if (-not (Test-Path -LiteralPath $from -PathType Container)) { continue }
        $to = Join-Path $TargetDir $folder
        New-Item -ItemType Directory -Path $to -Force | Out-Null
        Get-ChildItem -LiteralPath $from -Force | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $to -Recurse -Force
        }
    }
    # Never copy, clear or overwrite workspace/ from an archive or remote repo.
    New-Item -ItemType Directory -Path (Join-Path $TargetDir 'workspace') -Force | Out-Null
}

# Non-destructive migration from the v2.1/v2.2 GitHub install location.
# Never overwrite destination projects; never remove the legacy originals.
function Copy-EKTexLegacyProjects {
    param([Parameter(Mandatory=$true)][string]$TargetDir)
    if (-not $env:LOCALAPPDATA) { return }
    $legacy = Join-Path $env:LOCALAPPDATA 'Programs\LaTeXStudioLocal\workspace'
    if (-not (Test-Path -LiteralPath $legacy -PathType Container)) { return }
    $destination = Join-Path $TargetDir 'workspace'
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    if ([string]::Equals([IO.Path]::GetFullPath($legacy).TrimEnd('\','/'),
                         [IO.Path]::GetFullPath($destination).TrimEnd('\','/'),
                         [StringComparison]::OrdinalIgnoreCase)) { return }

    Write-Host '[INFO] Memeriksa proyek dari instalasi lama...' -ForegroundColor Cyan
    foreach ($item in Get-ChildItem -LiteralPath $legacy -Force) {
        if ($item.Name -eq '.gitkeep') { continue }
        $target = Join-Path $destination $item.Name
        if (Test-Path -LiteralPath $target) {
            Write-Host ('[INFO] Proyek sudah ada, tidak ditimpa: ' + $item.Name) -ForegroundColor Yellow
            continue
        }
        try {
            Copy-Item -LiteralPath $item.FullName -Destination $target -Recurse -Force
            Write-Host ('[OK] Proyek lama disalin: ' + $item.Name) -ForegroundColor Green
        } catch {
            Write-Host ('[WARN] Gagal menyalin ' + $item.Name + ': ' + $_.Exception.Message) -ForegroundColor Yellow
        }
    }
}
