@echo off
setlocal
set "ROOT=%~dp0"
if exist "%ProgramFiles%\nodejs\npm.cmd" (
  powershell -ExecutionPolicy Bypass -File "%ROOT%Start-Tracknov.ps1"
) else (
  echo npm.cmd not found in %ProgramFiles%\nodejs
  exit /b 1
)
endlocal

