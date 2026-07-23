#Requires -Version 5.1
param(
    [string]$NasAlias = "nas-projects",
    [string]$NasHost = "192.168.50.56",
    [int]$NasPort = 10000,
    [string]$NasUser = "13816937329"
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

$projectRoot = Split-Path -Parent $PSScriptRoot
$remoteScriptPath = Join-Path $projectRoot "scripts\nas\projects-deploy"
if (-not (Test-Path $remoteScriptPath)) {
    throw "Missing NAS deployment script: $remoteScriptPath"
}

$sshDirectory = Join-Path $env:USERPROFILE ".ssh"
$sshConfigPath = Join-Path $sshDirectory "config"
New-Item -ItemType Directory -Path $sshDirectory -Force | Out-Null

$existingConfig = if (Test-Path $sshConfigPath) { Get-Content -Raw -Encoding UTF8 $sshConfigPath } else { "" }
if ($existingConfig -notmatch "(?im)^Host\s+$([regex]::Escape($NasAlias))\s*$") {
    $entry = @"

Host $NasAlias
    HostName $NasHost
    User $NasUser
    Port $NasPort
    ServerAliveInterval 30
    ServerAliveCountMax 3
    PreferredAuthentications publickey
"@
    Add-Content -Path $sshConfigPath -Value $entry -Encoding UTF8
    Write-Host "Added SSH alias '$NasAlias' to $sshConfigPath"
} else {
    Write-Host "SSH alias '$NasAlias' already exists."
}

Invoke-Native -FailureMessage "SSH public-key authentication failed. Check the NAS authorized_keys configuration first." -Command {
    ssh -o BatchMode=yes $NasAlias "printf 'ssh-auth-ok\n'"
}

$scriptText = (Get-Content -Raw -Encoding UTF8 $remoteScriptPath) -replace "`r`n", "`n"
$scriptBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($scriptText))
Invoke-Native -FailureMessage "Failed to stage the NAS deployment script." -Command {
    ssh $NasAlias "umask 077; mkdir -p /tmp/projects-deploy; printf '%s' '$scriptBase64' | base64 -d > /tmp/projects-deploy/projects-deploy"
}

$sudoersLine = $NasUser + ' ALL=(root) NOPASSWD: /usr/local/sbin/projects-deploy ""'
$remoteInstall = "sudo install -o root -g root -m 750 /tmp/projects-deploy/projects-deploy /usr/local/sbin/projects-deploy; printf '%s\n' '$sudoersLine' | sudo tee /etc/sudoers.d/projects-deploy >/dev/null; sudo chmod 440 /etc/sudoers.d/projects-deploy; sudo visudo -cf /etc/sudoers.d/projects-deploy"

Write-Host ""
Write-Host "A visible NAS terminal will now open. Enter the NAS sudo password once to install the root-owned deployment command and its restricted sudo rule."
$escapedRemoteInstall = $remoteInstall.Replace("'", "''")
$launcherScript = "& ssh -tt '$NasAlias' '$escapedRemoteInstall'"
$encodedLauncher = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($launcherScript))
Start-Process -FilePath powershell.exe -ArgumentList @("-NoExit", "-EncodedCommand", $encodedLauncher)
