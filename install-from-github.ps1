# Install or update LaTeXStudio on another Windows laptop from a PUBLIC GitHub repo.
# Example:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\install-from-github.ps1 -Repository 'OWNER/REPO'
# Does not require Git. Downloads a GitHub branch ZIP, retains existing workspace/.
param(
    [string]$Repository = '',
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
        $InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\LaTeXStudioLocal'
    }
    $InstallDir = [IO.Path]::GetFullPath($InstallDir)
    $configPath = Join-Path $InstallDir '.latexstudio-install.json'
    if (-not $Repository -and (Test-Path -LiteralPath $configPath)) {
        $existing = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
        $Repository = [string]$existing.repository
        if ($existing.branch) { $Branch = [string]$existing.branch }
    }
    if ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' -or $Repository.Contains('..')) {
        throw 'Gunakan -Repository OWNER/REPO, contoh -Repository organisasi/LaTeXStudio-Local. Repo harus PUBLIC.'
    }
    if ($Branch -notmatch '^[A-Za-z0-9][A-Za-z0-9._/-]*$' -or $Branch.Contains('..')) {
        throw 'Nama branch tidak valid.'
    }
    if (Test-Path -LiteralPath $InstallDir) {
        Write-Host '[INFO] Jika aplikasi berjalan, hentikan dahulu (Ctrl+C) sebelum update.' -ForegroundColor Yellow
    }
    Write-Host ('[GitHub] Repository : ' + $Repository) -ForegroundColor Cyan
    Write-Host ('[GitHub] Branch     : ' + $Branch)
    Write-Host ('[GitHub] Install ke : ' + $InstallDir)
    Write-Host '[INFO] Dokumen di workspace/ akan tetap dipertahankan.'

    $temporary = Join-Path ([IO.Path]::GetTempPath()) ('latexstudio-github-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $temporary -Force | Out-Null
    $zip = Join-Path $temporary 'source.zip'
    $unpacked = Join-Path $temporary 'unpacked'
    $uri = 'https://github.com/' + $Repository + '/archive/refs/heads/' + $Branch + '.zip'
    Write-Host ('[GitHub] Download source: ' + $uri)
    Invoke-WebRequest -Uri $uri -OutFile $zip -UseBasicParsing -MaximumRedirection 5
    Expand-Archive -LiteralPath $zip -DestinationPath $unpacked -Force
    $directories = @(Get-ChildItem -LiteralPath $unpacked -Directory)
    if ($directories.Count -ne 1) { throw 'Format arsip GitHub tidak sesuai.' }
    $src = $directories[0].FullName
    if (-not (Test-Path -LiteralPath (Join-Path $src 'server.js')) -or
        -not (Test-Path -LiteralPath (Join-Path $src 'install-windows.ps1'))) {
        throw 'Repo tidak berisi LaTeXStudio Local atau branch yang dipilih salah.'
    }

    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    # Whitelist only application files. Never copy/overwrite the user's workspace.
    $managedFiles = @(
        'server.js', 'package.json', 'README.md',
        'install-windows.ps1', 'install-windows.bat',
        'start-windows.bat', 'setup-windows.ps1',
        'run-windows.ps1', 'run-windows.cmd',
        'install-from-github.ps1', 'update-windows.cmd',
        'setup-linux.sh', 'start-linux.sh'
    )
    foreach ($file in $managedFiles) {
        $from = Join-Path $src $file
        if (Test-Path -LiteralPath $from) {
            Copy-Item -LiteralPath $from -Destination (Join-Path $InstallDir $file) -Force
        }
    }
    foreach ($folder in @('public', 'scripts', 'assets', 'tests', 'docs')) {
        $from = Join-Path $src $folder
        if (Test-Path -LiteralPath $from) {
            $dest = Join-Path $InstallDir $folder
            New-Item -ItemType Directory -Path $dest -Force | Out-Null
            Copy-Item -Path (Join-Path $from '*') -Destination $dest -Recurse -Force
        }
    }
    $config = @{repository=$Repository; branch=$Branch; installed_at=(Get-Date).ToString('o')}
    $config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8

    Write-Host '[OK] Source aplikasi siap. Memasang dependensi + membuat shortcut...' -ForegroundColor Green
    $installer = Join-Path $InstallDir 'install-windows.ps1'
    $installerArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $installer)
    if ($NoLaunch) { $installerArgs += '-NoLaunch' }
    if ($NoPrompt) { $installerArgs += '-NoPrompt' }
    & powershell.exe @installerArgs
    if ($LASTEXITCODE -ne 0) { throw 'Instalasi dependensi/shortcut belum berhasil. Buka install-windows.bat pada folder aplikasi untuk mengulang.' }
    Write-Host ('[OK] LaTeXStudio siap di ' + $InstallDir) -ForegroundColor Green
    Write-Host '[OK] Shortcut: Desktop dan Start Menu.'
    exit 0
} catch {
    Write-Host ('[ERROR] ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host '[INFO] Jika repo private, unduh ZIP secara manual dengan akun GitHub lalu jalankan install-windows.bat.' -ForegroundColor Yellow
    exit 1
} finally {
    if ($temporary -and (Test-Path -LiteralPath $temporary)) {
        Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
    }
}
