@echo off
chcp 65001 >nul
title 启动系统 + Cloudflare Tunnel

call "%~dp0scripts\resolve-projects-dir.bat"
if not defined PROJECTS_DIR (
    echo [ERROR] 未找到 projects 工作区。
    pause
    exit /b 1
)
cd /d "%PROJECTS_DIR%"

if not exist ".env.tunnel" (
    echo [ERROR] 未找到 .env.tunnel
    echo 请复制 .env.tunnel.example 为 .env.tunnel 并填入 TUNNEL_TOKEN
    pause
    exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker 未运行。
    pause
    exit /b 1
)

echo [INFO] 启动四容器 + cloudflared Tunnel...
docker compose --env-file .env.tunnel -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] 启动失败。
    pause
    exit /b 1
)

echo.
echo [INFO] 等待服务就绪...
timeout /t 8 /nobreak >nul
docker compose --env-file .env.tunnel -f docker-compose.yml -f docker-compose.tunnel.yml ps

echo.
echo 内网访问：
echo   培训系统  http://127.0.0.1:8501
echo   Sub-I     http://127.0.0.1:8510
echo.
echo 外网访问：请在 Cloudflare Tunnel 中配置的 HTTPS 子域名
echo   示例 train.你的域名.com / subi.你的域名.com
echo.
pause