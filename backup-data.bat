@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Project Data Backup

echo ========================================
echo   Sub-I + Training System Backup
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
set "PROJECTS_DIR="

if exist "%SCRIPT_DIR%..\instrument-training-home\data" (
    for %%I in ("%SCRIPT_DIR%..") do set "PROJECTS_DIR=%%~fI"
)
if not defined PROJECTS_DIR if exist "D:\projects\instrument-training-home\data" (
    set "PROJECTS_DIR=D:\projects"
)
if not defined PROJECTS_DIR if exist "C:\projects\instrument-training-home\data" (
    set "PROJECTS_DIR=C:\projects"
)

if not defined PROJECTS_DIR (
    echo [ERROR] Project folder not found.
    pause
    exit /b 1
)

set "TRAIN_DB=%PROJECTS_DIR%\instrument-training-home\data\instrument_training.db"
set "SUBI_DB=%PROJECTS_DIR%\subi_knowledge_platform\data\subi_knowledge.db"
set "SUBI_UPLOADS=%PROJECTS_DIR%\subi_knowledge_platform\uploads"
set "BACKUP_ROOT=%PROJECTS_DIR%\backups"

for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmmss'"`) do set "STAMP=%%T"
set "BACKUP_DIR=%BACKUP_ROOT%\%STAMP%"

echo Projects: %PROJECTS_DIR%
echo Backup to: %BACKUP_DIR%
echo.
echo Files:
echo   1. instrument_training.db
echo   2. subi_knowledge.db
echo   3. uploads folder
echo.

set "WARN_RUNNING=0"
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul && set "WARN_RUNNING=1"
netstat -ano | findstr ":8001" | findstr "LISTENING" >nul && set "WARN_RUNNING=1"
netstat -ano | findstr ":8510" | findstr "LISTENING" >nul && set "WARN_RUNNING=1"

if "%WARN_RUNNING%"=="1" (
    echo [WARNING] Ports 8000/8001/8510 are in use.
    echo           Stop Docker or local services before backup.
    echo.
    set /p "CONTINUE=Type Y to continue anyway: "
    if /i not "!CONTINUE!"=="Y" exit /b 0
    echo.
)

if not exist "%TRAIN_DB%" if not exist "%SUBI_DB%" (
    echo [ERROR] No database files found.
    pause
    exit /b 1
)

mkdir "%BACKUP_DIR%" 2>nul
if not exist "%BACKUP_DIR%" (
    echo [ERROR] Cannot create: %BACKUP_DIR%
    pause
    exit /b 1
)

echo [INFO] Copying...
echo.
set "COPIED=0"

if exist "%TRAIN_DB%" (
    copy /Y "%TRAIN_DB%" "%BACKUP_DIR%\instrument_training.db" >nul
    if !errorlevel!==0 (
        echo [OK] instrument_training.db
        set "COPIED=1"
    ) else (
        echo [FAIL] instrument_training.db
    )
) else (
    echo [SKIP] instrument_training.db
)

if exist "%SUBI_DB%" (
    copy /Y "%SUBI_DB%" "%BACKUP_DIR%\subi_knowledge.db" >nul
    if !errorlevel!==0 (
        echo [OK] subi_knowledge.db
        set "COPIED=1"
    ) else (
        echo [FAIL] subi_knowledge.db
    )
) else (
    echo [SKIP] subi_knowledge.db
)

if exist "%SUBI_UPLOADS%" (
    robocopy "%SUBI_UPLOADS%" "%BACKUP_DIR%\uploads" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul
    if !errorlevel! LSS 8 (
        echo [OK] uploads
        set "COPIED=1"
    ) else (
        echo [FAIL] uploads
    )
) else (
    echo [SKIP] uploads
)

if "%COPIED%"=="0" (
    echo.
    echo [ERROR] Nothing was backed up.
    rmdir "%BACKUP_DIR%" 2>nul
    pause
    exit /b 1
)

(
    echo backup_time=%STAMP%
    echo source=%PROJECTS_DIR%
    echo.
    echo instrument_training.db = training system
    echo subi_knowledge.db = Sub-I library
    echo uploads = Sub-I attachments
    echo.
    echo Restore: run restore-data.bat and pick this folder.
) > "%BACKUP_DIR%\README.txt"

echo.
echo ========================================
echo Backup done.
echo.
echo Folder:
echo   %BACKUP_DIR%
echo.
echo Copy this folder to USB drive, then on another PC
echo put it under: %BACKUP_ROOT%
echo and run restore-data.bat
echo ========================================
echo.
pause
endlocal