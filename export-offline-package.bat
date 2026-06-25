@echo off
setlocal EnableDelayedExpansion
title Export Offline Deploy Package

call "%~dp0scripts\resolve-projects-dir.bat"
if not defined PROJECTS_DIR (
    if exist "%~dp0instrument-training-home\app\main.py" (
        set "PROJECTS_DIR=%~dp0"
        if "!PROJECTS_DIR:~-1!"=="\" set "PROJECTS_DIR=!PROJECTS_DIR:~0,-1!"
    )
)
if not defined PROJECTS_DIR (
    echo [ERROR] Projects workspace not found.
    pause
    exit /b 1
)

echo ========================================
echo   Export Offline Deploy Package
echo ========================================
echo Workspace: %PROJECTS_DIR%
echo.
echo Package includes:
echo   1. Code snapshot (3 repos)
echo   2. Docker images (docker-images.tar)
echo   3. Business data backup (optional)
echo   4. deploy-offline.bat for offline PC
echo.
echo Requires: Docker Desktop running and network for docker compose build
echo.

set "INCLUDE_DATA=-IncludeData"
set /p "SKIP_DATA=Skip business data, code+images only? (Y/N, default N): "
if /i "%SKIP_DATA%"=="Y" set "INCLUDE_DATA="

powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECTS_DIR%\scripts\export-offline-package.ps1" -ProjectsDir "%PROJECTS_DIR%" %INCLUDE_DATA%
set "EXIT_CODE=%errorlevel%"

echo.
if %EXIT_CODE% neq 0 (
    echo [ERROR] Export failed, code: %EXIT_CODE%
) else (
    echo [OK] Copy backups\offline-deploy_* folder to USB drive.
)
pause
exit /b %EXIT_CODE%