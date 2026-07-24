#Requires -Version 5.1
param(
    [string]$NasAlias = "nas-projects",
    [string]$RemoteArtifactDir = "/tmp/projects-deploy",
    [string]$NasAddress = "192.168.50.56",
    [int]$TrainingApiPort = 8000,
    [int]$SubiApiPort = 18001,
    [int]$TrainingUiPort = 8501,
    [int]$SubiUiPort = 8510
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Native {
    param([scriptblock]$Command, [string]$FailureMessage)
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

function Wait-HttpOk {
    param([string]$Name, [string]$Url)

    for ($attempt = 1; $attempt -le 12; $attempt++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Host "[OK] ${Name}: HTTP 200"
                return
            }
        } catch {
            if ($attempt -eq 12) {
                throw "$Name did not return HTTP 200: $($_.Exception.Message)"
            }
        }
        Start-Sleep -Seconds 5
    }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
foreach ($requiredPath in @(
    (Join-Path $projectRoot "docker-compose.yml"),
    (Join-Path $projectRoot "docker-compose.zspace.yml"),
    (Join-Path $projectRoot "instrument-training-home\app\main.py"),
    (Join-Path $projectRoot "subi_knowledge_platform\backend\main.py")
)) {
    if (-not (Test-Path $requiredPath)) {
        throw "This script must run from the projects integration workspace. Missing: $requiredPath"
    }
}

Invoke-Native -FailureMessage "SSH public-key authentication failed. Run 安装极空间部署授权.bat first." -Command {
    ssh -o BatchMode=yes $NasAlias "printf 'ssh-auth-ok\n'"
}

Write-Host ""
Write-Host "This deploy will build Docker images, upload code and images, back up NAS databases/uploads/configuration, then restart the NAS stack."
if ((Read-Host "Type DEPLOY to continue") -cne "DEPLOY") {
    Write-Host "Deployment cancelled."
    exit 0
}

$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$artifactDir = Join-Path ([System.IO.Path]::GetTempPath()) "projects-nas-deploy\$stamp"
New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
$codeArchive = Join-Path $artifactDir "projects-code.tar.gz"
$imageArchive = Join-Path $artifactDir "docker-images.tar"

Push-Location $projectRoot
try {
    Write-Host "[1/6] Building Docker images..."
    Invoke-Native -FailureMessage "Docker image build failed." -Command { docker compose build }

    $images = @(docker compose config --images 2>$null | Where-Object { $_ -and $_.Trim() })
    if ($images.Count -eq 0) {
        throw "No Docker images were resolved from docker-compose.yml."
    }

    Write-Host "[2/6] Exporting Docker images..."
    Invoke-Native -FailureMessage "Docker image export failed." -Command { docker save -o $imageArchive @images }

    Write-Host "[3/6] Creating code package without business data or runtime configuration..."
    $archiveSources = @(
        Get-ChildItem -Force -LiteralPath $projectRoot |
            Select-Object -ExpandProperty Name
    )
    $tarArguments = @(
        "-czf", $codeArchive,
        "--exclude=.git", "--exclude=*/.git",
        "--exclude=.env", "--exclude=*/.env",
        "--exclude=.env.integration", "--exclude=*/.env.integration",
        "--exclude=.env.tunnel", "--exclude=*/.env.tunnel",
        "--exclude=grok-proxy.env",
        "--exclude=data", "--exclude=*/data",
        "--exclude=uploads", "--exclude=*/uploads",
        "--exclude=backups", "--exclude=*/backups",
        "--exclude=__pycache__", "--exclude=*/__pycache__",
        "--exclude=.venv", "--exclude=*/.venv",
        "--exclude=venv", "--exclude=*/venv",
        "--exclude=node_modules", "--exclude=*/node_modules",
        "--exclude=terminals", "--exclude=.pytest_cache",
        "--exclude=docker-images-*.tar", "--exclude=projects-code-*.tar.gz",
        "--exclude=projects-code-deploy.tar.gz", "--exclude=gantt-*-deploy*.tar.gz",
        "-C", $projectRoot
    ) + $archiveSources
    Invoke-Native -FailureMessage "Code package creation failed." -Command { tar @tarArguments }

    $archiveEntries = @(tar -tzf $codeArchive)
    if ($archiveEntries | Where-Object { $_ -match '(^|/)(data|uploads|backups)(/|$)|(^|/)\.env($|/)|(^|/)\.env\.integration$|(^|/)\.env\.tunnel$|(^|/)grok-proxy\.env$|\.db$' }) {
        throw "Safety check failed: the code package contains business data or a runtime configuration file."
    }

    Write-Host "[4/6] Uploading deployment artifacts..."
    Invoke-Native -FailureMessage "Failed to prepare the NAS temporary deployment directory." -Command {
        ssh $NasAlias "mkdir -p $RemoteArtifactDir && chmod 700 $RemoteArtifactDir"
    }
    Invoke-Native -FailureMessage "Code package upload failed." -Command {
        scp $codeArchive "${NasAlias}:$RemoteArtifactDir/projects-code.tar.gz"
    }
    Invoke-Native -FailureMessage "Docker image upload failed." -Command {
        scp $imageArchive "${NasAlias}:$RemoteArtifactDir/docker-images.tar"
    }

    Write-Host "[5/6] Running the restricted NAS deployment command..."
    Invoke-Native -FailureMessage "NAS deployment failed. The NAS service state was left in place; inspect the command output and the NAS deployment log." -Command {
        ssh $NasAlias "sudo -n /usr/local/sbin/projects-deploy"
    }
}
finally {
    Pop-Location
}

Write-Host "[6/6] Checking published services..."
Wait-HttpOk -Name "Training API" -Url "http://${NasAddress}:$TrainingApiPort/ready"
Wait-HttpOk -Name "Sub-I API" -Url "http://${NasAddress}:$SubiApiPort/health"
Wait-HttpOk -Name "Training UI" -Url "http://${NasAddress}:$TrainingUiPort/"
Wait-HttpOk -Name "Sub-I UI" -Url "http://${NasAddress}:$SubiUiPort/"

Write-Host ""
Write-Host "Deployment completed successfully."
Write-Host "Local artifacts retained at: $artifactDir"
