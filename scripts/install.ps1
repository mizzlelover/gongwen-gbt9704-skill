[CmdletBinding()]
param(
  [ValidateSet('codex', 'claude', 'opencode', 'trae-code', 'trae-cli', 'kimi-cli', 'kimi-code', 'workbuddy', 'zcode')]
  [string[]]$Target,
  [switch]$All,
  [switch]$Link,
  [switch]$Force
)

$SkillDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $Target -and -not $All) { throw 'Pass -All or at least one -Target.' }
if ($All) { $Target = @('codex', 'claude', 'opencode', 'trae-code', 'trae-cli', 'kimi-cli', 'kimi-code', 'workbuddy', 'zcode') }

$Roots = @{
  'codex' = "$HOME\.codex\skills"
  'claude' = "$HOME\.claude\skills"
  'opencode' = "$HOME\.config\opencode\skills"
  'trae-code' = "$HOME\.trae-cn\skills"
  'trae-cli' = "$HOME\.traecli\skills"
  'kimi-cli' = "$HOME\.kimi\skills"
  'kimi-code' = "$HOME\.kimi-code\skills"
  'workbuddy' = "$HOME\.workbuddy\skills"
  'zcode' = "$HOME\.zcode\skills"
}

foreach ($Name in $Target) {
  $Root = $Roots[$Name]
  $Destination = Join-Path $Root 'gongwen'
  New-Item -ItemType Directory -Force -Path $Root | Out-Null
  if (Test-Path $Destination) {
    if (-not $Force) { throw "Refusing to replace $Destination. Review it, then rerun with -Force." }
    Remove-Item -Recurse -Force $Destination
  }
  if ($Link) {
    New-Item -ItemType SymbolicLink -Path $Destination -Target $SkillDir | Out-Null
  } else {
    Copy-Item -Recurse -Force -Exclude '.git', 'dist' -Path $SkillDir -Destination $Destination
  }
  if (-not (Test-Path (Join-Path $Destination 'SKILL.md'))) { throw "Installation failed for $Name." }
  Write-Output "Installed: $Name -> $Destination"
}
