$targetRoot = Get-Location
$parentDir = Split-Path $targetRoot -Parent

# 1. Restore .git
$gitPath = Join-Path $targetRoot ".git"
$gitBackup = Join-Path $parentDir ".git"
if (Test-Path $gitBackup) {
    Write-Host "Restoring .git from $gitBackup..."
    if (Test-Path $gitPath) {
        Remove-Item -Recurse -Force $gitPath
    }
    Move-Item -Force -Path $gitBackup -Destination $gitPath
}

# 2. Restore .map and .js.gz
$backupRoot = Join-Path $parentDir "AndroidTool_debug_bak"
if (Test-Path $backupRoot) {
    Write-Host "Restoring debug files (.map, .js.gz) from $backupRoot..."
    Get-ChildItem -Path $backupRoot -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Substring($backupRoot.Length + 1)
        $targetPath = Join-Path $targetRoot $relativePath
        $targetDir = Split-Path $targetPath -Parent
        if (!(Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Move-Item -Path $_.FullName -Destination $targetPath -Force
    }
    Remove-Item -Recurse -Force $backupRoot
}
Write-Host "Post-release recovery complete!"
