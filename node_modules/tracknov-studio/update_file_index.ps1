$RepoRoot = Resolve-Path ".."
$ExcludePattern = '\\node_modules\\|\\.git\\|\\.next\\'
Get-ChildItem -Path $RepoRoot -Recurse -File | Where-Object { $_.FullName -notmatch $ExcludePattern } | ForEach-Object {
    $relPath = $_.FullName.Replace($RepoRoot.Path + '\', '').Replace('\', '/')
    $urlPath = $relPath.Replace(' ', '%20')
    "- [$relPath](https://github.com/khushalenov360/tracknov/blob/main/$urlPath)"
} | Out-File -FilePath "$PSScriptRoot\file_index.md" -Encoding utf8
Write-Host "file_index.md has been successfully updated in the harita folder."
