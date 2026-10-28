# First-time installation on a Windows laptop: install dependencies and shortcuts.
# Shortcut starts run-windows.cmd in a VISIBLE console, NOT a background service.
param(
    [switch]$NoLaunch,
    [switch]$NoPrompt
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location -LiteralPath $root

try {
    Write-Host ''
    Write-Host 'LaTeXStudio Local - Windows Installer v2.1' -ForegroundColor Cyan
    Write-Host ('Folder aplikasi: ' + $root)
    $setup = Join-Path $root 'setup-windows.ps1'
    if (-not (Test-Path -LiteralPath $setup)) { throw 'setup-windows.ps1 tidak ditemukan.' }

    $setupArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $setup)
    if ($NoPrompt) { $setupArgs += '-NoPrompt' }
    & powershell.exe @setupArgs
    if ($LASTEXITCODE -ne 0) { throw 'Persiapan Node.js / MiKTeX / Perl / latexmk gagal. Periksa informasi di atas.' }

    $launcher = Join-Path $root 'run-windows.cmd'
    if (-not (Test-Path -LiteralPath $launcher)) { throw 'run-windows.cmd tidak ditemukan.' }
    $icon = Join-Path $root 'assets\latexstudio.ico'
    $desktop = [Environment]::GetFolderPath('Desktop')
    $startMenu = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'Microsoft\Windows\Start Menu\Programs'
    $shell = New-Object -ComObject WScript.Shell

    foreach ($folder in @($desktop, $startMenu)) {
        if (-not $folder) { throw 'Folder shortcut Windows tidak dapat ditemukan.' }
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        $lnkPath = Join-Path $folder 'LaTeXStudio Local.lnk'
        $shortcut = $shell.CreateShortcut($lnkPath)
        $shortcut.TargetPath = $launcher
        $shortcut.WorkingDirectory = $root
        $shortcut.WindowStyle = 1
        $shortcut.Description = 'LaTeXStudio Local - jalankan server dengan terminal terbuka (Ctrl+C untuk stop)'
        if (Test-Path -LiteralPath $icon) { $shortcut.IconLocation = $icon }
        $shortcut.Save()
        Write-Host ('[OK] Shortcut: ' + $lnkPath) -ForegroundColor Green
    }

    Write-Host ''
    Write-Host '[OK] Instalasi selesai. Shortcut Desktop + Start Menu dibuat.' -ForegroundColor Green
    Write-Host 'Jalankan shortcut untuk membuka website dan terminal server.'
    Write-Host 'Stop: Ctrl+C di terminal atau tutup jendela terminal.'
    Write-Host 'Tidak menginstal aplikasi sebagai Windows Service / Startup.'
    if (-not $NoLaunch) {
        Write-Host '[INFO] Membuka LaTeXStudio di terminal terpisah...'
        Start-Process -FilePath $launcher -WorkingDirectory $root
    }
    exit 0
} catch {
    Write-Host ('[ERROR] ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
