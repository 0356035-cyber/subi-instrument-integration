@echo off
title Offline Deploy

set "PACKAGE_DIR=%~dp0"
if "%PACKAGE_DIR:~-1%"=="\" set "PACKAGE_DIR=%PACKAGE_DIR:~0,-1%"

echo ========================================
echo   Offline Deploy
echo ========================================
echo Package dir: %PACKAGE_DIR%
echo.
echo Requires: Docker Desktop installed and running
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_DIR%\deploy-offline.ps1" -PackageDir "%PACKAGE_DIR%"
set "EXIT_CODE=%errorlevel%"

echo.
if %EXIT_CODE% neq 0 (
    echo [ERROR] Deploy failed, code: %EXIT_CODE%
) else (
    echo [OK] Open http://127.0.0.1:8510 and http://127.0.0.1:8501
)
pause
exit /b %EXIT_CODE%