@echo off
setlocal
cd /d "%~dp0"
rem The first launch also installs to Documents\EK-TeX, then opens the server.
call "%~dp0install-windows.bat"
exit /b %errorlevel%
