#Requires -Version 5.1
<#
.SYNOPSIS
    在可联网电脑上打包三仓库代码、Docker 镜像与业务数据，供单位离线机部署。

.PARAMETER IncludeData
    是否包含业务数据（默认先执行 backup-data.bat，再打入 data-backup 目录）。

.PARAMETER OutputDir
    输出目录；默认 projects\backups\offline-deploy_yyyy-MM-dd_HHmmss
#>
param(
    [switch]$IncludeData = $true,
    [string]$OutputDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-ProjectsDir {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $candidates = @(
        (Resolve-Path (Join-Path $scriptDir "..") -ErrorAction SilentlyContinue).Path,
        "D:\projects",
        "C:\projects"
    ) | Select-Object -Unique

    foreach ($dir in $candidates) {
        if (-not $dir) { continue }
        $marker = Join-Path $dir "instrument-training-home\app\main.py"
        if (Test-Path $marker) { return $dir }
    }
    throw "未找到 projects 工作区（需包含 instrument-training-home 与 subi_knowledge_platform）。"
}

function Copy-ProjectsSnapshot {
    param(
        [string]$SourceRoot,
        [string]$DestinationRoot
    )

    $excludeDirs = @(
        ".git",
        "__pycache__",
        ".venv",
        "venv",
        "node_modules",
        "terminals",
        "agent-tools",
        "backups",
        ".idea",
        ".vscode"
    )

    $robocopyArgs = @(
        $SourceRoot,
        $DestinationRoot,
        "/E",
        "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np",
        "/XF", "Thumbs.db", "desktop.ini"
    )
    foreach ($name in $excludeDirs) {
        $robocopyArgs += "/XD"
        $robocopyArgs += $name
    }

    $null = & robocopy @robocopyArgs
    if ($LASTEXITCODE -ge 8) {
        throw "复制代码快照失败，robocopy 退出码：$LASTEXITCODE"
    }
}

$projectsDir = Resolve-ProjectsDir
$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $projectsDir "backups\offline-deploy_$stamp"
}
$packageRoot = [System.IO.Path]::GetFullPath($OutputDir)
$projectsSnapshot = Join-Path $packageRoot "projects"
$dataBackupDir = Join-Path $packageRoot "data-backup"
$imageTar = Join-Path $packageRoot "docker-images.tar"

Write-Host "========================================"
Write-Host "  离线部署包导出"
Write-Host "========================================"
Write-Host "工作区：$projectsDir"
Write-Host "输出到：$packageRoot"
Write-Host ""

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker 未运行，请先启动 Docker Desktop 后再导出。"
}

Push-Location $projectsDir
try {
    Write-Host "[1/5] 构建 Docker 镜像（需联网拉取基础镜像与 pip 依赖）..."
    docker compose build
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose build 失败。"
    }

    $images = @(docker compose config --images 2>$null | Where-Object { $_ -and $_.Trim() })
    if ($images.Count -eq 0) {
        throw "未获取到 compose 镜像列表。"
    }

    Write-Host "[2/5] 导出 Docker 镜像（共 $($images.Count) 个）..."
    foreach ($img in $images) { Write-Host "       - $img" }
    docker save -o $imageTar @images
    if ($LASTEXITCODE -ne 0) {
        throw "docker save 失败。"
    }

    Write-Host "[3/5] 复制三仓库代码快照..."
    if (Test-Path $projectsSnapshot) {
        Remove-Item $projectsSnapshot -Recurse -Force
    }
    New-Item -ItemType Directory -Path $projectsSnapshot -Force | Out-Null
    Copy-ProjectsSnapshot -SourceRoot $projectsDir -DestinationRoot $projectsSnapshot

    $envExample = Join-Path $projectsDir "subi_knowledge_platform\.env"
    $envTarget = Join-Path $projectsSnapshot "subi_knowledge_platform\.env"
    if ((Test-Path $envExample) -and -not (Test-Path $envTarget)) {
        Copy-Item $envExample $envTarget
        Write-Host "       已附带 subi_knowledge_platform\.env"
    }

    if ($IncludeData) {
        Write-Host "[4/5] 打包业务数据..."
        if (Test-Path $dataBackupDir) {
            Remove-Item $dataBackupDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $dataBackupDir -Force | Out-Null

        $backupRoot = Join-Path $projectsDir "backups"
        $latestBackup = Get-ChildItem $backupRoot -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notlike "offline-deploy_*" -and $_.Name -notlike "pre_restore_*" } |
            Sort-Object Name -Descending |
            Select-Object -First 1

        $dataCopied = $false
        if ($latestBackup) {
            Write-Host "       优先使用最新备份：$($latestBackup.Name)"
            $robocopyArgs = @(
                $latestBackup.FullName,
                $dataBackupDir,
                "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np"
            )
            $null = & robocopy @robocopyArgs
            if ($LASTEXITCODE -ge 8) {
                throw "复制业务数据失败，robocopy 退出码：$LASTEXITCODE"
            }
            $dataCopied = $true
        }

        if (-not $dataCopied) {
            Write-Host "       未找到常规备份，改为直接复制当前 data/uploads..."
            $pairs = @(
                @{
                    Source = Join-Path $projectsDir "instrument-training-home\data\instrument_training.db"
                    Target = Join-Path $dataBackupDir "instrument_training.db"
                },
                @{
                    Source = Join-Path $projectsDir "subi_knowledge_platform\data\subi_knowledge.db"
                    Target = Join-Path $dataBackupDir "subi_knowledge.db"
                },
                @{
                    Source = Join-Path $projectsDir "subi_knowledge_platform\uploads"
                    Target = Join-Path $dataBackupDir "uploads"
                }
            )
            foreach ($pair in $pairs) {
                if (Test-Path $pair.Source) {
                    if (Test-Path $pair.Source -PathType Container) {
                        $null = & robocopy $pair.Source $pair.Target /E /NFL /NDL /NJH /NJS /nc /ns /np
                    } else {
                        Copy-Item $pair.Source $pair.Target -Force
                    }
                }
            }
        }
    } else {
        Write-Host "[4/5] 跳过业务数据（未指定 -IncludeData）。"
    }

    Write-Host "[5/5] 写入部署说明与一键脚本..."
    Copy-Item (Join-Path $projectsDir "scripts\deploy-offline.ps1") (Join-Path $packageRoot "deploy-offline.ps1") -Force
    Copy-Item (Join-Path $projectsDir "deploy-offline.bat") (Join-Path $packageRoot "deploy-offline.bat") -Force

    $readme = @"
离线部署包生成时间：$stamp
来源工作区：$projectsDir

【单位离线电脑使用步骤】
1. 安装 Docker Desktop（一次性，可提前下载离线安装包）
2. 将整个文件夹复制到 U 盘，再拷到单位电脑（建议 C:\projects-offline-deploy 或 D:\）
3. 双击 deploy-offline.bat（或 离线部署.bat）
4. 按提示选择目标目录（默认 C:\projects 或 D:\projects）
5. 浏览器访问：
   - Sub-I 资料库：http://127.0.0.1:8510
   - 培训管理：    http://127.0.0.1:8501
   默认工号 3267，密码 123456

【包内内容】
- projects\          三仓库代码 + 编排脚本快照
- docker-images.tar  已构建的 4 个容器镜像（无需联网 build）
- data-backup\       业务数据库与附件（若导出时包含）
- deploy-offline.bat 单位电脑一键部署入口

【注意】
- 导出本包时必须在可联网电脑先 docker compose build 成功
- 单位电脑全程无需 git / 无需访问 GitHub
- 若仅更新代码不含数据，导出时可去掉数据步骤（export-offline-package.bat 选 N）
"@
    Set-Content -Path (Join-Path $packageRoot "README-OFFLINE.txt") -Value $readme -Encoding UTF8

    $imageSizeMb = [math]::Round((Get-Item $imageTar).Length / 1MB, 1)
    Write-Host ""
    Write-Host "========================================"
    Write-Host "导出完成"
    Write-Host "目录：$packageRoot"
    Write-Host "镜像：docker-images.tar (${imageSizeMb} MB)"
    Write-Host ""
    Write-Host "请将整个文件夹复制到 U 盘，在单位电脑运行 deploy-offline.bat"
    Write-Host "========================================"
}
finally {
    Pop-Location
}