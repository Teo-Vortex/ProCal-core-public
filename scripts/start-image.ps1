param(
  [string]$Image = "ghcr.io/teo-vortex/procal-core-public:latest",
  [string]$BindIp = "0.0.0.0",
  [int]$Port = 8080,
  [switch]$NoPull
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..")
$envPath = Join-Path $repoRoot ".env"
$composeFile = Join-Path $repoRoot "docker-compose.image.yml"

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

function Get-DefaultImage {
  param([string]$Fallback)

  if ($Fallback -notmatch "replace-owner") {
    return $Fallback
  }

  try {
    $remote = (& git -C $repoRoot remote get-url origin 2>$null)
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remote)) {
      return $Fallback
    }
    $value = ([string]$remote).Trim()
    if ($value -match "github\.com[:/](?<owner>[^/]+)/ProCal-core-public(?:\.git)?$") {
      return "ghcr.io/$($Matches.owner.ToLowerInvariant())/procal-core-public:latest"
    }
  } catch {
    return $Fallback
  }
  return $Fallback
}

function Set-EnvLine {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Value
  )

  $line = "$Name=$Value"
  if (-not (Test-Path $Path)) {
    Set-Content -LiteralPath $Path -Value $line -Encoding UTF8
    return
  }

  $content = Get-Content -LiteralPath $Path
  $found = $false
  $next = foreach ($item in $content) {
    if ($item -match "^$([regex]::Escape($Name))=") {
      $found = $true
      $line
    } else {
      $item
    }
  }
  if (-not $found) {
    $next += $line
  }
  Set-Content -LiteralPath $Path -Value $next -Encoding UTF8
}

$Image = Get-DefaultImage -Fallback $Image
if ($Image -match "replace-owner") {
  throw "Set a real Docker image, for example ghcr.io/your-name/procal-core-public:latest."
}

if (-not (Test-Path $envPath)) {
  $rootPassword = New-HexSecret
  $appPassword = New-HexSecret
  $setupToken = New-HexSecret
  $updaterToken = New-HexSecret
  @"
PROCAL_SELF_BIND_IP=$BindIp
PROCAL_SELF_PORT=$Port
PROCAL_SELF_TRUST_PROXY=0
PROCAL_SELF_APP_VERSION=0.9.9-community
PROCAL_SELF_SETUP_TOKEN=$setupToken
PROCAL_CORE_IMAGE=$Image
PROCAL_UPDATER_IMAGE=ghcr.io/teo-vortex/procal-core-updater:latest
PROCAL_UPDATE_ALLOWED_IMAGE=ghcr.io/teo-vortex/procal-core-public
PROCAL_UPDATE_GITHUB_REPO=Teo-Vortex/ProCal-core-public
PROCAL_UPDATER_TOKEN=$updaterToken
TZ=Europe/Sofia

PROCAL_SELF_DB_ROOT_PASSWORD=$rootPassword
PROCAL_SELF_DB_NAME=procal
PROCAL_SELF_DB_USER=procal
PROCAL_SELF_DB_PASSWORD=$appPassword
"@ | Set-Content -LiteralPath $envPath -Encoding UTF8
  Write-Host "Created $envPath with generated local passwords and setup token."
} else {
  Write-Host "Using existing $envPath."
  Set-EnvLine -Path $envPath -Name "PROCAL_CORE_IMAGE" -Value $Image
  $setupTokenLine = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^PROCAL_SELF_SETUP_TOKEN=' } | Select-Object -First 1
  $setupToken = if ($setupTokenLine) { ($setupTokenLine -split '=', 2)[1].Trim() } else { "" }
  if (-not $setupToken) {
    $setupToken = New-HexSecret
    Set-EnvLine -Path $envPath -Name "PROCAL_SELF_SETUP_TOKEN" -Value $setupToken
    Write-Host "Added a generated setup token to the existing environment."
  }
  $updaterTokenLine = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^PROCAL_UPDATER_TOKEN=' } | Select-Object -First 1
  $updaterToken = if ($updaterTokenLine) { ($updaterTokenLine -split '=', 2)[1].Trim() } else { "" }
  if (-not $updaterToken) {
    Set-EnvLine -Path $envPath -Name "PROCAL_UPDATER_TOKEN" -Value (New-HexSecret)
    Write-Host "Added a generated updater token to the existing environment."
  }
}

if (-not $NoPull) {
  & docker pull $Image
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

& docker compose --env-file $envPath -f $composeFile up -d
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "ProCal Core image install is starting."
Write-Host "Image: $Image"
Write-Host "Open: http://localhost:$Port/setup"
Write-Host "LAN:  http://<this-computer-ip>:$Port/setup"
Write-Host "Setup token: $setupToken"
