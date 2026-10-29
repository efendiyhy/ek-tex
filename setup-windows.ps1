# LaTeXStudio Local 2.0 - idempotent Windows installer / launcher.
# Downloads programs only via official publisher manifests in Windows Package Manager.
param([switch]$StartServer, [switch]$NoPrompt)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Msg([string]$s) { Write-Host "[LaTeXStudio] $s" -ForegroundColor Cyan }
function Fail([string]$s) { Write-Host "[ERROR] $s" -ForegroundColor Red; exit 1 }
function Update-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
  $user = [Environment]::GetEnvironmentVariable('Path','User')
  $paths = @($env:Path,$machine,$user) -join ';'
  $candidates = @(
    "$env:ProgramFiles\nodejs", "$env:APPDATA\npm",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64",
    "$env:LOCALAPPDATA\Programs\MiKTeX 2.9\miktex\bin\x64",
    "$env:ProgramFiles\MiKTeX\miktex\bin\x64",
    "$env:ProgramFiles\MiKTeX 2.9\miktex\bin\x64",
    'C:\Strawberry\perl\bin', 'C:\Strawberry\c\bin',
    "$env:ProgramFiles\Pandoc", "$env:LOCALAPPDATA\Programs\Pandoc"
  )
  foreach($folder in $candidates) { if($folder -and (Test-Path -LiteralPath $folder)) { $paths += ";$folder" } }
  $env:Path = (@($paths -split ';' | Where-Object { $_ -and $_.Trim() } | Select-Object -Unique) -join ';')
}
function Has([string]$cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Install-WingetPackage([string]$id, [string]$label) {
  if(-not (Has 'winget.exe')) { throw 'WinGet tidak tersedia. Instal App Installer dari Microsoft Store / Microsoft, lalu jalankan setup lagi.' }
  Msg "Menginstal $label via WinGet (koneksi internet diperlukan)..."
  & winget.exe install --id $id --exact --source winget --accept-package-agreements --accept-source-agreements --silent
  $result = $LASTEXITCODE
  Update-Path
  if($result -ne 0) { Write-Host "[WARN] WinGet mengembalikan kode $result untuk $label; memeriksa hasil pemasangan..." -ForegroundColor Yellow }
}
function Need-Install([string[]]$missing) {
  if($missing.Count -eq 0) { return }
  Write-Host ''
  Write-Host ('Komponen yang perlu disiapkan: ' + ($missing -join ', ')) -ForegroundColor Yellow
  Write-Host 'Installer akan mengunduh software resmi melalui WinGet. Bisa membutuhkan hak administrator dan beberapa GB ruang disk.'
  if(-not $NoPrompt) {
    $answer=Read-Host 'Lanjutkan instalasi? [Y/n]'
    if($answer -and $answer.ToLower() -notin @('y','yes','ya')) { throw 'Instalasi dibatalkan.' }
  }
}
try {
  Update-Path
  $missing = @()
  if(-not (Has 'node.exe')) { $missing += 'Node.js LTS' }
  if(-not (Has 'pdflatex.exe')) { $missing += 'MiKTeX (TeX compiler)' }
  # MiKTeX latexmk is Perl-based; TeX Live may already bundle its own Perl.
  if(-not (Has 'perl.exe')) { $missing += 'Strawberry Perl (latexmk)' }
  if(-not (Has 'latexmk')) { $missing += 'latexmk package' }
  if(-not (Has 'pandoc.exe')) { $missing += 'Pandoc (document converter)' }
  Need-Install $missing
  if(-not (Has 'node.exe')) { Install-WingetPackage 'OpenJS.NodeJS.LTS' 'Node.js LTS' }
  if(-not (Has 'pdflatex.exe')) { Install-WingetPackage 'MiKTeX.MiKTeX' 'MiKTeX' }
  # If latexmk exists in a TeX Live distribution, it might already include Perl.
  if(-not (Has 'perl.exe')) { Install-WingetPackage 'StrawberryPerl.StrawberryPerl' 'Strawberry Perl' }
  Update-Path
  if(-not (Has 'pandoc.exe')) { Install-WingetPackage 'JohnMacFarlane.Pandoc' 'Pandoc' }
  if(-not (Has 'pandoc.exe')) { Write-Host '[WARN] Pandoc belum ditemukan; converter belum tersedia sampai PATH diperbarui.' -ForegroundColor Yellow }
  if(-not (Has 'node.exe')) { throw 'Node.js tidak ditemukan setelah pemasangan.' }
  if(-not (Has 'pdflatex.exe')) { throw 'pdfLaTeX tidak ditemukan setelah pemasangan.' }
  if(-not (Has 'perl.exe')) { throw 'Perl tidak ditemukan setelah pemasangan.' }
  if(Has 'initexmf.exe') {
    Msg 'Mengaktifkan instalasi otomatis paket MiKTeX...'
    & initexmf.exe '--set-config-value=[MPM]AutoInstall=yes' 2>&1 | Out-Host
    & initexmf.exe --update-fndb 2>&1 | Out-Host
  }
  if(-not (Has 'latexmk')) {
    Msg 'Menginstal paket latexmk di MiKTeX...'
    if(Has 'miktex.exe') {
      & miktex.exe packages update-package-database 2>&1 | Out-Host
      & miktex.exe packages install latexmk 2>&1 | Out-Host
    } elseif(Has 'mpm.exe') {
      & mpm.exe --update-db 2>&1 | Out-Host
      & mpm.exe --install=latexmk 2>&1 | Out-Host
    }
    Update-Path
  }
  if(-not (Has 'latexmk')) { throw 'latexmk masih belum tersedia. Jalankan MiKTeX Console > Packages > latexmk > Install, lalu ulangi setup.' }
  Msg 'Memeriksa apakah compiler dapat menghasilkan PDF...'
  & node.exe (Join-Path $PSScriptRoot 'scripts\verify-compiler.js')
  if($LASTEXITCODE -ne 0) { throw 'Compiler belum berhasil membuat PDF. Lihat pesan uji coba di atas.' }
  Msg 'Setup selesai. LaTeXStudio siap digunakan.'
  if($StartServer) {
    Start-Process 'http://127.0.0.1:3457'
    Msg 'Server di http://127.0.0.1:3457 - Ctrl+C untuk berhenti.'
    & node.exe (Join-Path $PSScriptRoot 'server.js')
    if($LASTEXITCODE -ne 0) { throw 'Server berhenti karena error.' }
  }
} catch {
  Write-Host ('[ERROR] ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host 'Panduan: README.md. Periksa koneksi internet, hak akses installer, dan ruang disk.' -ForegroundColor Yellow
  exit 1
}
