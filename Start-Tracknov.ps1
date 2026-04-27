$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Launcher = Join-Path $ScriptRoot "bin\tracknov.mjs"

if (-not (Test-Path $Launcher)) {
  throw "Could not find bin\tracknov.mjs next to Start-Tracknov.ps1."
}

node $Launcher

