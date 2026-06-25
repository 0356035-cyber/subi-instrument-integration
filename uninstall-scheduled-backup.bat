@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
set "TASK_NAME=ProjectsDataBackup"
schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Removed scheduled task: %TASK_NAME%
) else (
    echo [INFO] Task not found: %TASK_NAME%
)
pause
endlocal
exit /b 0