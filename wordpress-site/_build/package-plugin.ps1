$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'ozmaksan'
$outFull = Join-Path $root 'ozmaksan-wp.zip'
$outLite = Join-Path $root 'ozmaksan-wp-lite.zip'

if (-not (Test-Path (Join-Path $source 'ozmaksan.php'))) {
    throw 'ozmaksan/ozmaksan.php missing'
}

function Write-PluginZip($dest, $includeAssets) {
    if (Test-Path $dest) { Remove-Item $dest -Force }
    $zip = [System.IO.Compression.ZipFile]::Open($dest, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        $base = (Resolve-Path $source).Path
        Get-ChildItem -Path $source -Recurse -File | ForEach-Object {
            $rel = $_.FullName.Substring($base.Length + 1) -replace '\\', '/'
            if (-not $includeAssets -and $rel -like 'assets/*') { return }
            $entry = 'ozmaksan/' + $rel
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry)
        }
    } finally {
        $zip.Dispose()
    }
    $sizeMb = [math]::Round((Get-Item $dest).Length / 1MB, 2)
    Write-Host "OK $dest - $sizeMb MB"
}

Write-PluginZip $outFull $true
Write-PluginZip $outLite $false

# Eski isimle de kopyala (geriye uyumluluk)
Copy-Item $outFull (Join-Path $root 'ozmaksan-assets.zip') -Force
