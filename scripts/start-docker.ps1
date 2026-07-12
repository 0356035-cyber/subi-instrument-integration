#Requires -Version 5.1
param(
    [ValidateSet("default", "zspace", "tunnel")]
    [string]$Mode = "default"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-ProjectsDir {
    $scriptRoot = $PSScriptRoot
    if (-not $scriptRoot) {
        throw "Cannot resolve script directory."
    }
    $parent = Split-Path -Parent $scriptRoot
    $marker = Join-Path $parent "instrument-training-home\app\main.py"
    if (Test-Path $marker) { return $parent }
    foreach ($dir in @("C:\projects", "D:\projects")) {
        $m = Join-Path $dir "instrument-training-home\app\main.py"
        if (Test-Path $m) { return $dir }
    }
    throw "Projects workspace not found."
}

function Ensure-SubiEnvFile {
    param([string]$ProjectsDir)
    $envPath = Join-Path $ProjectsDir "subi_knowledge_platform\.env"
    $examplePath = Join-Path $ProjectsDir ".env.example"
    if (Test-Path $envPath) { return }
    if (-not (Test-Path $examplePath)) {
        Write-Host "[WARN] Missing subi .env and .env.example"
        return
    }
    $text = Get-Content $examplePath -Raw
    $text = $text -replace "your_service_account_id", "3267"
    $text = $text -replace "your_service_account_password", "123456"
    Set-Content -Path $envPath -Value $text -Encoding ASCII
    Write-Host "[INFO] Created subi_knowledge_platform\.env"
}

function Invoke-DockerCompose {
    param([string[]]$ExtraArgs)
    $projectsDir = (Get-Location).Path
    switch ($Mode) {
        "tunnel" {
            $tunnelEnv = Join-Path $projectsDir ".env.tunnel"
            if (-not (Test-Path $tunnelEnv)) {
                throw "Missing .env.tunnel. Copy .env.tunnel.example and set TUNNEL_TOKEN."
            }
            & docker compose --env-file $tunnelEnv -f docker-compose.yml -f docker-compose.tunnel.yml @ExtraArgs
        }
        "zspace" {
            & docker compose -f docker-compose.yml -f docker-compose.zspace.yml @ExtraArgs
        }
        default {
            & docker compose @ExtraArgs
        }
    }
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed: $($ExtraArgs -join ' ')"
    }
}

$projectsDir = Resolve-ProjectsDir
Set-Location $projectsDir

Write-Host "========================================"
switch ($Mode) {
    "tunnel" { Write-Host "  Docker + Cloudflare Tunnel" }
    "zspace" { Write-Host "  Docker (ZSpace-compatible compose)" }
    default  { Write-Host "  Docker full stack (training + Sub-I)" }
}
Write-Host "========================================"
Write-Host "Workspace: $projectsDir"
Write-Host ""

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not running. Start Docker Desktop first."
}

Ensure-SubiEnvFile -ProjectsDir $projectsDir

Write-Host "[INFO] docker compose up -d --build ..."
Invoke-DockerCompose -ExtraArgs @("up", "-d", "--build")

Write-Host ""
Write-Host "[INFO] Waiting for services..."
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "--- Container status ---"
Invoke-DockerCompose -ExtraArgs @("ps")

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$exited = & docker compose ps --status exited -q 2>$null
if ($Mode -eq "tunnel") {
    $tunnelEnv = Join-Path $projectsDir ".env.tunnel"
    $exited = & docker compose --env-file $tunnelEnv -f docker-compose.yml -f docker-compose.tunnel.yml ps --status exited -q 2>$null
} elseif ($Mode -eq "zspace") {
    $exited = & docker compose -f docker-compose.yml -f docker-compose.zspace.yml ps --status exited -q 2>$null
}
$ErrorActionPreference = $prevEap
if ($exited) {
    Write-Host "[WARN] Some containers exited; retrying..."
    Invoke-DockerCompose -ExtraArgs @("up", "-d")
    Start-Sleep -Seconds 5
    Invoke-DockerCompose -ExtraArgs @("ps")
}

Write-Host ""
Write-Host "--- Health check ---"
$checks = @(
    @{ Name = "Training API"; Url = "http://127.0.0.1:8000/health" },
    @{ Name = "Sub-I API"; Url = "http://127.0.0.1:8001/health" },
    @{ Name = "Training bridge"; Url = "http://127.0.0.1:8001/integrations/training/health" },
    @{ Name = "Projects API"; Url = "http://127.0.0.1:8001/projects/meta" },
    @{ Name = "Training UI"; Url = "http://127.0.0.1:8501/_stcore/health" },
    @{ Name = "Sub-I UI"; Url = "http://127.0.0.1:8510/_stcore/health" },
    @{ Name = "Gantt UI"; Url = "http://127.0.0.1:8520/" }
)
foreach ($c in $checks) {
    try {
        $resp = Invoke-WebRequest -Uri $c.Url -UseBasicParsing -TimeoutSec 15
        Write-Host ("[OK] {0} HTTP {1}" -f $c.Name, $resp.StatusCode)
    } catch {
        Write-Host ("[FAIL] {0} - {1}" -f $c.Name, $_.Exception.Message)
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "Training UI:  http://127.0.0.1:8501"
Write-Host "Sub-I UI:      http://127.0.0.1:8510"
Write-Host "Sub-I API:     http://127.0.0.1:8001/docs"
if ($Mode -eq "tunnel") {
    Write-Host "Public HTTPS:  your Cloudflare Tunnel hostnames"
}
Write-Host "Login: 3267 / 123456"
Write-Host "========================================"