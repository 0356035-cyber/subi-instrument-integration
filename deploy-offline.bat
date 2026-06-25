@echo off
chcp 65001 >nul
title 离线一键部署

set "PACKAGE_DIR=%~dp0"
if "%PACKAGE_DIR:~-1%"=="\" set "PACKAGE_DIR=%PACKAGE_DIR:~0,-1%"

echo ========================================
echo   离线一键部署（单位/不联网电脑执行）
echo ========================================
echo 部署包目录: %PACKAGE_DIR%
echo.
echo 前提：已安装并启动 Docker Desktop
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_DIR%\deploy-offline.ps1" -PackageDir "%PACKAGE_DIR%"
set "EXIT_CODE=%errorlevel%"

echo.
if %EXIT_CODE% neq 0 (
    echo [ERROR] 部署失败，代码：%EXIT_CODE%
) else (
    echo [OK] 部署完成，可用浏览器访问 8510 / 8501
)
pause
exit /b %EXIT_CODE%