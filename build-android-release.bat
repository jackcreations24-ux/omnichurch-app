@echo off
echo ========================================================
echo    OMNICHURCH ANDROID RELEASE BUILD SCRIPT
echo ========================================================
echo.

echo [1/3] Building Web Assets (Vite)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Syncing Android Capacitor Project...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Launching Android Studio or Building APK...
echo Pwoje a pare nèt!
echo Pou kreye fichye final la (APK oswa AAB) :
echo   1. Ouvri dosye 'android' nan Android Studio.
echo   2. Ale nan meni: Build ^> Generate Signed Bundle / APK...
echo.
pause
