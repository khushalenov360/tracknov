@echo off
setlocal
set "ROOT=%~dp0"
node "%ROOT%bin\harita.mjs" %*
endlocal
