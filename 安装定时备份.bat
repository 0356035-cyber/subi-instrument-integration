@echo off
chcp 65001 >nul
title 安装每日自动备份

call "%~dp0scripts\resolve-projects-dir.bat"
if not defined PROJECTS_DIR (
    echo [ERROR] 未找到 projects 工作区。
    pause
    exit /b 1
)

set "TASK_NAME=ProjectsDataBackup"
set "BACKUP_BAT=%PROJECTS_DIR%\scheduled-backup.bat"

echo ========================================
echo   安装 Windows 计划任务：每日自动备份
echo ========================================
echo.
echo 工作区：%PROJECTS_DIR%
echo 任务名：%TASK_NAME%
echo 执行时间：每天 02:00
echo 保留份数：最近 14 份
echo 日志：%PROJECTS_DIR%\backups\scheduled-backup.log
echo.

schtasks /Query /TN "%TASK_NAME%" >nul 2>&1
if %errorlevel%==0 (
    echo [INFO] 任务已存在，将先删除后重建...
    schtasks /Delete /TN "%TASK_NAME%" /F >nul
)

schtasks /Create /TN "%TASK_NAME%" /TR "\"%BACKUP_BAT%\"" /SC DAILY /ST 02:00 /RL LIMITED /F
if %errorlevel% neq 0 (
    echo [ERROR] 计划任务创建失败。请以管理员身份运行本脚本。
    pause
    exit /b 1
)

echo.
echo [OK] 定时备份已安装。
echo.
echo 立即测试一次：
echo   %BACKUP_BAT%
echo.
echo 卸载任务请运行：%PROJECTS_DIR%\卸载定时备份.bat
echo ========================================
pause