$ExcludePattern = '\\node_modules\\|\\.git\\|\\.next\\'
Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch $ExcludePattern } | ForEach-Object { "- $($_.FullName.Replace((Get-Location).Path + '\', '').Replace('\', '/'))" } | Out-File -FilePath "file index.md" -Encoding utf8
Write-Host "file index.md has been successfully updated."
