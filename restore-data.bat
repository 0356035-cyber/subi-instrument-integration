@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Project Data Restore

echo ========================================
echo   Sub-I + Training System Restore
echo ========================================
echo.

call "%~dp0scripts\resolve-projects-dir.bat"
if not defined PROJECTS_DIR (
    if exist "%~dp0instrument-training-home\app\main.py" (
        set "PROJECTS_DIR=%~dp0"
        if "!PROJECTS_DIR:~-1!"=="\" set "PROJECTS_DIR=!PROJECTS_DIR:~0,-1!"
    )
)
if not defined PROJECTS_DIR (
    echo [ERROR] Project folder not found.
    echo         Expected instrument-training-home and subi_knowledge_platform under C:\projects or D:\projects
    pause
    exit /b 1
)
echo Projects: %PROJECTS_DIR%
echo.

set "TRAIN_DB=%PROJECTS_DIR%\instrument-training-home\data\instrument_training.db"
set "SUBI_DB=%PROJECTS_DIR%\subi_knowledge_platform\data\subi_knowledge.db"
set "SUBI_UPLOADS=%PROJECTS_DIR%\subi_knowledge_platform\uploads"
set "BACKUP_ROOT=%PROJECTS_DIR%\backups"

if not exist "%BACKUP_ROOT%" (
    echo [ERROR] No backups folder: %BACKUP_ROOT%
    pause
    exit /b 1
)

echo Projects: %PROJECTS_DIR%
echo Backups:  %BACKUP_ROOT%
echo.

set "COUNT=0"
for /f "delims=" %%D in ('dir /b /ad /o-n "%BACKUP_ROOT%" 2^>nul') do (
    set /a COUNT+=1
    set "BDIR_!COUNT!=%%D"
)

if "%COUNT%"=="0" (
    echo [ERROR] No backup folders found.
    echo Put backup folders under: %BACKUP_ROOT%
    pause
    exit /b 1
)

echo Available backups ^(newest first^):
echo.
for /l %%I in (1,1,%COUNT%) do (
    echo   [%%I] !BDIR_%%I!
)
echo.
set "CHOICE="
set /p "CHOICE=Enter number ^(Enter = latest [1]^): "

if "%CHOICE%"=="" set "CHOICE=1"
if %CHOICE% LSS 1 set "CHOICE=1"
if %CHOICE% GTR %COUNT% (
    echo [ERROR] Invalid number.
    pause
    exit /b 1
)

set "SELECTED=!BDIR_%CHOICE%!"
set "SRC=%BACKUP_ROOT%\!SELECTED!"

echo.
echo Restore from: !SELECTED!
echo Source: %SRC%
echo.
echo [WARNING] This will overwrite current databases and uploads.
echo You must type the backup folder name to confirm:
echo   !SELECTED!
set /p "CONFIRM_NAME=Folder name: "
if /i not "!CONFIRM_NAME!"=="!SELECTED!" (
    echo [CANCELLED] Folder name did not match.
    pause
    exit /b 0
)
echo.

set "WARN_RUNNING=0"
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul && set "WARN_RUNNING=1"
netstat -ano | findstr ":8001" | findstr "LISTENING" >nul && set "WARN_RUNNING=1"
netstat -ano | findstr ":8510" | findstr "LISTENING" >nul && set "WARN_RUNNING=1"

if "%WARN_RUNNING%"=="1" (
    echo [WARNING] Services are running. Stop them first if possible.
    echo           docker compose down  ^(in %PROJECTS_DIR%^)
    echo.
    set /p "CONTINUE=Type Y to continue anyway: "
    if /i not "!CONTINUE!"=="Y" exit /b 0
    echo.
)

for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmmss'"`) do set "STAMP=%%T"
set "SAFETY_DIR=%BACKUP_ROOT%\pre_restore_%STAMP%"
set "PY_SAFETY=%PROJECTS_DIR%\scripts\data_safety.py"

echo [INFO] Saving current data to:
echo        %SAFETY_DIR%
mkdir "%SAFETY_DIR%" 2>nul
if exist "%TRAIN_DB%" python "%PY_SAFETY%" backup "%TRAIN_DB%" "%SAFETY_DIR%\instrument_training.db" >nul
if exist "%SUBI_DB%" python "%PY_SAFETY%" backup "%SUBI_DB%" "%SAFETY_DIR%\subi_knowledge.db" >nul
if exist "%SUBI_UPLOADS%" robocopy "%SUBI_UPLOADS%" "%SAFETY_DIR%\uploads" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul
echo [OK] Safety backup saved
echo.

mkdir "%PROJECTS_DIR%\instrument-training-home\data" 2>nul
mkdir "%PROJECTS_DIR%\subi_knowledge_platform\data" 2>nul
mkdir "%SUBI_UPLOADS%" 2>nul

set "RESTORED=0"

if exist "%SRC%\instrument_training.db" (
    copy /Y "%SRC%\instrument_training.db" "%TRAIN_DB%" >nul
    if !errorlevel!==0 (
        echo [OK] instrument_training.db restored
        set "RESTORED=1"
    ) else (
        echo [FAIL] instrument_training.db
    )
) else (
    echo [SKIP] no instrument_training.db in backup
)

if exist "%SRC%\subi_knowledge.db" (
    copy /Y "%SRC%\subi_knowledge.db" "%SUBI_DB%" >nul
    if !errorlevel!==0 (
        echo [OK] subi_knowledge.db restored
        set "RESTORED=1"
    ) else (
        echo [FAIL] subi_knowledge.db
    )
) else (
    echo [SKIP] no subi_knowledge.db in backup
)

if exist "%SRC%\uploads" (
    robocopy "%SRC%\uploads" "%SUBI_UPLOADS%" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul
    if !errorlevel! LSS 8 (
        echo [OK] uploads restored
        set "RESTORED=1"
    ) else (
        echo [FAIL] uploads
    )
) else (
    echo [SKIP] no uploads in backup
)

if "%RESTORED%"=="0" (
    echo.
    echo [ERROR] Nothing was restored.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Restore done.
echo.
echo Restart services:
echo   cd %PROJECTS_DIR%
echo   docker compose up -d
echo.
echo Rollback safety copy:
echo   %SAFETY_DIR%
echo ========================================
echo.
pause
endlocal