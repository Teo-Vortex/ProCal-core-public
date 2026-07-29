param(
  [ValidateSet("auto", "source", "image")]
  [string]$Mode = "auto",
  [string]$Image = "ghcr.io/teo-vortex/procal-core-public:latest",
  [string]$BindIp = "0.0.0.0",
  [int]$Port = 8080,
  [string]$Timezone = "Europe/Sofia",
  [switch]$NoBuild,
  [switch]$NoPull,
  [switch]$NonInteractive,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..")
$envPath = Join-Path $repoRoot ".env"
$sourceComposeFile = Join-Path $repoRoot "docker-compose.yml"
$imageComposeFile = Join-Path $repoRoot "docker-compose.image.yml"

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

function Read-Default {
  param(
    [Parameter(Mandatory = $true)][string]$Prompt,
    [Parameter(Mandatory = $true)][string]$Default
  )

  if ($NonInteractive) {
    return $Default
  }

  $value = Read-Host "$Prompt [$Default]"
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $Default
  }
  return $value.Trim()
}

function Get-EnvValue {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Default = ""
  )

  if (-not (Test-Path -LiteralPath $envPath)) {
    return $Default
  }

  $pattern = "^$([regex]::Escape($Name))=(.*)$"
  foreach ($line in (Get-Content -LiteralPath $envPath)) {
    $match = [regex]::Match($line, $pattern)
    if ($match.Success) {
      return $match.Groups[1].Value
    }
  }
  return $Default
}

function Set-EnvLine {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Value
  )

  $line = "$Name=$Value"
  if (-not (Test-Path -LiteralPath $envPath)) {
    Set-Content -LiteralPath $envPath -Value $line -Encoding UTF8
    return
  }

  $content = Get-Content -LiteralPath $envPath
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
  Set-Content -LiteralPath $envPath -Value $next -Encoding UTF8
}

function Ensure-Docker {
  if ($DryRun) {
    return
  }

  & docker version *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker is not available. Install Docker Desktop or Docker Engine, then run this installer again."
  }

  & docker compose version *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose is not available. Install a Docker version with 'docker compose' support."
  }
}

function Resolve-InstallMode {
  if ($Mode -ne "auto") {
    return $Mode
  }

  $defaultMode = "source"
  if ($Image -and $Image -notmatch "replace-owner") {
    $defaultMode = "image"
  }

  if ($NonInteractive) {
    return $defaultMode
  }

  Write-Host ""
  Write-Host "Choose install mode:"
  Write-Host "  1) Build from this folder"
  Write-Host "  2) Pull a prebuilt Docker image"
  $choice = Read-Host "Mode [$defaultMode]"
  if ($choice -eq "2" -or $choice -eq "image") {
    return "image"
  }
  if ($choice -eq "1" -or $choice -eq "source") {
    return "source"
  }
  return $defaultMode
}

function Write-InstallEnv {
  param(
    [Parameter(Mandatory = $true)][string]$InstallMode,
    [Parameter(Mandatory = $true)][string]$InstallImage,
    [Parameter(Mandatory = $true)][string]$InstallBindIp,
    [Parameter(Mandatory = $true)][int]$InstallPort,
    [Parameter(Mandatory = $true)][string]$InstallTimezone
  )

  if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run: would write .env at $envPath"
    return
  }

  if (-not (Test-Path -LiteralPath $envPath)) {
    @"
PROCAL_SELF_BIND_IP=$InstallBindIp
PROCAL_SELF_PORT=$InstallPort
PROCAL_SELF_TRUST_PROXY=0
PROCAL_SELF_APP_VERSION=0.9.9-community
PROCAL_SELF_SETUP_TOKEN=$(New-HexSecret)
PROCAL_CORE_IMAGE=$InstallImage
TZ=$InstallTimezone

PROCAL_SELF_DB_ROOT_PASSWORD=$(New-HexSecret)
PROCAL_SELF_DB_NAME=procal
PROCAL_SELF_DB_USER=procal
PROCAL_SELF_DB_PASSWORD=$(New-HexSecret)
"@ | Set-Content -LiteralPath $envPath -Encoding UTF8
    Write-Host "Created $envPath with generated local passwords."
    return
  }

  Write-Host "Using existing $envPath and preserving database passwords."
  Set-EnvLine -Name "PROCAL_SELF_BIND_IP" -Value $InstallBindIp
  Set-EnvLine -Name "PROCAL_SELF_PORT" -Value ([string]$InstallPort)
  Set-EnvLine -Name "PROCAL_SELF_TRUST_PROXY" -Value (Get-EnvValue -Name "PROCAL_SELF_TRUST_PROXY" -Default "0")
  Set-EnvLine -Name "PROCAL_SELF_APP_VERSION" -Value (Get-EnvValue -Name "PROCAL_SELF_APP_VERSION" -Default "0.9.9-community")
  Set-EnvLine -Name "PROCAL_SELF_SETUP_TOKEN" -Value (Get-EnvValue -Name "PROCAL_SELF_SETUP_TOKEN" -Default (New-HexSecret))
  Set-EnvLine -Name "PROCAL_CORE_IMAGE" -Value $InstallImage
  Set-EnvLine -Name "TZ" -Value $InstallTimezone
  Set-EnvLine -Name "PROCAL_SELF_DB_ROOT_PASSWORD" -Value (Get-EnvValue -Name "PROCAL_SELF_DB_ROOT_PASSWORD" -Default (New-HexSecret))
  Set-EnvLine -Name "PROCAL_SELF_DB_NAME" -Value (Get-EnvValue -Name "PROCAL_SELF_DB_NAME" -Default "procal")
  Set-EnvLine -Name "PROCAL_SELF_DB_USER" -Value (Get-EnvValue -Name "PROCAL_SELF_DB_USER" -Default "procal")
  Set-EnvLine -Name "PROCAL_SELF_DB_PASSWORD" -Value (Get-EnvValue -Name "PROCAL_SELF_DB_PASSWORD" -Default (New-HexSecret))
}

$Image = Get-DefaultImage -Fallback $Image

$installMode = Resolve-InstallMode
$defaultBindIp = Get-EnvValue -Name "PROCAL_SELF_BIND_IP" -Default $BindIp
$defaultPort = Get-EnvValue -Name "PROCAL_SELF_PORT" -Default ([string]$Port)
$defaultTimezone = Get-EnvValue -Name "TZ" -Default $Timezone
$defaultImage = Get-EnvValue -Name "PROCAL_CORE_IMAGE" -Default $Image

$installBindIp = Read-Default -Prompt "Bind IP" -Default $defaultBindIp
$installPortValue = Read-Default -Prompt "Port" -Default $defaultPort
if (-not [int]::TryParse($installPortValue, [ref]$Port) -or $Port -lt 1 -or $Port -gt 65535) {
  throw "Invalid port: $installPortValue"
}
$installTimezone = Read-Default -Prompt "Timezone" -Default $defaultTimezone
$installImage = $defaultImage

if ($installMode -eq "image") {
  $installImage = Read-Default -Prompt "Docker image" -Default $defaultImage
  if ($installImage -match "replace-owner") {
    throw "Set a real Docker image, for example ghcr.io/your-name/procal-core-public:latest."
  }
}

Ensure-Docker
Write-InstallEnv -InstallMode $installMode -InstallImage $installImage -InstallBindIp $installBindIp -InstallPort $Port -InstallTimezone $installTimezone

if ($installMode -eq "image") {
  if (-not $NoPull) {
    if ($DryRun) {
      Write-Host "Dry run: would run docker pull $installImage"
    } else {
      & docker pull $installImage
      if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
      }
    }
  }

  $composeFile = $imageComposeFile
  $arguments = @("compose", "--env-file", $envPath, "-f", $composeFile, "up", "-d")
} else {
  $composeFile = $sourceComposeFile
  $arguments = @("compose", "--env-file", $envPath, "-f", $composeFile, "up", "-d")
  if (-not $NoBuild) {
    $arguments += "--build"
  }
}

if ($DryRun) {
  Write-Host "Dry run: would run docker $($arguments -join ' ')"
} else {
  & docker @arguments
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Write-Host ""
Write-Host "ProCal Core install is ready."
Write-Host "Mode: $installMode"
if ($installMode -eq "image") {
  Write-Host "Image: $installImage"
}
Write-Host "Open: http://localhost:$Port/setup"
Write-Host "LAN:  http://<this-computer-ip>:$Port/setup"
if (-not $DryRun) {
  Write-Host "Setup token: $(Get-EnvValue -Name 'PROCAL_SELF_SETUP_TOKEN')"
}
