@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 (
  echo Cannot enter the project directory.
  pause
  exit /b 1
)
if not exist package.json (
  echo package.json not found. Run this script from the Kestrel repository root.
  popd
  pause
  exit /b 1
)

rem pnpm can panic on mapped network drives while returning exit code 0.
net use "%CD:~0,2%" >nul 2>nul
if not errorlevel 1 (
  echo This project is on a mapped network drive. Copy it to a local drive first.
  popd
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node.js 22.18+ or 24.12+ from https://nodejs.org
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm not found. Install with corepack enable or npm install -g pnpm
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call pnpm install --frozen-lockfile
  if errorlevel 1 ( pause & exit /b 1 )
)

echo Building Kestrel Radar...
call pnpm build
if errorlevel 1 ( pause & exit /b 1 )

if "%KESTREL_HOST%"=="" set KESTREL_HOST=127.0.0.1
if "%KESTREL_PORT%"=="" set KESTREL_PORT=8765
echo Starting Kestrel Radar on http://%KESTREL_HOST%:%KESTREL_PORT%
start "" "http://%KESTREL_HOST%:%KESTREL_PORT%"

call pnpm start
pause
