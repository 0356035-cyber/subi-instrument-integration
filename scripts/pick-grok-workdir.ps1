#Requires -Version 5.1
param(
    [string]$InitialPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Select Grok Build workspace folder"
$dialog.ShowNewFolderButton = $true

if (-not [string]::IsNullOrWhiteSpace($InitialPath) -and (Test-Path $InitialPath)) {
    $dialog.SelectedPath = $InitialPath
}

$result = $dialog.ShowDialog()
if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
    exit 1
}

$selected = $dialog.SelectedPath.Trim()
if ([string]::IsNullOrWhiteSpace($selected)) {
    exit 1
}

Write-Output $selected