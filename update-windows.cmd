@echo off
setlocal
cd /d "%~dp0"
title LaTeXStudio Local - Update from GitHub
echo [INFO] Pastikan terminal server ditutup dulu sebelum update.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-from-github.ps1" -InstallDir "%~dp0" -NoLaunch
set "exitcode=%errorlevel%"
if not "%exitcode%"=="0" echo [ERROR] Update gagal.
if "%exitcode%"=="0" echo [OK] Update selesai. Buka shortcut dari Desktop.
pause
exit /b %exitcode%
