@echo off
chcp 65001 >nul
title Grok Build 一键启动

echo ========================================
echo   Grok Build 一键启动（含代理配置）
echo ========================================
echo.

REM ================================
REM 路径
REM ================================
set "SCRIPT_DIR=%~dp0"
set "GROK_BIN_DIR=%USERPROFILE%\.grok\bin"
set "GROK_WORKDIR=%SCRIPT_DIR%"

REM ================================
REM 代理默认值（可被 grok-proxy.env 覆盖）
REM ================================
set "PROXY_HOST=127.0.0.1"
set "PROXY_PORT=7890"
set "PROXY_SCHEME=http"
set "SOCKS_PROXY=socks5://127.0.0.1:7891"
set "NO_PROXY=localhost,127.0.0.1,::1,*.local"

if exist "%SCRIPT_DIR%grok-proxy.env" (
    echo [INFO] 加载本地代理配置：grok-proxy.env
    copy /y "%SCRIPT_DIR%grok-proxy.env" "%TEMP%\grok-proxy-load.bat" >nul
    call "%TEMP%\grok-proxy-load.bat"
    del "%TEMP%\grok-proxy-load.bat"
) else (
    echo [INFO] 未找到 grok-proxy.env，使用默认代理 %PROXY_SCHEME%://%PROXY_HOST%:%PROXY_PORT%
    echo       可复制 grok-proxy.env.example 为 grok-proxy.env 后修改。
)
echo.

REM ================================
REM 应用代理环境变量
REM ================================
set "HTTP_PROXY=%PROXY_SCHEME%://%PROXY_HOST%:%PROXY_PORT%"
set "HTTPS_PROXY=%PROXY_SCHEME%://%PROXY_HOST%:%PROXY_PORT%"
set "http_proxy=%HTTP_PROXY%"
set "https_proxy=%HTTPS_PROXY%"
if defined SOCKS_PROXY set "ALL_PROXY=%SOCKS_PROXY%"
if defined NO_PROXY set "no_proxy=%NO_PROXY%"

REM Grok web_fetch 工具代理（与 HTTP 代理一致）
set "GROK_WEB_FETCH_PROXY=%HTTP_PROXY%"

echo 工作目录：  %GROK_WORKDIR%
echo HTTP 代理： %HTTP_PROXY%
if defined ALL_PROXY echo SOCKS 代理：%ALL_PROXY%
echo NO_PROXY：  %NO_PROXY%
echo.

REM ================================
REM 检查 grok 是否可用
REM ================================
if not exist "%GROK_BIN_DIR%\grok.exe" (
    echo [ERROR] 未找到 grok.exe：%GROK_BIN_DIR%\grok.exe
    echo         请先安装 Grok Build：
    echo         irm https://x.ai/cli/install.ps1 ^| iex
    pause
    exit /b 1
)

set "PATH=%GROK_BIN_DIR%;%PATH%"

cd /d "%GROK_WORKDIR%"
if %errorlevel% neq 0 (
    echo [ERROR] 无法进入工作目录：%GROK_WORKDIR%
    pause
    exit /b 1
)

echo [OK] 正在启动 Grok Build ...
echo      退出请按 Ctrl+D 或输入 /quit
echo.

grok
set "EXIT_CODE=%errorlevel%"

if %EXIT_CODE% neq 0 (
    echo.
    echo [ERROR] Grok Build 异常退出，代码：%EXIT_CODE%
    echo         若无法连接，请检查：
    echo         1. 代理软件是否已启动（Clash / v2rayN 等）
    echo         2. grok-proxy.env 中 PROXY_PORT 是否正确
    echo         3. 是否已完成 grok 登录认证
    pause
)

exit /b %EXIT_CODE%