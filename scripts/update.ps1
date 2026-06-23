param(
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..")
$envPath = Join-Path $repoRoot ".env"
$composeFile = Join-Path $repoRoot "docker-compose.yml"

if (-not (Test-Path $envPath)) {
  throw "Missing .env. Run scripts\start.ps1 first or copy .env.example to .env and set passwords."
}

Write-Host "Before updating, export an encrypted full backup from Admin -> Backups."
Write-Host "Press Enter to continue, or Ctrl+C to stop."
[void][System.Console]::ReadLine()

$arguments = @("compose", "--env-file", $envPath, "-f", $composeFile, "up", "-d")
if (-not $NoBuild) {
  $arguments += "--build"
}

& docker @arguments
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

& docker compose --env-file $envPath -f $composeFile ps
