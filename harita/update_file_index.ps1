$RepoRoot = Resolve-Path ".."
$ExcludePattern = '\\node_modules\\|\\.git\\|\\.next\\'
Get-ChildItem -Path $RepoRoot -Recurse -File | Where-Object { $_.FullName -notmatch $ExcludePattern } | ForEach-Object { "- $($_.FullName.Replace($RepoRoot.Path + '\', '').Replace('\', '/'))" } | Out-File -FilePath "$PSScriptRoot\file_index.md" -Encoding utf8
Write-Host "file_index.md has been successfully updated in the harita folder."
