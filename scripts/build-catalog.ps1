param(
  [string]$Output = "catalog/build",
  [string]$SourceCache = "catalog/source-cache",
  [string]$CatalogVersion = "local-$([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'))",
  [int]$Limit = 100,
  [switch]$SkipLinkCheck
)

$RepoRoot = Split-Path -Parent $PSScriptRoot
$env:PYTHONPATH = Join-Path $RepoRoot "catalog_builder/src"

$arguments = @(
  "-m", "bitbyte_catalog", "live",
  "--output", $Output,
  "--source-cache", $SourceCache,
  "--catalog-version", $CatalogVersion,
  "--limit", $Limit
)

if ($SkipLinkCheck) {
  $arguments += "--skip-link-check"
}

python @arguments
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
