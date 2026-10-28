@echo off
setlocal
cd /d "%~dp0"
title LaTeXStudio Local - Setup dan Server
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-windows.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] Setup gagal. Coba install-windows.bat
  pause
  exit /b 1
)
call "%~dp0run-windows.cmd"
