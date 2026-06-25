#Requires -Version 5.1
<#
.SYNOPSIS
    在单位离线电脑上：加载镜像、部署代码、恢复数据并启动 Docker 全栈。
#>
param(
    [string]$PackageDir = "",
    [string]$TargetDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-ProjectsLayout {
    param([string]$Dir)
    return Test-Path (Join-Path $Dir "instrument-training-home\app\main.py") -and
        Test-Path (Join-Path $Dir "subi_knowledge_platform\backend\main.py") -and
        Test-Path (Join-Path $Dir "docker-compose.yml")
}

function Resolve-DefaultTarget {
    foreach ($dir in @("C:\projects", "D:\projects")) {
        if (Test-ProjectsLayout $dir) { return $dir }
    }
    foreach ($dir in @("C:\projects", "D:\projects")) {
        $parent = Split-Path $dir -Parent
        if (Test-Path $parent) { return $dir }
    }
    return "C:\projects"
}

function Copy-Tree {
    param(
        [string]$Source,
        [string]$Destination
    )
    $null = & robocopy $Source $Destination /E /NFL /NDL /NJH /NJS /nc /ns /np
    if ($LASTEXITCODE -ge 8) {
        throw "复制失败：$Source -> $Destination（robocopy $LASTEXITCODE）"
    }
}

if ([string]::IsNullOrWhiteSpace($PackageDir)) {
    $PackageDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$PackageDir = [System.IO.Path]::GetFullPath($PackageDir)

$projectsSnapshot = Join-Path $PackageDir "projects"
$imageTar = Join-Path $PackageDir "docker-images.tar"
$dataBackupDir = Join-Path $PackageDir "data-backup"

Write-Host "========================================"
Write-Host "  离线一键部署"
Write-Host "========================================"
Write-Host "部署包：$PackageDir"
Write-Host ""

if (-not (Test-Path $projectsSnapshot)) {
    throw "缺少 projects\ 目录，请确认已完整复制离线部署包。"
}
if (-not (Test-Path $imageTar)) {
    throw "缺少 docker-images.tar，请确认已完整复制离线部署包。"
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker 未运行，请先安装并启动 Docker Desktop。"
}

if ([string]::IsNullOrWhiteSpace($TargetDir)) {
    $defaultTarget = Resolve-DefaultTarget
    Write-Host "默认部署目录：$defaultTarget"
    $inputTarget = Read-Host "回车使用默认，或输入其他目录（如 D:\projects）"
    if ([string]::IsNullOrWhiteSpace($inputTarget)) {
        $TargetDir = $defaultTarget
    } else {
        $TargetDir = $inputTarget.Trim()
    }
}
$TargetDir = [System.IO.Path]::GetFullPath($TargetDir)

Write-Host ""
Write-Host "[1/4] 部署代码到 $TargetDir ..."
New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
Copy-Tree -Source $projectsSnapshot -Destination $TargetDir

$envPath = Join-Path $TargetDir "subi_knowledge_platform\.env"
$envExample = Join-Path $TargetDir ".env.example"
if (-not (Test-Path $envPath) -and (Test-Path $envExample)) {
    $exampleText = Get-Content $envExample -Raw
    $exampleText = $exampleText -replace "your_service_account_id", "3267"
    $exampleText = $exampleText -replace "your_service_account_password", "123456"
    Set-Content -Path $envPath -Value $exampleText -Encoding UTF8
    Write-Host "       已从 .env.example 生成 subi_knowledge_platform\.env（默认 3267/123456）"
}

Write-Host "[2/4] 加载 Docker 镜像..."
docker load -i $imageTar
if ($LASTEXITCODE -ne 0) {
    throw "docker load 失败。"
}

if (Test-Path $dataBackupDir) {
    Write-Host "[3/4] 恢复业务数据..."
    $trainDb = Join-Path $dataBackupDir "instrument_training.db"
    $subiDb = Join-Path $dataBackupDir "subi_knowledge.db"
    $uploads = Join-Path $dataBackupDir "uploads"

    $trainTarget = Join-Path $TargetDir "instrument-training-home\data"
    $subiDataTarget = Join-Path $TargetDir "subi_knowledge_platform\data"
    $uploadsTarget = Join-Path $TargetDir "subi_knowledge_platform\uploads"

    New-Item -ItemType Directory -Path $trainTarget -Force | Out-Null
    New-Item -ItemType Directory -Path $subiDataTarget -Force | Out-Null
    New-Item -ItemType Directory -Path $uploadsTarget -Force | Out-Null

    if (Test-Path $trainDb) {
        Copy-Item $trainDb (Join-Path $trainTarget "instrument_training.db") -Force
        Write-Host "       [OK] instrument_training.db"
    }
    if (Test-Path $subiDb) {
        Copy-Item $subiDb (Join-Path $subiDataTarget "subi_knowledge.db") -Force
        Write-Host "       [OK] subi_knowledge.db"
    }
    if (Test-Path $uploads) {
        Copy-Tree -Source $uploads -Destination $uploadsTarget
        Write-Host "       [OK] uploads"
    }
} else {
    Write-Host "[3/4] 未包含 data-backup，跳过数据恢复。"
}

Write-Host "[4/4] 启动 Docker 全栈（离线，不重新 build）..."
Push-Location $TargetDir
try {
    docker compose up -d --no-build
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose up 失败。若提示镜像不存在，请确认 docker load 成功且包未损坏。"
    }

    Start-Sleep -Seconds 8
    docker compose ps

    Write-Host ""
    Write-Host "--- 健康检查 ---"
    $checks = @(
        @{ Name = "培训系统"; Url = "http://127.0.0.1:8000/health" },
        @{ Name = "Sub-I后端"; Url = "http://127.0.0.1:8001/health" },
        @{ Name = "Sub-I前端"; Url = "http://127.0.0.1:8510/_stcore/health" }
    )
    foreach ($c in $checks) {
        try {
            $resp = Invoke-WebRequest -Uri $c.Url -UseBasicParsing -TimeoutSec 12
            Write-Host ("[OK] {0} HTTP {1}" -f $c.Name, $resp.StatusCode)
        } catch {
            Write-Host ("[FAIL] {0} - {1}" -f $c.Name, $_.Exception.Message)
        }
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "========================================"
Write-Host "离线部署完成"
Write-Host "工作目录：$TargetDir"
Write-Host "Sub-I 资料库： http://127.0.0.1:8510"
Write-Host "培训管理页面： http://127.0.0.1:8501"
Write-Host "默认工号 3267，密码 123456"
Write-Host "========================================"