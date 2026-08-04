@echo off
setlocal
title Install NAS Deployment Access

echo This one-time setup will add the NAS SSH alias and open a terminal for one sudo-authorized installation.
echo It does not upload databases, attachments, or runtime configuration.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-zspace-deploy-access.ps1"
set "EXIT_CODE=%errorlevel%"
if %EXIT_CODE% neq 0 (
    echo [ERROR] Setup preparation failed, code: %EXIT_CODE%
) else (
    echo [OK] NAS authorization terminal opened. Complete the sudo prompt there.
)
pause
exit /b %EXIT_CODE%
