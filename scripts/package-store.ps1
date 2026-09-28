$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Extension build failed.' }

    $manifest = Get-Content -LiteralPath 'dist/manifest.json' -Raw | ConvertFrom-Json
    $releaseId = Get-Date -Format 'yyyyMMdd-HHmmss'
    $stagePath = Join-Path $projectRoot "build/store-$releaseId"
    New-Item -ItemType Directory -Path $stagePath | Out-Null
    $files = @(
        'manifest.json',
        'background/serviceWorker.js',
        'content/buttonStyles.js',
        'content/buttonInjection.js',
        'content/youtubeDetection.js',
        'popup/popupUI.js',
        'popup/popup.html',
        'popup/popup.css',
        'logo/logo-16.png',
        'logo/logo-48.png',
        'logo/logo-128.png'
    )
    foreach ($file in $files) {
        $destination = Join-Path $stagePath $file
        New-Item -ItemType Directory -Force -Path (Split-Path $destination -Parent) | Out-Null
        Copy-Item -LiteralPath (Join-Path 'dist' $file) -Destination $destination
    }
    $archivePath = Join-Path $projectRoot "build/youtube-glance-$($manifest.version)-$releaseId.zip"
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::Open($archivePath, 'Create')
    try {
        foreach ($file in $files) {
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive, (Join-Path $stagePath $file), $file,
                [System.IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
    } finally {
        $archive.Dispose()
    }
    Write-Output "Store package: $archivePath"
    Get-FileHash -LiteralPath $archivePath -Algorithm SHA256
} finally {
    Pop-Location
}
