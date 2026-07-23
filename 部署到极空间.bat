@echo off
setlocal
title Deploy To NAS

echo This will build images, upload code and images, back up NAS data and configuration, and restart NAS containers.
echo Runtime configuration, databases, and uploads are not uploaded from this computer.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-zspace.ps1"
set "EXIT_CODE=%errorlevel%"
if %EXIT_CODE% neq 0 (
    echo [ERROR] Deployment failed, code: %EXIT_CODE%
) else (
    echo [OK] NAS deployment completed.
)
pause
exit /b %EXIT_CODE%
