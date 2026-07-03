@echo off
chcp 65001 >nul
title Sub-I 整合项目 Docker 启动

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-docker.ps1" -Mode default
set "EXIT_CODE=%errorlevel%"

if %EXIT_CODE% neq 0 (
    echo.
    echo [ERROR] 启动失败，错误码: %EXIT_CODE%
)
pause
exit /b %EXIT_CODE%