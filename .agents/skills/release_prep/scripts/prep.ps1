$sourceRoot = Get-Location
$parentDir = Split-Path $sourceRoot -Parent

# 1. Backup .git
$gitPath = Join-Path $sourceRoot ".git"
$gitBackup = Join-Path $parentDir ".git"
if (Test-Path $gitPath) {
    Write-Host "Backing up .git to $gitBackup..."
    Copy-Item -Recurse -Force -Path $gitPath -Destination $gitBackup
    Remove-Item -Recurse -Force $gitPath
}

# 2. Backup .map and .js.gz
$backupRoot = Join-Path $parentDir "AndroidTool_debug_bak"
Write-Host "Moving debug files (.map, .js.gz) to $backupRoot..."
Get-ChildItem -Path $sourceRoot -Recurse -Include *.map, *.js.gz | ForEach-Object {
    $relativePath = $_.FullName.Substring($sourceRoot.Path.Length + 1)
    $targetPath = Join-Path $backupRoot $relativePath
    $targetDir = Split-Path $targetPath -Parent
    if (!(Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    Move-Item -Path $_.FullName -Destination $targetPath -Force
}
Write-Host "Pre-release preparation complete!"
