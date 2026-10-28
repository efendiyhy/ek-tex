@echo off
setlocal
cd /d "%~dp0"
title EK TeX - Install dan Shortcut
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1"
set "exitcode=%errorlevel%"
echo.
if not "%exitcode%"=="0" (
  echo [ERROR] Instalasi belum selesai. Periksa pesan di atas.
) else (
  echo [OK] Gunakan shortcut EK TeX di Desktop atau Start Menu.
)
pause
exit /b %exitcode%
