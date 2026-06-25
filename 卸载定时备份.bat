@echo off
chcp 65001 >nul
set "TASK_NAME=ProjectsDataBackup"
schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1
if %errorlevel%==0 (
    echo [OK] 已卸载定时备份任务 %TASK_NAME%
) else (
    echo [INFO] 未找到任务 %TASK_NAME%
)
pause