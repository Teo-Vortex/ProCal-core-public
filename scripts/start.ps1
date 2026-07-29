param(
  [string]$BindIp = "0.0.0.0",
  [int]$Port = 8080,
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..")
$envPath = Join-Path $repoRoot ".env"
$composeFile = Join-Path $repoRoot "docker-compose.yml"

function New-HexSecret {
  param([int]$Bytes = 32)
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($buffer)
  } finally {
    $rng.Dispose()
  }
  return ($buffer | ForEach-Object { $_.ToString("x2") }) -join ""
}

if (-not (Test-Path $envPath)) {
  $rootPassword = New-HexSecret
  $appPassword = New-HexSecret
  $setupToken = New-HexSecret
  @"
PROCAL_SELF_BIND_IP=$BindIp
PROCAL_SELF_PORT=$Port
PROCAL_SELF_TRUST_PROXY=0
PROCAL_SELF_APP_VERSION=0.9.9-community
PROCAL_SELF_SETUP_TOKEN=$setupToken
TZ=Europe/Sofia

PROCAL_SELF_DB_ROOT_PASSWORD=$rootPassword
PROCAL_SELF_DB_NAME=procal
PROCAL_SELF_DB_USER=procal
PROCAL_SELF_DB_PASSWORD=$appPassword
"@ | Set-Content -LiteralPath $envPath -Encoding UTF8
  Write-Host "Created $envPath with generated local passwords and setup token."
} else {
  Write-Host "Using existing $envPath."
}

if (-not $setupToken) {
  $setupTokenLine = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^PROCAL_SELF_SETUP_TOKEN=' } | Select-Object -First 1
  $setupToken = if ($setupTokenLine) { ($setupTokenLine -split '=', 2)[1].Trim() } else { "" }
  if (-not $setupToken) {
    $setupToken = New-HexSecret
    Add-Content -LiteralPath $envPath -Value "PROCAL_SELF_SETUP_TOKEN=$setupToken" -Encoding UTF8
    Write-Host "Added a generated setup token to the existing environment."
  }
}

$arguments = @("compose", "--env-file", $envPath, "-f", $composeFile, "up", "-d")
if (-not $NoBuild) {
  $arguments += "--build"
}

& docker @arguments
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "ProCal Core is starting."
Write-Host "Open: http://localhost:$Port/setup"
Write-Host "LAN:  http://<this-computer-ip>:$Port/setup"
Write-Host "Setup token: $setupToken"
