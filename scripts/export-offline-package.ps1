#Requires -Version 5.1
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
    throw "Projects workspace not found."
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
        throw "Robocopy failed with exit code $LASTEXITCODE"
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
Write-Host "  Export Offline Deploy Package"
Write-Host "========================================"
Write-Host "Workspace: $projectsDir"
Write-Host "Output:    $packageRoot"
Write-Host ""

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not running. Start Docker Desktop first."
}

Push-Location $projectsDir
try {
    Write-Host "[1/5] Building Docker images (requires network)..."
    docker compose build
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose build failed."
    }

    $images = @(docker compose config --images 2>$null | Where-Object { $_ -and $_.Trim() })
    if ($images.Count -eq 0) {
        throw "No compose images found."
    }

    Write-Host "[2/5] Saving Docker images ($($images.Count))..."
    foreach ($img in $images) { Write-Host "       - $img" }
    docker save -o $imageTar @images
    if ($LASTEXITCODE -ne 0) {
        throw "docker save failed."
    }

    Write-Host "[3/5] Copying code snapshot..."
    if (Test-Path $projectsSnapshot) {
        Remove-Item $projectsSnapshot -Recurse -Force
    }
    New-Item -ItemType Directory -Path $projectsSnapshot -Force | Out-Null
    Copy-ProjectsSnapshot -SourceRoot $projectsDir -DestinationRoot $projectsSnapshot

    $envSource = Join-Path $projectsDir "subi_knowledge_platform\.env"
    $envTarget = Join-Path $projectsSnapshot "subi_knowledge_platform\.env"
    if ((Test-Path $envSource) -and -not (Test-Path $envTarget)) {
        Copy-Item $envSource $envTarget
        Write-Host "       Included subi_knowledge_platform\.env"
    }

    if ($IncludeData) {
        Write-Host "[4/5] Packing business data..."
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
            Write-Host "       Using latest backup: $($latestBackup.Name)"
            $robocopyArgs = @(
                $latestBackup.FullName,
                $dataBackupDir,
                "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np"
            )
            $null = & robocopy @robocopyArgs
            if ($LASTEXITCODE -ge 8) {
                throw "Robocopy data backup failed with exit code $LASTEXITCODE"
            }
            $dataCopied = $true
        }

        if (-not $dataCopied) {
            Write-Host "       No backup folder found, copying live data/uploads..."
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
        Write-Host "[4/5] Skipping business data."
    }

    Write-Host "[5/5] Writing deploy scripts..."
    Copy-Item (Join-Path $projectsDir "scripts\deploy-offline.ps1") (Join-Path $packageRoot "deploy-offline.ps1") -Force
    Copy-Item (Join-Path $projectsDir "deploy-offline.bat") (Join-Path $packageRoot "deploy-offline.bat") -Force

    $readmeLines = @(
        "Offline deploy package created: $stamp"
        "Source workspace: $projectsDir"
        ""
        "On offline PC:"
        "1. Install Docker Desktop"
        "2. Copy this folder via USB"
        "3. Run deploy-offline.bat"
        "4. Open http://127.0.0.1:8510 (Sub-I) and http://127.0.0.1:8501 (training)"
        "   Default login: employee_id 3267, password 123456"
        ""
        "Contents:"
        "  projects\          code snapshot"
        "  docker-images.tar  pre-built images"
        "  data-backup\       databases and uploads (if included)"
        "  deploy-offline.bat one-click deploy"
    )
    Set-Content -Path (Join-Path $packageRoot "README-OFFLINE.txt") -Value $readmeLines -Encoding ASCII

    $imageSizeMb = [math]::Round((Get-Item $imageTar).Length / 1MB, 1)
    Write-Host ""
    Write-Host "========================================"
    Write-Host "Export complete"
    Write-Host "Folder: $packageRoot"
    Write-Host "Images: docker-images.tar ($imageSizeMb MB)"
    Write-Host "Copy the whole folder to USB, then run deploy-offline.bat on offline PC."
    Write-Host "========================================"
}
finally {
    Pop-Location
}