$catalogPath = "C:\Users\91922\Documents\Codex\2026-04-23-can-you-read-https-github-com\harita\data\igbc-green-interiors-v2.json"
$zipPath = "C:\Users\91922\Documents\Sapphire Foods\bhavarkua\IGBC Bhavarkua-Final.zip"
$outPath = "C:\Users\91922\Documents\Codex\2026-04-23-can-you-read-https-github-com\harita\BHAVARKUA_UPLOAD_MAP.md"

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$entries = @($zip.Entries | Where-Object { $_.FullName -and -not $_.FullName.EndsWith("/") })
$catalog = Get-Content -Raw -Path $catalogPath | ConvertFrom-Json

$categoryFolderMap = @{
  "Eco Design Approach" = "1. Eco Design"
  "Water Conservation" = "2. Water Conservation"
  "Energy Efficiency" = "3.Energy Efficiency"
  "Interior Materials" = "4. Interior Material"
  "Indoor Environment" = "5. Indoor Environment"
  "Innovation in Interior Design" = "6. Innovation"
}

function Get-ExpectedCreditFolder([string]$creditCode) {
  if ($creditCode -match "MR(\d+)") {
    return "Mandatory $($Matches[1])"
  }
  if ($creditCode -match "C(\d+)$") {
    return "Credit $($Matches[1])"
  }
  if ($creditCode -match "C(\d+)\.(\d+)") {
    return "Credit $($Matches[1]).$($Matches[2])"
  }
  return $null
}

function Get-Ext([string]$fileName) {
  $ext = [System.IO.Path]::GetExtension($fileName).ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($ext)) {
    return "(no-ext)"
  }
  return $ext
}

$rows = @()
foreach ($credit in $catalog) {
  $category = [string]$credit.category
  $creditCode = [string]$credit.credit_code
  $expectedCreditFolder = Get-ExpectedCreditFolder -creditCode $creditCode
  $categoryFolder = $categoryFolderMap[$category]

  $requiredTypes = (@($credit.documents_required) | Where-Object { $_.required } | ForEach-Object { $_.type }) -join "; "
  if ([string]::IsNullOrWhiteSpace($requiredTypes)) {
    $requiredTypes = "(none flagged required)"
  }

  $matchingEntries = @()
  if ($categoryFolder -and $expectedCreditFolder) {
    $prefix = "IGBC Bhavarkua/$categoryFolder/$expectedCreditFolder/"
    $matchingEntries = @($entries | Where-Object { $_.FullName.StartsWith($prefix) })

    if ($matchingEntries.Count -eq 0 -and $category -eq "Indoor Environment" -and $expectedCreditFolder -in @("Mandatory 2", "Credit 1")) {
      $altPrefix = "IGBC Bhavarkua/$categoryFolder/Mandatory 2 & Credit 1/"
      $matchingEntries = @($entries | Where-Object { $_.FullName.StartsWith($altPrefix) })
    }
  }

  $status = "Missing"
  $observedFolder = "-"
  $observedTypes = "-"

  if ($matchingEntries.Count -gt 0) {
    $status = "Present"
    $observedFolder = ($matchingEntries[0].FullName.Trim("/") -split "/")[2]
    $observedTypes = (@($matchingEntries | Group-Object { Get-Ext $_.FullName } | Sort-Object Count -Descending | ForEach-Object { "$($_.Name):$($_.Count)" }) -join ", ")
  } elseif ($category -eq "Water Conservation") {
    $wcEntries = @($entries | Where-Object { $_.FullName.StartsWith("IGBC Bhavarkua/2. Water Conservation/") })
    if ($wcEntries.Count -gt 0) {
      $status = "Present but not structured"
      $observedFolder = "(flat files, no Credit N subfolders)"
      $observedTypes = (@($wcEntries | Group-Object { Get-Ext $_.FullName } | Sort-Object Count -Descending | ForEach-Object { "$($_.Name):$($_.Count)" }) -join ", ")
    }
  }

  $expectedPath = "(category folder not defined)/$expectedCreditFolder"
  if ($categoryFolder) {
    $expectedPath = "$categoryFolder/$expectedCreditFolder"
  }

  $rows += [PSCustomObject]@{
    Category = $category
    CreditCode = $creditCode
    CreditLabel = [string]$credit.credit_label
    CreditName = [string]$credit.credit_name
    Mandatory = [bool]$credit.is_mandatory
    NAFlag = [bool]$credit.na
    ExpectedFolder = $expectedPath
    RequiredDocTypes = $requiredTypes
    ObservedFolder = $observedFolder
    ObservedFileTypes = $observedTypes
    Status = $status
  }
}

$rows = $rows | Sort-Object Category, CreditCode

$lines = @()
$lines += "# Bhavarkua IGBC Upload Map"
$lines += ""
$lines += "This map compares Tracknov IGBC expected credit structure vs the submitted ZIP (`IGBC Bhavarkua-Final.zip`)."
$lines += ""
$lines += "## Legend"
$lines += "- `Present`: Expected folder exists with files."
$lines += "- `Present but not structured`: Evidence exists, but not in credit subfolder pattern."
$lines += "- `Missing`: Expected credit folder not found in submitted ZIP."
$lines += ""
$lines += "## Credit Mapping Matrix"
$lines += "| Category | Credit Code | Credit Label | Mandatory | NA Flag | Expected Folder | Required Doc Types | Observed Folder | Observed File Types | Status |"
$lines += "|---|---|---|---|---|---|---|---|---|---|"
foreach ($row in $rows) {
  $lines += "| $($row.Category) | $($row.CreditCode) | $($row.CreditLabel) | $($row.Mandatory) | $($row.NAFlag) | $($row.ExpectedFolder) | $($row.RequiredDocTypes) | $($row.ObservedFolder) | $($row.ObservedFileTypes) | $($row.Status) |"
}

$lines += ""
$lines += "## Category-Level Observations"
$summary = $rows | Group-Object Category | ForEach-Object {
  $group = $_.Group
  [PSCustomObject]@{
    Category = $_.Name
    Total = $group.Count
    Present = (@($group | Where-Object { $_.Status -eq "Present" }).Count)
    PresentButNotStructured = (@($group | Where-Object { $_.Status -eq "Present but not structured" }).Count)
    Missing = (@($group | Where-Object { $_.Status -eq "Missing" }).Count)
  }
} | Sort-Object Category

$lines += "| Category | Total Credits in Catalog | Present | Present but not structured | Missing |"
$lines += "|---|---|---|---|---|"
foreach ($item in $summary) {
  $lines += "| $($item.Category) | $($item.Total) | $($item.Present) | $($item.PresentButNotStructured) | $($item.Missing) |"
}

$lines += ""
$lines += "## Notes"
$lines += "- The ZIP also includes broad evidence folders (`Site Photos`, `Whitewaters`) and root-level tracker/support files that should be mapped to specific credits during ingestion."
$lines += "- In this submission, `Water Conservation` evidence exists but is mostly flat-file based instead of `Credit N` folders."
$lines += "- Missing folders may indicate non-applicable credits, deferred documentation, or naming mismatches."
$lines += ""
$lines += "## Recommended Tracknov Ingestion Rule"
$lines += "1. Keep only category-level folder + `Credit N` / `Mandatory N` pattern for primary ingestion."
$lines += "2. Treat `Site Photos` and `Whitewaters` as overflow pools requiring mandatory manual credit mapping."
$lines += "3. Flag `Present but not structured` and `Missing` credits in pre-review checklist before Project Owner review."

Set-Content -Path $outPath -Value $lines -Encoding UTF8
$zip.Dispose()
Write-Output $outPath
