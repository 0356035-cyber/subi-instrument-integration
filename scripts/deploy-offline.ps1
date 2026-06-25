#Requires -Version 5.1
param(
    [string]$PackageDir = "",
    [string]$TargetDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-ProjectsLayout {
    param([string]$Dir)
    return (Test-Path (Join-Path $Dir "instrument-training-home\app\main.py")) -and
        (Test-Path (Join-Path $Dir "subi_knowledge_platform\backend\main.py")) -and
        (Test-Path (Join-Path $Dir "docker-compose.yml"))
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
        throw "Robocopy failed: $Source -> $Destination (exit $LASTEXITCODE)"
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
Write-Host "  Offline Deploy"
Write-Host "========================================"
Write-Host "Package: $PackageDir"
Write-Host ""

if (-not (Test-Path $projectsSnapshot)) {
    throw "Missing projects\ folder. Copy the full offline package."
}
if (-not (Test-Path $imageTar)) {
    throw "Missing docker-images.tar. Copy the full offline package."
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not running. Install and start Docker Desktop first."
}

if ([string]::IsNullOrWhiteSpace($TargetDir)) {
    $defaultTarget = Resolve-DefaultTarget
    Write-Host "Default target: $defaultTarget"
    $inputTarget = Read-Host "Press Enter for default, or type path (e.g. D:\projects)"
    if ([string]::IsNullOrWhiteSpace($inputTarget)) {
        $TargetDir = $defaultTarget
    } else {
        $TargetDir = $inputTarget.Trim()
    }
}
$TargetDir = [System.IO.Path]::GetFullPath($TargetDir)

Write-Host ""
Write-Host "[1/4] Deploying code to $TargetDir ..."
New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
Copy-Tree -Source $projectsSnapshot -Destination $TargetDir

$envPath = Join-Path $TargetDir "subi_knowledge_platform\.env"
$envExample = Join-Path $TargetDir ".env.example"
if (-not (Test-Path $envPath) -and (Test-Path $envExample)) {
    $exampleText = Get-Content $envExample -Raw
    $exampleText = $exampleText -replace "your_service_account_id", "3267"
    $exampleText = $exampleText -replace "your_service_account_password", "123456"
    Set-Content -Path $envPath -Value $exampleText -Encoding ASCII
    Write-Host "       Created subi_knowledge_platform\.env (default 3267/123456)"
}

Write-Host "[2/4] Loading Docker images..."
docker load -i $imageTar
if ($LASTEXITCODE -ne 0) {
    throw "docker load failed."
}

if (Test-Path $dataBackupDir) {
    Write-Host "[3/4] Restoring business data..."
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
    Write-Host "[3/4] No data-backup folder, skipping data restore."
}

Write-Host "[4/4] Starting Docker stack (offline, no rebuild)..."
Push-Location $TargetDir
try {
    docker compose up -d --no-build
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose up failed. Check docker load and package integrity."
    }

    Start-Sleep -Seconds 8
    docker compose ps

    Write-Host ""
    Write-Host "--- Health check ---"
    $checks = @(
        @{ Name = "Training API"; Url = "http://127.0.0.1:8000/health" },
        @{ Name = "Sub-I API"; Url = "http://127.0.0.1:8001/health" },
        @{ Name = "Sub-I UI"; Url = "http://127.0.0.1:8510/_stcore/health" }
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
Write-Host "Offline deploy complete"
Write-Host "Workspace: $TargetDir"
Write-Host "Sub-I:     http://127.0.0.1:8510"
Write-Host "Training:  http://127.0.0.1:8501"
Write-Host "Login:     employee_id 3267, password 123456"
Write-Host "========================================"