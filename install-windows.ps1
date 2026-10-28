# EK TeX installer: always installs application into the current user's Documents\EK-TeX.
# Creates visible-terminal shortcuts. Existing workspace/ is never overwritten.
param(
    [switch]$NoLaunch,
    [switch]$NoPrompt,
    [switch]$Installed
)
$ErrorActionPreference = 'Stop'
try {
    if (-not $Installed) {
        $documents = [Environment]::GetFolderPath('MyDocuments')
        if ([string]::IsNullOrWhiteSpace($documents) -or -not (Test-Path -LiteralPath $documents)) {
            throw 'Folder Documents Windows tidak ditemukan. Pastikan lokasi Documents dapat diakses.'
        }
        $destination = Join-Path $documents 'EK-TeX'
        . (Join-Path $PSScriptRoot 'scripts\copy-app.ps1')
        Write-Host ('[EK TeX] Menyiapkan aplikasi di ' + $destination) -ForegroundColor Cyan
        Copy-EKTexApp -SourceDir $PSScriptRoot -TargetDir $destination
        Copy-EKTexLegacyProjects -TargetDir $destination

        # Make ZIP installs updateable from the official project repository as well.
        $configPath = Join-Path $destination '.latexstudio-install.json'
        if (-not (Test-Path -LiteralPath $configPath)) {
            @{ repository='efendiyhy/ek-tex'; branch='main'; installed_at=(Get-Date).ToString('o') } |
                ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
        }
        $params = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
                    (Join-Path $destination 'install-windows.ps1'), '-Installed')
        if ($NoLaunch) { $params += '-NoLaunch' }
        if ($NoPrompt) { $params += '-NoPrompt' }
        & powershell.exe @params
        exit $LASTEXITCODE
    }

    $root = $PSScriptRoot
    Set-Location -LiteralPath $root
    Write-Host ''
    Write-Host 'EK TeX | EK Instrumentation | Windows Setup' -ForegroundColor Cyan
    Write-Host ('Lokasi aplikasi: ' + $root)
    $setup = Join-Path $root 'setup-windows.ps1'
    if (-not (Test-Path -LiteralPath $setup)) { throw 'setup-windows.ps1 tidak ditemukan.' }

    $setupArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $setup)
    if ($NoPrompt) { $setupArgs += '-NoPrompt' }
    & powershell.exe @setupArgs
    if ($LASTEXITCODE -ne 0) { throw 'Pemasangan Node.js / MiKTeX / Perl / latexmk belum berhasil.' }

    $launcher = Join-Path $root 'run-windows.cmd'
    if (-not (Test-Path -LiteralPath $launcher)) { throw 'run-windows.cmd tidak ditemukan.' }
    $icon = Join-Path $root 'assets\latexstudio.ico'
    $desktop = [Environment]::GetFolderPath('Desktop')
    $startMenu = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'Microsoft\Windows\Start Menu\Programs'
    $shell = New-Object -ComObject WScript.Shell

    foreach ($folder in @($desktop, $startMenu)) {
        if (-not $folder) { throw 'Folder shortcut Windows tidak ditemukan.' }
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        $link = Join-Path $folder 'EK TeX.lnk'
        $shortcut = $shell.CreateShortcut($link)
        $shortcut.TargetPath = $launcher
        $shortcut.WorkingDirectory = $root
        $shortcut.WindowStyle = 1
        $shortcut.Description = 'EK TeX by EK Instrumentation - Ctrl+C untuk menghentikan server'
        if (Test-Path -LiteralPath $icon) { $shortcut.IconLocation = $icon }
        $shortcut.Save()
        Write-Host ('[OK] Shortcut: ' + $link) -ForegroundColor Green
    }

    Write-Host ''
    Write-Host '[OK] EK TeX siap. Shortcut Desktop dan Start Menu sudah dibuat.' -ForegroundColor Green
    Write-Host ('[OK] Lokasi: ' + $root)
    Write-Host 'Stop server: Ctrl+C pada terminal atau tutup jendela terminal.'
    if (-not $NoLaunch) {
        Start-Process -FilePath $launcher -WorkingDirectory $root
    }
    exit 0
} catch {
    Write-Host ('[ERROR] ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
