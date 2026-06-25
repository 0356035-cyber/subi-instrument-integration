@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\scheduled-backup.ps1" -KeepCount 14
exit /b %errorlevel%