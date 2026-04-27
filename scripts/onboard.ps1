param()

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Launcher = Join-Path $RepoRoot "bin\harita.mjs"

Write-Host ""
Write-Host "HaritaDocs guided onboarding"
Write-Host "This launcher asks for one Gemini API key, writes .env.local, and starts the app." -ForegroundColor Cyan

if (-not (Test-Path $Launcher)) {
  throw "Could not find bin\harita.mjs in the repo root."
}

node $Launcher
