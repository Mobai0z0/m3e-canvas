@echo off
REM Load MSVC build environment then run tauri dev
set "CARGO_HOME=%USERPROFILE%\.cargo"
set "PATH=%CARGO_HOME%\bin;%PATH%"

REM Detect Visual Studio vcvarsall.bat
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" set "VSWHERE=D:\Microsoft Visual Studio\18\Community\..\..\Installer\vswhere.exe"

for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
    set "VSINSTALLPATH=%%i"
)

if not defined VSINSTALLPATH (
    REM Fallback to known path
    set "VSINSTALLPATH=D:\Microsoft Visual Studio\18\Community"
)

call "%VSINSTALLPATH%\VC\Auxiliary\Build\vcvarsall.bat" x64 >nul 2>&1

REM Run tauri dev
cd /d E:\m3e-canvas
npx tauri dev
