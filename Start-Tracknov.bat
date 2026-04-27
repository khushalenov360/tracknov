@echo off
setlocal
set "ROOT=%~dp0"
node "%ROOT%bin\tracknov.mjs" %*
endlocal

