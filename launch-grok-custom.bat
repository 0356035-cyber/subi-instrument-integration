@echo off
setlocal EnableDelayedExpansion
title Grok Build Custom Workspace

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "GROK_BIN_DIR=%USERPROFILE%\.grok\bin"
set "LAST_WORKDIR_FILE=%USERPROFILE%\.grok\last-grok-workdir.txt"

set "DEFAULT_WORKDIR=%SCRIPT_DIR%"
call "%SCRIPT_DIR%\scripts\resolve-projects-dir.bat" 2>nul
if defined PROJECTS_DIR set "DEFAULT_WORKDIR=%PROJECTS_DIR%"
if not exist "%DEFAULT_WORKDIR%" set "DEFAULT_WORKDIR=D:\projects"

set "LAST_WORKDIR="
if exist "%LAST_WORKDIR_FILE%" (
    set /p "LAST_WORKDIR="<"%LAST_WORKDIR_FILE%"
)

set "GROK_WORKDIR="
if not "%~1"=="" set "GROK_WORKDIR=%~1"

:pick_workspace
if defined GROK_WORKDIR goto workspace_ready

echo ========================================
echo   Grok Build - Pick Workspace
echo ========================================
echo.
echo   [1] Default projects folder
echo       %DEFAULT_WORKDIR%
if defined LAST_WORKDIR (
    echo   [2] Last used folder
    echo       !LAST_WORKDIR!
) else (
    echo   [2] Last used folder ^(none^)
)
echo   [3] Browse folder... ^(Windows picker^)
echo   [4] Type path manually
echo.
set "CHOICE="
set /p "CHOICE=Select 1-4, Enter=1: "
if "%CHOICE%"=="" set "CHOICE=1"

if "%CHOICE%"=="1" (
    set "GROK_WORKDIR=%DEFAULT_WORKDIR%"
    goto workspace_ready
)
if "%CHOICE%"=="2" (
    if not defined LAST_WORKDIR (
        echo.
        echo [INFO] No last folder saved yet. Pick option 3 or 4.
        echo.
        goto pick_workspace
    )
    set "GROK_WORKDIR=!LAST_WORKDIR!"
    goto workspace_ready
)
if "%CHOICE%"=="3" (
    set "PICK_START=%DEFAULT_WORKDIR%"
    if defined LAST_WORKDIR set "PICK_START=!LAST_WORKDIR!"
    for /f "usebackq delims=" %%W in (`powershell -NoProfile -STA -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\scripts\pick-grok-workdir.ps1" -InitialPath "!PICK_START!" 2^>nul`) do set "GROK_WORKDIR=%%W"
    if not defined GROK_WORKDIR (
        echo.
        echo [INFO] Folder picker cancelled.
        echo.
        goto pick_workspace
    )
    goto workspace_ready
)
if "%CHOICE%"=="4" (
    set /p "GROK_WORKDIR=Workspace path: "
    if not defined GROK_WORKDIR goto pick_workspace
    goto workspace_ready
)

echo.
echo [INFO] Invalid choice. Try again.
echo.
goto pick_workspace

:workspace_ready
if "!GROK_WORKDIR:~-1!"=="\" set "GROK_WORKDIR=!GROK_WORKDIR:~0,-1!"

if not exist "!GROK_WORKDIR!" (
    echo [ERROR] Folder not found: !GROK_WORKDIR!
    set "GROK_WORKDIR="
    pause
    goto pick_workspace
)

if not exist "%USERPROFILE%\.grok" mkdir "%USERPROFILE%\.grok" 2>nul
> "%LAST_WORKDIR_FILE%" echo !GROK_WORKDIR!

set "PROXY_HOST=127.0.0.1"
set "PROXY_PORT=7890"
set "PROXY_SCHEME=http"
set "SOCKS_PROXY=socks5://127.0.0.1:7891"
set "NO_PROXY=localhost,127.0.0.1,::1,*.local"

if exist "%SCRIPT_DIR%\grok-proxy.env" (
    echo [INFO] Loading grok-proxy.env
    copy /y "%SCRIPT_DIR%\grok-proxy.env" "%TEMP%\grok-proxy-load.bat" >nul
    call "%TEMP%\grok-proxy-load.bat"
    del "%TEMP%\grok-proxy-load.bat"
) else (
    echo [INFO] grok-proxy.env not found, using default proxy %PROXY_SCHEME%://%PROXY_HOST%:%PROXY_PORT%
)

set "HTTP_PROXY=%PROXY_SCHEME%://%PROXY_HOST%:%PROXY_PORT%"
set "HTTPS_PROXY=%PROXY_SCHEME%://%PROXY_HOST%:%PROXY_PORT%"
set "http_proxy=%HTTP_PROXY%"
set "https_proxy=%HTTPS_PROXY%"
if defined SOCKS_PROXY set "ALL_PROXY=%SOCKS_PROXY%"
if defined NO_PROXY set "no_proxy=%NO_PROXY%"
set "GROK_WEB_FETCH_PROXY=%HTTP_PROXY%"

echo.
echo Workspace: !GROK_WORKDIR!
echo HTTP proxy: %HTTP_PROXY%
if defined ALL_PROXY echo SOCKS proxy: %ALL_PROXY%
echo.

if not exist "%GROK_BIN_DIR%\grok.exe" (
    echo [ERROR] grok.exe not found: %GROK_BIN_DIR%\grok.exe
    echo         Install: irm https://x.ai/cli/install.ps1 ^| iex
    pause
    exit /b 1
)

set "PATH=%GROK_BIN_DIR%;%PATH%"
cd /d "!GROK_WORKDIR!"
if !errorlevel! neq 0 (
    echo [ERROR] Cannot cd to: !GROK_WORKDIR!
    pause
    exit /b 1
)

echo [OK] Starting Grok Build ...
echo      Exit: Ctrl+D or /quit
echo      New task in session: /new
echo.

grok
set "EXIT_CODE=!errorlevel!"

if !EXIT_CODE! neq 0 (
    echo.
    echo [ERROR] Grok exited with code: !EXIT_CODE!
    echo         Check proxy, auth, and network.
    pause
)

exit /b !EXIT_CODE!