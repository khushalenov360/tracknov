param()

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Launcher = Join-Path $RepoRoot "bin\tracknov.mjs"

Write-Host ""
Write-Host "Tracknov guided onboarding"
Write-Host "This launcher asks for one Gemini API key, writes .env.local, and starts the app." -ForegroundColor Cyan

if (-not (Test-Path $Launcher)) {
  throw "Could not find bin\tracknov.mjs in the repo root."
}

node $Launcher
