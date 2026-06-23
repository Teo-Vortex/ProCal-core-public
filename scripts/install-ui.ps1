param(
  [string]$DefaultImage = "ghcr.io/replace-owner/procal-core-public:latest",
  [string]$DefaultBindIp = "0.0.0.0",
  [int]$DefaultPort = 8080,
  [string]$DefaultTimezone = "Europe/Sofia",
  [switch]$DryRun,
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$installScript = Join-Path $scriptDir "install.ps1"

if (-not (Test-Path -LiteralPath $installScript)) {
  throw "Missing installer script: $installScript"
}

function Get-DefaultImage {
  param([string]$Fallback)

  if ($Fallback -notmatch "replace-owner") {
    return $Fallback
  }

  try {
    $repoRoot = Resolve-Path (Join-Path $scriptDir "..")
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

$DefaultImage = Get-DefaultImage -Fallback $DefaultImage

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if ($SelfTest) {
  Write-Host "ProCal Core installer UI self-test OK."
  return
}

if ([System.Threading.Thread]::CurrentThread.GetApartmentState() -ne "STA") {
  $currentExe = (Get-Process -Id $PID).Path
  $arguments = @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-STA",
    "-File",
    $PSCommandPath,
    "-DefaultImage",
    $DefaultImage,
    "-DefaultBindIp",
    $DefaultBindIp,
    "-DefaultPort",
    [string]$DefaultPort,
    "-DefaultTimezone",
    $DefaultTimezone
  )
  if ($DryRun) {
    $arguments += "-DryRun"
  }
  Start-Process -FilePath $currentExe -ArgumentList $arguments
  exit
}

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = "ProCal Core Installer"
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
$form.MaximizeBox = $false
$form.ClientSize = New-Object System.Drawing.Size(680, 610)

$title = New-Object System.Windows.Forms.Label
$title.Text = "ProCal Core Installer"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(20, 18)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Install or start a self-hosted ProCal Core instance with Docker."
$subtitle.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$subtitle.AutoSize = $true
$subtitle.Location = New-Object System.Drawing.Point(23, 52)
$form.Controls.Add($subtitle)

$modeGroup = New-Object System.Windows.Forms.GroupBox
$modeGroup.Text = "Install mode"
$modeGroup.Location = New-Object System.Drawing.Point(24, 84)
$modeGroup.Size = New-Object System.Drawing.Size(632, 86)
$form.Controls.Add($modeGroup)

$sourceRadio = New-Object System.Windows.Forms.RadioButton
$sourceRadio.Text = "Build from this folder"
$sourceRadio.Location = New-Object System.Drawing.Point(18, 28)
$sourceRadio.Size = New-Object System.Drawing.Size(220, 24)
$sourceRadio.Checked = $true
$modeGroup.Controls.Add($sourceRadio)

$imageRadio = New-Object System.Windows.Forms.RadioButton
$imageRadio.Text = "Pull prebuilt Docker image"
$imageRadio.Location = New-Object System.Drawing.Point(18, 54)
$imageRadio.Size = New-Object System.Drawing.Size(220, 24)
$modeGroup.Controls.Add($imageRadio)

$imageLabel = New-Object System.Windows.Forms.Label
$imageLabel.Text = "Image"
$imageLabel.Location = New-Object System.Drawing.Point(250, 32)
$imageLabel.Size = New-Object System.Drawing.Size(70, 22)
$modeGroup.Controls.Add($imageLabel)

$imageText = New-Object System.Windows.Forms.TextBox
$imageText.Text = $DefaultImage
$imageText.Location = New-Object System.Drawing.Point(320, 29)
$imageText.Size = New-Object System.Drawing.Size(292, 24)
$modeGroup.Controls.Add($imageText)

$settingsGroup = New-Object System.Windows.Forms.GroupBox
$settingsGroup.Text = "Network"
$settingsGroup.Location = New-Object System.Drawing.Point(24, 184)
$settingsGroup.Size = New-Object System.Drawing.Size(632, 100)
$form.Controls.Add($settingsGroup)

$bindLabel = New-Object System.Windows.Forms.Label
$bindLabel.Text = "Bind IP"
$bindLabel.Location = New-Object System.Drawing.Point(18, 31)
$bindLabel.Size = New-Object System.Drawing.Size(80, 22)
$settingsGroup.Controls.Add($bindLabel)

$bindText = New-Object System.Windows.Forms.TextBox
$bindText.Text = $DefaultBindIp
$bindText.Location = New-Object System.Drawing.Point(100, 28)
$bindText.Size = New-Object System.Drawing.Size(150, 24)
$settingsGroup.Controls.Add($bindText)

$portLabel = New-Object System.Windows.Forms.Label
$portLabel.Text = "Port"
$portLabel.Location = New-Object System.Drawing.Point(280, 31)
$portLabel.Size = New-Object System.Drawing.Size(55, 22)
$settingsGroup.Controls.Add($portLabel)

$portNumber = New-Object System.Windows.Forms.NumericUpDown
$portNumber.Minimum = 1
$portNumber.Maximum = 65535
$portNumber.Value = $DefaultPort
$portNumber.Location = New-Object System.Drawing.Point(335, 28)
$portNumber.Size = New-Object System.Drawing.Size(90, 24)
$settingsGroup.Controls.Add($portNumber)

$tzLabel = New-Object System.Windows.Forms.Label
$tzLabel.Text = "Timezone"
$tzLabel.Location = New-Object System.Drawing.Point(18, 65)
$tzLabel.Size = New-Object System.Drawing.Size(80, 22)
$settingsGroup.Controls.Add($tzLabel)

$timezoneText = New-Object System.Windows.Forms.TextBox
$timezoneText.Text = $DefaultTimezone
$timezoneText.Location = New-Object System.Drawing.Point(100, 62)
$timezoneText.Size = New-Object System.Drawing.Size(220, 24)
$settingsGroup.Controls.Add($timezoneText)

$optionsGroup = New-Object System.Windows.Forms.GroupBox
$optionsGroup.Text = "Options"
$optionsGroup.Location = New-Object System.Drawing.Point(24, 298)
$optionsGroup.Size = New-Object System.Drawing.Size(632, 70)
$form.Controls.Add($optionsGroup)

$noBuildCheck = New-Object System.Windows.Forms.CheckBox
$noBuildCheck.Text = "Do not rebuild source image"
$noBuildCheck.Location = New-Object System.Drawing.Point(18, 29)
$noBuildCheck.Size = New-Object System.Drawing.Size(220, 24)
$optionsGroup.Controls.Add($noBuildCheck)

$noPullCheck = New-Object System.Windows.Forms.CheckBox
$noPullCheck.Text = "Do not pull image"
$noPullCheck.Location = New-Object System.Drawing.Point(250, 29)
$noPullCheck.Size = New-Object System.Drawing.Size(160, 24)
$optionsGroup.Controls.Add($noPullCheck)

$dryRunCheck = New-Object System.Windows.Forms.CheckBox
$dryRunCheck.Text = "Dry run"
$dryRunCheck.Location = New-Object System.Drawing.Point(430, 29)
$dryRunCheck.Size = New-Object System.Drawing.Size(120, 24)
$dryRunCheck.Checked = [bool]$DryRun
$optionsGroup.Controls.Add($dryRunCheck)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(24, 384)
$logBox.Size = New-Object System.Drawing.Size(632, 160)
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$form.Controls.Add($logBox)

$installButton = New-Object System.Windows.Forms.Button
$installButton.Text = "Install"
$installButton.Location = New-Object System.Drawing.Point(424, 560)
$installButton.Size = New-Object System.Drawing.Size(105, 30)
$form.Controls.Add($installButton)

$dryRunButton = New-Object System.Windows.Forms.Button
$dryRunButton.Text = "Test"
$dryRunButton.Location = New-Object System.Drawing.Point(538, 560)
$dryRunButton.Size = New-Object System.Drawing.Size(55, 30)
$form.Controls.Add($dryRunButton)

$closeButton = New-Object System.Windows.Forms.Button
$closeButton.Text = "Close"
$closeButton.Location = New-Object System.Drawing.Point(602, 560)
$closeButton.Size = New-Object System.Drawing.Size(55, 30)
$form.Controls.Add($closeButton)

$script:currentJob = $null
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 500

function Add-Log {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return
  }
  $logBox.AppendText($Text + [Environment]::NewLine)
}

function Set-ModeState {
  $imageText.Enabled = $imageRadio.Checked
  $noPullCheck.Enabled = $imageRadio.Checked
  $noBuildCheck.Enabled = $sourceRadio.Checked
}

function Set-Busy {
  param([bool]$Busy)

  $sourceRadio.Enabled = -not $Busy
  $imageRadio.Enabled = -not $Busy
  $imageText.Enabled = (-not $Busy) -and $imageRadio.Checked
  $bindText.Enabled = -not $Busy
  $portNumber.Enabled = -not $Busy
  $timezoneText.Enabled = -not $Busy
  $noBuildCheck.Enabled = (-not $Busy) -and $sourceRadio.Checked
  $noPullCheck.Enabled = (-not $Busy) -and $imageRadio.Checked
  $dryRunCheck.Enabled = -not $Busy
  $installButton.Enabled = -not $Busy
  $dryRunButton.Enabled = -not $Busy
}

function Start-Install {
  param([bool]$ForceDryRun)

  if ($script:currentJob) {
    [System.Windows.Forms.MessageBox]::Show("Installer is already running.", "ProCal Core Installer") | Out-Null
    return
  }

  $mode = if ($imageRadio.Checked) { "image" } else { "source" }
  $image = $imageText.Text.Trim()
  if ($mode -eq "image" -and ($image -eq "" -or $image -match "replace-owner")) {
    [System.Windows.Forms.MessageBox]::Show("Set a real Docker image first.", "ProCal Core Installer") | Out-Null
    return
  }

  $bindIp = $bindText.Text.Trim()
  if ($bindIp -eq "") {
    $bindIp = "0.0.0.0"
  }
  $timezone = $timezoneText.Text.Trim()
  if ($timezone -eq "") {
    $timezone = "Europe/Sofia"
  }

  $logBox.Clear()
  Add-Log "Starting installer..."
  Set-Busy $true

  $script:currentJob = Start-Job -ScriptBlock {
    param(
      [string]$ScriptPath,
      [string]$Mode,
      [string]$BindIp,
      [string]$Port,
      [string]$Timezone,
      [string]$Image,
      [bool]$NoBuild,
      [bool]$NoPull,
      [bool]$DryRun
    )

    $psExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
    if (-not (Test-Path -LiteralPath $psExe)) {
      $psExe = "powershell"
    }

    $args = @(
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      $ScriptPath,
      "-Mode",
      $Mode,
      "-BindIp",
      $BindIp,
      "-Port",
      $Port,
      "-Timezone",
      $Timezone,
      "-NonInteractive"
    )
    if ($Mode -eq "image") {
      $args += @("-Image", $Image)
    }
    if ($NoBuild) {
      $args += "-NoBuild"
    }
    if ($NoPull) {
      $args += "-NoPull"
    }
    if ($DryRun) {
      $args += "-DryRun"
    }

    & $psExe @args 2>&1 | ForEach-Object { $_.ToString() }
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  } -ArgumentList @(
    $installScript,
    $mode,
    $bindIp,
    [string][int]$portNumber.Value,
    $timezone,
    $image,
    [bool]$noBuildCheck.Checked,
    [bool]$noPullCheck.Checked,
    [bool]($dryRunCheck.Checked -or $ForceDryRun)
  )

  $timer.Start()
}

$timer.Add_Tick({
  if (-not $script:currentJob) {
    return
  }

  foreach ($line in (Receive-Job -Job $script:currentJob -ErrorAction SilentlyContinue)) {
    Add-Log ([string]$line)
  }

  if ($script:currentJob.State -in @("Completed", "Failed", "Stopped")) {
    $state = $script:currentJob.State
    foreach ($line in (Receive-Job -Job $script:currentJob -ErrorAction SilentlyContinue)) {
      Add-Log ([string]$line)
    }
    $reason = $script:currentJob.ChildJobs[0].JobStateInfo.Reason
    Remove-Job -Job $script:currentJob -Force
    $script:currentJob = $null
    $timer.Stop()

    if ($state -eq "Completed") {
      Add-Log "Installer finished."
    } else {
      Add-Log "Installer stopped: $state"
      if ($reason) {
        Add-Log $reason.ToString()
      }
    }
    Set-Busy $false
  }
})

$sourceRadio.Add_CheckedChanged({ Set-ModeState })
$imageRadio.Add_CheckedChanged({ Set-ModeState })
$installButton.Add_Click({ Start-Install $false })
$dryRunButton.Add_Click({ Start-Install $true })
$closeButton.Add_Click({ $form.Close() })

$form.Add_FormClosing({
  if ($script:currentJob) {
    $answer = [System.Windows.Forms.MessageBox]::Show(
      "Installer is still running. Stop it and close?",
      "ProCal Core Installer",
      [System.Windows.Forms.MessageBoxButtons]::YesNo,
      [System.Windows.Forms.MessageBoxIcon]::Warning
    )
    if ($answer -ne [System.Windows.Forms.DialogResult]::Yes) {
      $_.Cancel = $true
      return
    }
    Stop-Job -Job $script:currentJob -Force
    Remove-Job -Job $script:currentJob -Force
    $script:currentJob = $null
  }
})

Set-ModeState
[void]$form.ShowDialog()
