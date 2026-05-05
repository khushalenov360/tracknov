$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$npm = "C:\Program Files\nodejs\npm.cmd"
$hostName = "127.0.0.1"
$port = 3000

if (-not (Test-Path $npm)) {
  throw "npm.cmd not found at $npm"
}

Write-Host "Tracknov bootstrap starting..." -ForegroundColor Cyan

# Keep port clean to avoid repeated EADDRINUSE/login failures.
$listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
  $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    try { Stop-Process -Id $pid -Force -ErrorAction Stop } catch {}
  }
  Start-Sleep -Milliseconds 700
}

Push-Location $ScriptRoot
try {
  & $npm install --no-fund --no-audit | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "npm install failed with code $LASTEXITCODE" }

  & $npm run build | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed with code $LASTEXITCODE" }

  Write-Host "Tracknov ready at http://$hostName`:$port/login" -ForegroundColor Green
  & $npm run start -- --hostname $hostName --port $port
} finally {
  Pop-Location
}

