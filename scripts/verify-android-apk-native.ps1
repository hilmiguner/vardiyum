# Check a completed EAS Android APK before installing it on physical phones.
# Read-only: no Android connection, extraction, signing changes or DB writes.
param(
    [Parameter(Mandatory = $true)]
    [string]$ApkPath
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $ApkPath -PathType Leaf)) {
    throw "APK_NOT_FOUND"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$absolutePath = (Resolve-Path -LiteralPath $ApkPath).Path
$archive = [System.IO.Compression.ZipFile]::OpenRead($absolutePath)
$failed = $false

try {
    $paths = [System.Collections.Generic.HashSet[string]]::new(
        [System.StringComparer]::Ordinal
    )
    foreach ($entry in $archive.Entries) {
        [void]$paths.Add($entry.FullName)
    }

    Write-Host "VARDIYUM_NATIVE_SQLITE_ABI_CHECK"
    Write-Host "APK_SHA256=$((Get-FileHash -LiteralPath $absolutePath -Algorithm SHA256).Hash)"

    # Both ARM ABI variants must be usable when the app ships React Native
    # native libraries for those variants (the current preview ships both).
    foreach ($abi in @("armeabi-v7a", "arm64-v8a")) {
        $reactNative = $paths.Contains("lib/$abi/libreactnative.so")
        $sqlite = $paths.Contains("lib/$abi/libexpo-sqlite.so")
        Write-Host "$abi REACT_NATIVE=$reactNative SQLITE=$sqlite"
        if (-not $reactNative -or -not $sqlite) {
            $failed = $true
        }
    }
}
finally {
    $archive.Dispose()
}

if ($failed) {
    Write-Error "NATIVE_SQLITE_ABI_INCOMPLETE"
    exit 1
}

Write-Host "NATIVE_SQLITE_ABI=PASS"
