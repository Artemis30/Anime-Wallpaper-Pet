@echo off
cd /d "%~dp0"
if exist "dist\Capri-portable.exe" (
  start "" "dist\Capri-portable.exe"
  exit /b
)
if exist "node_modules\electron\dist\electron.exe" (
  start "" "node_modules\electron\dist\electron.exe" .
  exit /b
)
echo Primero ejecuta INSTALAR.bat
pause
