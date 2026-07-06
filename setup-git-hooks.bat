@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Install Git Hooks (All Repos)

call "%~dp0scripts\resolve-projects-dir.bat"
if not defined PROJECTS_DIR set "PROJECTS_DIR=%~dp0"
if "%PROJECTS_DIR:~-1%"=="\" set "PROJECTS_DIR=%PROJECTS_DIR:~0,-1%"

echo ========================================
echo   Install data-safety Git hooks
echo ========================================
echo.

if exist "%PROJECTS_DIR%\subi_knowledge_platform\setup-git-hooks.bat" (
    call "%PROJECTS_DIR%\subi_knowledge_platform\setup-git-hooks.bat"
) else (
    echo [SKIP] subi_knowledge_platform not found
)

echo.
echo Done. Hooks only affect future commits.
pause
endlocal