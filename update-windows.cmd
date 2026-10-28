@echo off
setlocal
cd /d "%~dp0"
title EK TeX - Update dari GitHub
echo [INFO] Hentikan server EK TeX (Ctrl+C) sebelum update.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-from-github.ps1" -InstallDir "%~dp0" -NoLaunch
set "exitcode=%errorlevel%"
if not "%exitcode%"=="0" echo [ERROR] Update gagal. Periksa pesan di atas.
if "%exitcode%"=="0" echo [OK] Update selesai. Buka shortcut EK TeX di Desktop.
pause
exit /b %exitcode%
