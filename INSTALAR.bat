@echo off
setlocal
cd /d "%~dp0"
title Capri - instalador
echo ==========================================
echo   Capri - instalador (crea Capri.exe)
echo ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 goto nonode

echo [1/3] Limpiando instalacion anterior...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /q package-lock.json
if exist dist rmdir /s /q dist

echo [2/3] Instalando dependencias, puede tardar unos minutos...
call npm install
if errorlevel 1 goto fail

if exist "node_modules\electron\dist\electron.exe" goto build
echo Electron no se descargo bien. Reintentando...
node node_modules\electron\install.js
if exist "node_modules\electron\dist\electron.exe" goto build
echo Probando con un servidor espejo...
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
node node_modules\electron\install.js
if not exist "node_modules\electron\dist\electron.exe" goto fail

:build
echo [3/3] Creando Capri.exe ...
call npm run dist
if not errorlevel 1 goto done
echo Reintentando sin editar el ejecutable...
call npm run dist -- --config.win.signAndEditExecutable=false
if errorlevel 1 goto nobuild

:done
if exist "dist\Capri-portable.exe" powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Capri.lnk');$s.TargetPath='%~dp0dist\Capri-portable.exe';$s.WorkingDirectory='%~dp0dist';$s.Save()"
echo.
echo ==========================================
echo   LISTO
echo   Instalador:  dist\Capri-Setup.exe
echo   Portable:    dist\Capri-portable.exe
echo   Se ha creado un acceso directo "Capri" en el escritorio.
echo ==========================================
explorer dist
pause
exit /b 0

:nonode
echo Node.js no esta instalado. Descarga la version LTS en https://nodejs.org
echo e instalala. Despues vuelve a ejecutar este archivo.
pause
exit /b 1

:nobuild
echo.
echo No se pudo crear el .exe. Puedes usar EJECUTAR.bat para abrir Capri igualmente.
echo Si el error menciona "symbolic link", activa el Modo desarrollador de Windows
echo o ejecuta este archivo como administrador, y vuelve a probar.
pause
exit /b 1

:fail
echo.
echo La instalacion ha fallado. Revisa los mensajes de error de arriba.
pause
exit /b 1
