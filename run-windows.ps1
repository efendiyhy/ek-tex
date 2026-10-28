# Foreground server launcher for Windows shortcuts.
# LaTeXStudio runs only while this terminal remains open.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

# New software installed via winget may not yet appear in Explorer's PATH.
$machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
$user = [Environment]::GetEnvironmentVariable('Path', 'User')
$paths = @($env:Path, $machine, $user)
foreach ($folder in @(
    "$env:ProgramFiles\nodejs",
    "$env:APPDATA\npm",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64",
    "$env:ProgramFiles\MiKTeX\miktex\bin\x64",
    'C:\Strawberry\perl\bin'
)) {
    if (Test-Path -LiteralPath $folder) { $paths += $folder }
}
$env:Path = ($paths -join ';')

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    Write-Host '[ERROR] Node.js belum tersedia. Jalankan install-windows.bat untuk memasang komponen.' -ForegroundColor Red
    exit 1
}
if (-not (Get-Command latexmk -ErrorAction SilentlyContinue)) {
    Write-Host '[WARN] latexmk belum tersedia. Editor dapat dibuka, tetapi kompilasi PDF belum berfungsi.' -ForegroundColor Yellow
    Write-Host '       Jalankan install-windows.bat untuk menyiapkan compiler.' -ForegroundColor Yellow
}

$port = if ($env:PORT) { $env:PORT } else { '3457' }
$url = 'http://127.0.0.1:' + $port
Write-Host ''
Write-Host '======================================================' -ForegroundColor Cyan
Write-Host ' LaTeXStudio Local 2.1  |  Web LaTeX Editor' -ForegroundColor Cyan
Write-Host '======================================================' -ForegroundColor Cyan
Write-Host (' URL       : ' + $url)
Write-Host (' Workspace : ' + (Join-Path $PSScriptRoot 'workspace'))
Write-Host ' STOP      : tekan Ctrl+C di terminal ini.' -ForegroundColor Yellow
Write-Host '             Atau tutup jendela terminal.'
Write-Host ''

# Starting the browser may take a moment; Node begins listening immediately afterwards.
try { Start-Process $url -ErrorAction Stop | Out-Null }
catch { Write-Host ('[INFO] Buka browser secara manual: ' + $url) -ForegroundColor Yellow }

# IMPORTANT: Run in foreground; never use Start-Process for the Node server.
& node.exe (Join-Path $PSScriptRoot 'server.js')
exit $LASTEXITCODE
