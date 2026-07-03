@echo off
chcp 65001 >nul
title Docker 启动（极空间兼容 Compose）

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-docker.ps1" -Mode zspace
set "EXIT_CODE=%errorlevel%"

if %EXIT_CODE% neq 0 (
    echo.
    echo [ERROR] 启动失败，错误码: %EXIT_CODE%
)
pause
exit /b %EXIT_CODE%