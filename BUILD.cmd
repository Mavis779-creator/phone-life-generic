@echo off
setlocal
cd /d "%~dp0"
set PYTHONUTF8=1
where py >nul 2>nul
if errorlevel 1 goto use_python
py -3 scripts\build.py
goto done
:use_python
python scripts\build.py
:done
if errorlevel 1 goto failed
echo Build complete. Open index.html in this folder.
pause
exit /b 0
:failed
echo Build failed. Check the error above. Python 3.10 or newer is required.
pause
exit /b 1
