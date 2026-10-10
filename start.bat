@echo off
rem Double-click door for Kestrel Radar: this file only launches start.ps1 in the
rem current window. Every check, install and the build itself live in start.ps1.
rem
rem Keep this file ASCII-only: cmd reads .bat bytes in the OEM code page, so any
rem non-ASCII text here is echoed as garbage. Chinese messages belong in start.ps1.
rem
rem The window switches to UTF-8 and stays there: PowerShell and every tool it
rem starts speak UTF-8; switching back is what used to wipe the output above.
chcp 65001 >nul

rem Prefer the absolute Windows PowerShell path: on a machine whose PATH was
rem trimmed, the plain "powershell" name is not found and cmd fails with 9009.
rem Fall back to the name if that file is missing.
set "KESTREL_PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%KESTREL_PS%" set "KESTREL_PS=powershell.exe"

"%KESTREL_PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
set "KESTREL_EXIT=%errorlevel%"

if not "%KESTREL_EXIT%"=="0" (
  echo.
  echo Kestrel startup failed ^(exit code %KESTREL_EXIT%^). The reason is printed above.
  pause
  exit /b %KESTREL_EXIT%
)
