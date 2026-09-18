# Load MSVC build environment then run tauri dev
$ErrorActionPreference = "Stop"

$cargoBin = "$env:USERPROFILE\.cargo\bin"
$env:PATH = "$cargoBin;$env:PATH"

# Detect Visual Studio
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vswhere) {
    $vsPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
} else {
    $vsPath = "D:\Microsoft Visual Studio\18\Community"
}

$vcvars = "$vsPath\VC\Auxiliary\Build\vcvarsall.bat"
if (Test-Path $vcvars) {
    cmd /c "`"$vcvars`" x64 >nul 2>&1 && set" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

Set-Location E:\m3e-canvas
npx tauri dev
