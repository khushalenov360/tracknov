$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Launcher = Join-Path $ScriptRoot "bin\harita.mjs"

if (-not (Test-Path $Launcher)) {
  throw "Could not find bin\harita.mjs next to Start-Harita.ps1."
}

node $Launcher
