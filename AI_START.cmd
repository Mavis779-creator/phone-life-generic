@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto failed
node server\ai-server.mjs
pause
exit /b 0
:failed
echo Node.js 20+ is required. Install Node.js and run this file again.
pause
exit /b 1
