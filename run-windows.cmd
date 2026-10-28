@echo off
setlocal
cd /d "%~dp0"
title LaTeXStudio Local - SERVER (Ctrl+C = Stop)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-windows.ps1"
set "exitcode=%errorlevel%"
echo.
echo [LaTeXStudio] Server berhenti. Anda dapat menutup terminal ini.
if not "%exitcode%"=="0" echo [INFO] Jika ada error, periksa pesan di atas.
pause
exit /b %exitcode%
