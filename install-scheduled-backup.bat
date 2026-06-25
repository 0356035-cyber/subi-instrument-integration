@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
title Install Scheduled Backup

call "%~dp0scripts\resolve-projects-dir.bat"
if not defined PROJECTS_DIR (
    echo [ERROR] projects workspace not found.
    pause
    exit /b 1
)

set "TASK_NAME=ProjectsDataBackup"
set "BACKUP_BAT=%PROJECTS_DIR%\scheduled-backup.bat"

echo ========================================
echo   Install daily backup task
echo ========================================
echo.
echo Workspace: %PROJECTS_DIR%
echo Task name: %TASK_NAME%
echo Schedule : daily at 02:00
echo Keep     : latest 14 backups
echo Log file : %PROJECTS_DIR%\backups\scheduled-backup.log
echo.

if not exist "%BACKUP_BAT%" (
    echo [ERROR] Missing script: %BACKUP_BAT%
    pause
    exit /b 1
)

schtasks /Query /TN "%TASK_NAME%" >nul 2>&1
if %errorlevel%==0 (
    echo [INFO] Existing task found, recreating...
    schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1
)

schtasks /Create /TN "%TASK_NAME%" /TR "cmd /c \"%BACKUP_BAT%\"" /SC DAILY /ST 02:00 /RL LIMITED /F
if errorlevel 1 (
    echo [ERROR] Failed to create scheduled task.
    echo         Please run this script as Administrator.
    pause
    exit /b 1
)

echo.
echo [OK] Scheduled backup installed.
echo.
echo Test now:
echo   %BACKUP_BAT%
echo.
echo Uninstall:
echo   %PROJECTS_DIR%\uninstall-scheduled-backup.bat
echo ========================================
pause
endlocal
exit /b 0