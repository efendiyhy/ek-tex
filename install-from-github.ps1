# EK TeX - one-step installer and updater from the official public GitHub repository.
# Default install location: the user's Documents\EK-TeX (supports redirected Documents).
# NEVER overwrites or deletes workspace/.
param(
    [string]$Repository = 'efendiyhy/ek-tex',
    [string]$Branch = 'main',
    [string]$InstallDir = '',
    [switch]$NoLaunch,
    [switch]$NoPrompt
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$temporary = $null
try {
    if (-not $InstallDir) {
        $documents = [Environment]::GetFolderPath('MyDocuments')
        if ([string]::IsNullOrWhiteSpace($documents) -or -not (Test-Path -LiteralPath $documents)) {
            throw 'Folder Documents Windows tidak ditemukan.'
        }
        $InstallDir = Join-Path $documents 'EK-TeX'
    }
    $InstallDir = [IO.Path]::GetFullPath($InstallDir)
    $configPath = Join-Path $InstallDir '.latexstudio-install.json'
    if ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' -or $Repository.Contains('..')) {
        throw 'Format repository tidak valid.'
    }
    if ($Branch -notmatch '^[A-Za-z0-9][A-Za-z0-9._/-]*$' -or $Branch.Contains('..')) {
        throw 'Format branch tidak valid.'
    }
    Write-Host ('[EK TeX] Repository: https://github.com/' + $Repository) -ForegroundColor Cyan
    Write-Host ('[EK TeX] Instalasi : ' + $InstallDir)
    Write-Host '[INFO] Dokumen dan proyek lokal tetap tersimpan di workspace/.'

    $temporary = Join-Path ([IO.Path]::GetTempPath()) ('ek-tex-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $temporary -Force | Out-Null
    $zip = Join-Path $temporary 'source.zip'
    $unpacked = Join-Path $temporary 'unpacked'
    $uri = 'https://github.com/' + $Repository + '/archive/refs/heads/' + $Branch + '.zip'
    Invoke-WebRequest -Uri $uri -OutFile $zip -UseBasicParsing -MaximumRedirection 5
    Expand-Archive -LiteralPath $zip -DestinationPath $unpacked -Force
    $directories = @(Get-ChildItem -LiteralPath $unpacked -Directory)
    if ($directories.Count -ne 1) { throw 'Arsip source tidak sesuai.' }
    $source = $directories[0].FullName
    if (-not (Test-Path -LiteralPath (Join-Path $source 'scripts\copy-app.ps1'))) {
        throw 'Installer repository belum diperbarui. Pastikan repository EK TeX memiliki installer terbaru.'
    }
    . (Join-Path $source 'scripts\copy-app.ps1')
    Copy-EKTexApp -SourceDir $source -TargetDir $InstallDir
    Copy-EKTexLegacyProjects -TargetDir $InstallDir
    @{ repository=$Repository; branch=$Branch; installed_at=(Get-Date).ToString('o') } |
        ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8

    $params = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
                (Join-Path $InstallDir 'install-windows.ps1'), '-Installed')
    if ($NoLaunch) { $params += '-NoLaunch' }
    if ($NoPrompt) { $params += '-NoPrompt' }
    & powershell.exe @params
    if ($LASTEXITCODE -ne 0) { throw 'Pemasangan dependensi atau shortcut gagal. Jalankan install-windows.bat dari folder Documents\EK-TeX.' }
    Write-Host ('[OK] EK TeX siap di ' + $InstallDir) -ForegroundColor Green
    exit 0
} catch {
    Write-Host ('[ERROR] ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
} finally {
    if ($temporary -and (Test-Path -LiteralPath $temporary)) {
        Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
    }
}
