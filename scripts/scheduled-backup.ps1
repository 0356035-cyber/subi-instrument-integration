param(
    [int]$KeepCount = 14
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectsDir = $null
$candidates = @(
    (Join-Path $scriptDir ".."),
    "C:\projects",
    "D:\projects"
)
foreach ($root in $candidates) {
    $resolved = Resolve-Path $root -ErrorAction SilentlyContinue
    if (-not $resolved) { continue }
    $candidate = Join-Path $resolved "instrument-training-home\app\main.py"
    if (Test-Path $candidate) {
        $projectsDir = $resolved.Path.TrimEnd('\')
        break
    }
}
if (-not $projectsDir) {
    throw "projects workspace not found"
}

$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupRoot = Join-Path $projectsDir "backups"
$backupDir = Join-Path $backupRoot $stamp
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$trainDb = Join-Path $projectsDir "instrument-training-home\data\instrument_training.db"
$subiDb = Join-Path $projectsDir "subi_knowledge_platform\data\subi_knowledge.db"
$uploads = Join-Path $projectsDir "subi_knowledge_platform\uploads"
$logFile = Join-Path $backupRoot "scheduled-backup.log"
$pyBackup = Join-Path $scriptDir "sqlite_backup.py"

function Write-Log([string]$Message) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $logFile -Value $line -Encoding UTF8
    Write-Output $line
}

$dockerTrain = docker ps --filter "name=instrument_train_backend" --format "{{.Names}}" 2>$null
if ($dockerTrain) {
    Write-Log "docker training backend detected, online backup via container"
    docker exec instrument_train_backend python -c "import sqlite3;s=sqlite3.connect('/app/data/instrument_training.db');d=sqlite3.connect('/tmp/backup.db');s.backup(d);d.close();s.close()" | Out-Null
    docker cp instrument_train_backend:/tmp/backup.db (Join-Path $backupDir "instrument_training.db") | Out-Null
} elseif (Test-Path $trainDb) {
    python $pyBackup $trainDb (Join-Path $backupDir "instrument_training.db") | Out-Null
    Write-Log "backed up instrument_training.db"
}

if (Test-Path $subiDb) {
    python $pyBackup $subiDb (Join-Path $backupDir "subi_knowledge.db") | Out-Null
    Write-Log "backed up subi_knowledge.db"
}

if (Test-Path $uploads) {
    $destUploads = Join-Path $backupDir "uploads"
    robocopy $uploads $destUploads /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    if ($LASTEXITCODE -lt 8) { Write-Log "backed up uploads" }
}

$readme = @(
    "backup_time=$stamp"
    "source=$projectsDir"
    "mode=scheduled"
    "Restore: run restore-data.bat and pick this folder."
) -join "`n"
Set-Content -Path (Join-Path $backupDir "README.txt") -Value $readme -Encoding UTF8

if (Test-Path $backupRoot) {
    $folders = Get-ChildItem $backupRoot -Directory |
        Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}_\d{6}$' } |
        Sort-Object Name -Descending
    if ($folders.Count -gt $KeepCount) {
        $folders | Select-Object -Skip $KeepCount | ForEach-Object {
            Remove-Item $_.FullName -Recurse -Force
            Write-Log "removed old backup $($_.Name)"
        }
    }
}

Write-Log "scheduled backup done: $backupDir"