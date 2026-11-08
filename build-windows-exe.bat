@echo off
title OmniChurch Pro - Windows .EXE Builder
color 0A

echo ========================================================
echo       OMNICHURCH PRO - BUILDER POU WINDOWS (.EXE)
echo ========================================================
echo.
echo [1/3] Verifikasyon anviwonman Node.js ak depandans yo...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js pa enstale sou PC sa a!
    echo Tanpri telechaje epi enstale Node.js sou: https://nodejs.org
    echo Apre sa, relanse script sa a.
    pause
    exit /b
)

if not exist node_modules (
    echo Depandans yo poko enstale. N ap lanse "npm install" otomatikman...
    call npm install
)

if not exist node_modules\vite (
    echo Vite pa detekte nan node_modules. N ap enstale li kounye a...
    call npm install
)

echo [OK] Node.js ak depandans yo pare!
echo.
echo [2/3] Konpilasyon aplikasyon an ak Vite (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERREUR] Konpilasyon Vite echwe!
    pause
    exit /b
)

echo.
echo [3/3] Kreyasyon fichye .EXE Windows la ak Electron Builder...
echo N ap jenere fichye .exe a kounye a (sa ka pran 1 a 2 minit)...
call npx --yes electron-builder --win --x64

if %errorlevel% neq 0 (
    echo.
    echo [AVÈTISMAN] Eseye kreyasyon vèsyon Portable .EXE a...
    call npx --yes electron-builder --win portable
)

echo.
echo ========================================================
echo  BRAVO! Fichye .EXE la kreye avèk siksè nan dosye "dist_electron" oswa "dist"!
echo ========================================================
echo.
echo W ap jwenn:
echo  1) Installer Setup .exe pou enstale l sou nenpòt PC Windows
echo  2) Vèsyon Portable .exe ki ouvri dirèkteman san enstalasyon
echo.
pause
