@echo off
REM Resolve projects workspace root into PROJECTS_DIR.
REM Supports C:\projects, D:\projects, and calls from scripts\ subfolder.

set "PROJECTS_DIR="
set "ANCHOR=%~dp0"
if "%ANCHOR:~-1%"=="\" set "ANCHOR=%ANCHOR:~0,-1%"

REM Parent of scripts\
if exist "%ANCHOR%\..\instrument-training-home\app\main.py" (
    for %%I in ("%ANCHOR%\..") do set "PROJECTS_DIR=%%~fI"
)

REM Caller lives at projects root (next to start-docker.bat)
if not defined PROJECTS_DIR (
    if exist "%ANCHOR%\instrument-training-home\app\main.py" (
        set "PROJECTS_DIR=%ANCHOR%"
    )
)

REM Fallback: common drive letters
if not defined PROJECTS_DIR (
    if exist "D:\projects\instrument-training-home\app\main.py" (
        set "PROJECTS_DIR=D:\projects"
    )
)
if not defined PROJECTS_DIR (
    if exist "C:\projects\instrument-training-home\app\main.py" (
        set "PROJECTS_DIR=C:\projects"
    )
)