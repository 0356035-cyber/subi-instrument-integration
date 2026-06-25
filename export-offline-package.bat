@echo off
chcp 65001 >nul
title 导出离线部署包

call "%~dp0scripts\resolve-projects-dir.bat"
if not defined PROJECTS_DIR (
    echo [ERROR] 未找到 projects 工作区。
    pause
    exit /b 1
)

echo ========================================
echo   导出离线部署包（家里/联网电脑执行）
echo ========================================
echo 工作目录: %PROJECTS_DIR%
echo.
echo 将打包：
echo   1. 三仓库代码快照
echo   2. 已构建的 Docker 镜像（docker-images.tar）
echo   3. 最新业务数据备份（可选）
echo   4. 单位电脑一键部署脚本 deploy-offline.bat
echo.
echo 前提：Docker Desktop 已启动，且本机可联网完成 docker compose build
echo.

set "INCLUDE_DATA=-IncludeData"
set /p "SKIP_DATA=是否跳过业务数据，仅更新代码+镜像？(Y/N，默认 N): "
if /i "%SKIP_DATA%"=="Y" set "INCLUDE_DATA="

powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECTS_DIR%\scripts\export-offline-package.ps1" %INCLUDE_DATA%
set "EXIT_CODE=%errorlevel%"

echo.
if %EXIT_CODE% neq 0 (
    echo [ERROR] 导出失败，代码：%EXIT_CODE%
) else (
    echo [OK] 请将 backups\offline-deploy_* 整个文件夹复制到 U 盘。
)
pause
exit /b %EXIT_CODE%