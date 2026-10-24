@echo off
setlocal
cd /d "%~dp0"
set PYTHONUTF8=1
set "PHONE_PYTHON=python"
where py >nul 2>nul
if not errorlevel 1 set "PHONE_PYTHON=py -3"
%PHONE_PYTHON% scripts\build.py
if errorlevel 1 goto failed
%PHONE_PYTHON% tests\config_test.py
if errorlevel 1 goto failed
node tests\template.cjs
if errorlevel 1 goto failed
echo All checks passed. These are logic tests, not browser or device tests.
pause
exit /b 0
:failed
echo Check failed. Python 3.10+ and Node.js 20+ must be available on PATH.
pause
exit /b 1
