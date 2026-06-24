@echo off
chcp 65001 >nul
title Sub-I 整合项目 Docker 启动

set "PROJECTS_DIR=C:\projects"
cd /d "%PROJECTS_DIR%"

echo ========================================
echo   Docker 统一部署
echo   instrument-training-home + Sub-I 全栈
echo ========================================
echo.

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker 未运行，请先启动 Docker Desktop。
    pause
    exit /b 1
)

echo [INFO] 正在构建并启动容器（代码更新后请执行本脚本以同步依赖）...
docker compose up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Docker 启动失败。
    pause
    exit /b 1
)

echo.
echo [INFO] 等待服务就绪...
timeout /t 5 /nobreak >nul

echo.
echo --- 健康检查 ---
powershell -NoProfile -Command ^
  "$checks = @( @{Name='培训系统'; Url='http://127.0.0.1:8000/health'}, @{Name='Sub-I后端'; Url='http://127.0.0.1:8001/health'}, @{Name='培训整合'; Url='http://127.0.0.1:8001/integrations/training/health'}, @{Name='Sub-I前端'; Url='http://127.0.0.1:8510/_stcore/health'} ); foreach ($c in $checks) { try { $r = Invoke-WebRequest -Uri $c.Url -UseBasicParsing -TimeoutSec 12; Write-Host ('[OK] ' + $c.Name + ' HTTP ' + $r.StatusCode) } catch { Write-Host ('[FAIL] ' + $c.Name + ' - ' + $_.Exception.Message) } }"

echo.
echo ========================================
echo Docker 全栈已启动：
echo   培训系统 API：  http://127.0.0.1:8000/docs
echo   培训管理页面：  http://127.0.0.1:8501
echo   Sub-I 后端 API： http://127.0.0.1:8001/docs
echo   Sub-I 资料库：   http://127.0.0.1:8510
echo.
echo 默认登录工号 3267，密码 123456
echo ========================================
echo.
pause