@echo off
chcp 65001 >nul
title Sub-I 整合项目 Docker 启动

call "%~dp0scripts\resolve-projects-dir.bat"
if not defined PROJECTS_DIR (
    if exist "%~dp0instrument-training-home\app\main.py" (
        pushd "%~dp0"
        set "PROJECTS_DIR=%CD%"
        popd
    )
)
if not defined PROJECTS_DIR (
    echo [ERROR] 未找到 projects 工作区（需包含 instrument-training-home 与 subi_knowledge_platform）。
    pause
    exit /b 1
)
cd /d "%PROJECTS_DIR%"

echo ========================================
echo   Docker 统一部署
echo   instrument-training-home + Sub-I 全栈
echo ========================================
echo 工作目录: %PROJECTS_DIR%
echo.

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker 未运行，请先启动 Docker Desktop。
    pause
    exit /b 1
)

echo [INFO] 正在构建并启动容器（代码更新后请执行本脚本以同步依赖）...
echo [TIP] 首次构建可能需要数分钟，请勿提前关闭本窗口。
docker compose up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Docker 启动失败。
    pause
    exit /b 1
)

echo.
echo [INFO] 等待服务就绪...
timeout /t 8 /nobreak >nul

echo.
echo --- 容器状态 ---
docker compose ps
for /f %%i in ('docker compose ps --status exited -q 2^>nul') do (
    echo [WARN] 有容器已退出，正在尝试重新拉起...
    docker compose up -d
    timeout /t 5 /nobreak >nul
    goto :check_again
)
:check_again
docker compose ps --status running --format "{{.Name}}" | findstr /r "." >nul
if %errorlevel% neq 0 (
    echo [ERROR] 没有运行中的容器。请确认 Docker Desktop 左下角显示 Engine running 后重试。
    pause
    exit /b 1
)

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