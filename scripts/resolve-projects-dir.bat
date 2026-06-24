@echo off
REM 解析 projects 工作区根目录，结果写入环境变量 PROJECTS_DIR。
REM 兼容 C:\projects、D:\projects，以及从子目录 scripts\ 调用。

set "PROJECTS_DIR="
set "ANCHOR=%~dp0"
if "%ANCHOR:~-1%"=="\" set "ANCHOR=%ANCHOR:~0,-1%"

REM scripts\ 目录的上一级
if exist "%ANCHOR%\..\instrument-training-home\app\main.py" (
    for %%I in ("%ANCHOR%\..") do set "PROJECTS_DIR=%%~fI"
)

REM 当前目录即为 projects 根（start-docker.bat / backup-data.bat 同级）
if not defined PROJECTS_DIR if exist "%ANCHOR%\instrument-training-home\app\main.py" (
    set "PROJECTS_DIR=%ANCHOR%"
)

REM 常见盘符兜底
if not defined PROJECTS_DIR if exist "D:\projects\instrument-training-home\app\main.py" (
    set "PROJECTS_DIR=D:\projects"
)
if not defined PROJECTS_DIR if exist "C:\projects\instrument-training-home\app\main.py" (
    set "PROJECTS_DIR=C:\projects"
)