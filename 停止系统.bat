@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
title Stop Projects Docker

call "%~dp0scripts\resolve-projects-dir.bat"
if not defined PROJECTS_DIR (
    echo [ERROR] projects workspace not found.
    pause
    exit /b 1
)
cd /d "%PROJECTS_DIR%"

echo Stopping Docker stack "projects"...
docker compose down
echo Done.
pause
endlocal