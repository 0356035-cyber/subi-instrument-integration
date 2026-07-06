@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Verify Data Safety

call "%~dp0scripts\resolve-projects-dir.bat"
if not defined PROJECTS_DIR set "PROJECTS_DIR=%~dp0"
if "%PROJECTS_DIR:~-1%"=="\" set "PROJECTS_DIR=%PROJECTS_DIR:~0,-1%"

set "SUBI_REPO=%PROJECTS_DIR%\subi_knowledge_platform"
set "SUBI_DB=%SUBI_REPO%\data\subi_knowledge.db"
set "BACKUP_ROOT=%PROJECTS_DIR%\backups"
set "PY=%PROJECTS_DIR%\scripts\data_safety.py"
set "FAIL=0"

echo ========================================
echo   Data Safety Verification
echo ========================================
echo.

python "%PY%" check-git "%SUBI_REPO%"
if errorlevel 1 set "FAIL=1"

for /f "delims=" %%D in ('dir /b /ad /o-n "%BACKUP_ROOT%" 2^>nul ^| findstr /r "^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_"') do (
    set "LATEST=%%D"
    goto :have_latest
)
:have_latest
if not defined LATEST (
    echo [WARN] No timestamped backup folder under %BACKUP_ROOT%
    set "FAIL=1"
) else (
    echo [INFO] Latest backup folder: %LATEST%
    if exist "%BACKUP_ROOT%\%LATEST%\subi_knowledge.db" (
        python "%PY%" verify "%BACKUP_ROOT%\%LATEST%\subi_knowledge.db"
        if errorlevel 1 set "FAIL=1"
    ) else (
        echo [FAIL] Latest backup missing subi_knowledge.db
        set "FAIL=1"
    )
)

if exist "%SUBI_DB%" (
    python "%PY%" verify "%SUBI_DB%"
    if errorlevel 1 set "FAIL=1"
) else (
    echo [WARN] Live database not found: %SUBI_DB%
)

echo.
if "%FAIL%"=="0" (
    echo [OK] Data safety checks passed.
) else (
    echo [FAIL] One or more checks failed. Run backup-data.bat and setup-git-hooks.bat.
)
echo ========================================
pause
endlocal & exit /b %FAIL%