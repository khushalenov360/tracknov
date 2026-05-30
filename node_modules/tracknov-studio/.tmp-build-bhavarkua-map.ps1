$catalogPath='C:\Users\91922\Documents\Codex\2026-04-23-can-you-read-https-github-com\harita\data\igbc-green-interiors-v2.json'
$zip='C:\Users\91922\Documents\Sapphire Foods\bhavarkua\IGBC Bhavarkua-Final.zip'
$out='C:\Users\91922\Documents\Codex\2026-04-23-can-you-read-https-github-com\harita\BHAVARKUA_UPLOAD_MAP.md'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$za=[System.IO.Compression.ZipFile]::OpenRead($zip)
$entries=@($za.Entries | Where-Object { $_.FullName -and -not $_.FullName.EndsWith('/') })
$catalog=Get-Content -Raw -Path $catalogPath | ConvertFrom-Json
$catFolder=@{
  'Eco Design Approach'='1. Eco Design'
  'Water Conservation'='2. Water Conservation'
  'Energy Efficiency'='3.Energy Efficiency'
  'Interior Materials'='4. Interior Material'
  'Indoor Environment'='5. Indoor Environment'
  'Innovation in Interior Design'='6. Innovation'
}
function GetExpectedFolder($credit){
  $code=[string]$credit.credit_code
  if($code -match 'MR(\d+)'){ return ('Mandatory ' + $Matches[1]) }
  if($code -match 'C(\d+)$'){ return ('Credit ' + $Matches[1]) }
  if($code -match 'C(\d+)\.(\d+)'){ return ('Credit ' + $Matches[1] + '.' + $Matches[2]) }
  return $null
}
function GetExt($name){
  $e=[System.IO.Path]::GetExtension($name).ToLowerInvariant()
  if([string]::IsNullOrWhiteSpace($e)){ return '(no-ext)' }
  return $e
}
$rows=@()
foreach($credit in $catalog){
  $category=[string]$credit.category
  $cat=[string]($catFolder[$category])
  $expected=GetExpectedFolder $credit
  $required=((@($credit.documents_required) | Where-Object { $_.required } | ForEach-Object { $_.type }) -join '; ')
  if([string]::IsNullOrWhiteSpace($required)){ $required='(none flagged required)' }

  $matching=@()
  if($cat){
    $basePrefix='IGBC Bhavarkua/' + $cat + '/'
    if($expected){
      $matching=@($entries | Where-Object { $_.FullName.StartsWith($basePrefix + $expected + '/') })
    }
    if($matching.Count -eq 0 -and $expected -eq 'Mandatory 2' -and $category -eq 'Indoor Environment'){
      $matching=@($entries | Where-Object { $_.FullName.StartsWith($basePrefix + 'Mandatory 2 & Credit 1/') })
    }
    if($matching.Count -eq 0 -and $expected -eq 'Credit 1' -and $category -eq 'Indoor Environment'){
      $matching=@($entries | Where-Object { $_.FullName.StartsWith($basePrefix + 'Mandatory 2 & Credit 1/') })
    }
  }

  $fileCount=$matching.Count
  $obsTypes=''
  $obsFolder=''
  $status='Missing'

  if($fileCount -gt 0){
    $obsTypes=(@($matching | Group-Object { GetExt $_.FullName } | Sort-Object Count -Descending | ForEach-Object { '{0}:{1}' -f $_.Name,$_.Count }) -join ', ')
    $obsFolder=($matching[0].FullName.Trim('/').Split('/')[2])
    $status='Present'
  } else {
    if($category -eq 'Water Conservation'){
      $wcFiles=@($entries | Where-Object { $_.FullName.StartsWith('IGBC Bhavarkua/2. Water Conservation/') })
      if($wcFiles.Count -gt 0){
        $obsFolder='(flat files, no Credit N subfolders)'
        $obsTypes=(@($wcFiles | Group-Object { GetExt $_.FullName } | Sort-Object Count -Descending | ForEach-Object { '{0}:{1}' -f $_.Name,$_.Count }) -join ', ')
        $status='Present but not structured'
      }
    }
  }

  $expectedPath='(category folder not defined)/' + $expected
  if($cat){ $expectedPath=$cat + '/' + $expected }

  $rows += [PSCustomObject]@{
    Category=$category
    CreditCode=[string]$credit.credit_code
    CreditLabel=[string]$credit.credit_label
    CreditName=[string]$credit.credit_name
    Mandatory=[bool]$credit.is_mandatory
    NA=[bool]$credit.na
    ExpectedFolder=$expectedPath
    RequiredTypes=$required
    ObservedFolder=$obsFolderValue
    ObservedFileTypes=$obsTypesValue
    Status=$status
  }
}

$rows=$rows | Sort-Object Category,CreditCode
$lines=@()
$lines += '# Bhavarkua IGBC Upload Map'
$lines += ''
$lines += 'This map compares Tracknov IGBC expected credit structure vs the submitted ZIP (`IGBC Bhavarkua-Final.zip`).'
$lines += ''
$lines += '## Legend'
$lines += '- `Present`: Expected folder exists with files.'
$lines += '- `Present but not structured`: Evidence exists, but not in credit subfolder pattern.'
$lines += '- `Missing`: Expected credit folder not found in submitted ZIP.'
$lines += ''
$lines += '## Credit Mapping Matrix'
$lines += '| Category | Credit Code | Credit Label | Mandatory | NA Flag | Expected Folder | Required Doc Types | Observed Folder | Observed File Types | Status |'
$lines += '|---|---|---|---|---|---|---|---|---|---|'
foreach($r in $rows){
  $lines += "| $($r.Category) | $($r.CreditCode) | $($r.CreditLabel) | $($r.Mandatory) | $($r.NA) | $($r.ExpectedFolder) | $($r.RequiredTypes) | $($r.ObservedFolder) | $($r.ObservedFileTypes) | $($r.Status) |"
}
$lines += ''
$lines += '## Category-Level Observations'
$present=$rows | Group-Object Category | ForEach-Object {
  $g=$_.Group
  [PSCustomObject]@{
    Category=$_.Name
    Total=$g.Count
    Present=(@($g | Where-Object { $_.Status -eq 'Present' }).Count)
    StructuredIssue=(@($g | Where-Object { $_.Status -eq 'Present but not structured' }).Count)
    Missing=(@($g | Where-Object { $_.Status -eq 'Missing' }).Count)
  }
} | Sort-Object Category
$lines += '| Category | Total Credits in Catalog | Present | Present but not structured | Missing |'
$lines += '|---|---|---|---|---|'
foreach($p in $present){
  $lines += "| $($p.Category) | $($p.Total) | $($p.Present) | $($p.StructuredIssue) | $($p.Missing) |"
}
$lines += ''
$lines += '## Notes'
$lines += '- The ZIP also includes broad evidence folders (`Site Photos`, `Whitewaters`) and root-level tracker/support files that should be mapped to specific credits during ingestion.'
$lines += '- In this submission, `Water Conservation` evidence exists but is mostly flat-file based instead of `Credit N` folders.'
$lines += '- Missing folders may indicate non-applicable credits, deferred documentation, or naming mismatches.'
$lines += ''
$lines += '## Recommended Tracknov Ingestion Rule'
$lines += '1. Keep only category-level folder + `Credit N` / `Mandatory N` pattern for primary ingestion.'
$lines += '2. Treat `Site Photos` and `Whitewaters` as overflow pools requiring mandatory manual credit mapping.'
$lines += '3. Flag `Present but not structured` and `Missing` credits in pre-review checklist before Project Owner review.'
Set-Content -Path $out -Value $lines -Encoding UTF8
$za.Dispose()
Write-Output $out

