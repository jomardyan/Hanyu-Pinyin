param(
    [ValidateSet('help','doctor','setup','install','build','dev','run','run-chrome','run-edge','run-chromium','test','test-watch','test-browser','test-ui','test-backend','typecheck','assets','assets-validate','check','package','release','ci','fixture','release-files','clean','clean-all')]
    [string]$Target = 'help',
    [ValidateSet('chrome','edge','chromium')]
    [string]$Browser = 'chromium'
)
$ErrorActionPreference = 'Stop'

if ($Target -eq 'help') {
    Write-Host 'Hanyu Pinyin Reader tasks'
    Write-Host '  setup          Download portable Node.js if needed and install npm packages'
    Write-Host '  build          Build the extension in dist (automatically sets up tools)'
    Write-Host '  run            Build and open a dedicated browser profile'
    Write-Host '  check          Run type checks, tests, and build validation'
    Write-Host '  release        Validate and package a store release'
    Write-Host '  doctor         Report the Node.js and npm versions'
    Write-Host '  clean          Remove generated build and release files'
    Write-Host '  clean-all      Also remove dependencies and test profiles'
    Write-Host '  Other targets: install, dev, run-chrome, run-edge, run-chromium, test,'
    Write-Host '    test-watch, test-browser, test-ui, test-backend, typecheck, assets,'
    Write-Host '    assets-validate, package, ci, fixture, release-files'
    Write-Host '  Example: .\make.ps1 build'
    exit 0
}

# The portable archive includes npm. It stays in this repository and does not
# change the machine-wide PATH or require administrator rights.
$nodeVersion = '22.23.2'
$hashes = @{
    x64   = '1177b4137ba5adaa56354ae40f1080c7450e8ae09cecb47da459d1c52ac99f97'
    x86   = '725c9e2bdd1c2016b41c995a81f4fa36ce4e2ee565b7455d8f889182727df647'
    arm64 = 'fec025a6da31757e3b6af84c5a1628e9d38442ca99a2161091d78f2fcfa35ef3'
}

function Get-UsableSystemNode {
    $candidate = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $candidate) { return $null }
    $version = & $candidate.Source --version 2>$null
    if ($LASTEXITCODE -ne 0 -or $version -notmatch '^v(\d+)\.') { return $null }
    if ([int]$Matches[1] -lt 20) { return $null }
    if (-not (Get-Command npm.cmd -CommandType Application -ErrorAction SilentlyContinue)) { return $null }
    return $candidate.Source
}

function Install-PortableNode {
    switch ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()) {
        'X64'   { $arch = 'x64' }
        'X86'   { $arch = 'x86' }
        'Arm64' { $arch = 'arm64' }
        default { throw 'This Windows architecture is not supported by the portable Node.js bootstrap.' }
    }
    $toolsDir = Join-Path $PSScriptRoot '.tools'
    $folder = "node-v$nodeVersion-win-$arch"
    $destination = Join-Path $toolsDir $folder
    $nodeExe = Join-Path $destination 'node.exe'
    $npmCmd = Join-Path $destination 'npm.cmd'
    # Reject junctions and verify the only recursive-delete targets are direct
    # children of this repository's .tools directory.
    $expectedToolsDir = [IO.Path]::Combine([IO.Path]::GetFullPath($PSScriptRoot), '.tools')
    if (-not [IO.Path]::GetFullPath($toolsDir).Equals($expectedToolsDir, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Unexpected portable tools path.'
    }
    if ((Test-Path $toolsDir) -and ((Get-Item -LiteralPath $toolsDir -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'The portable tools directory must not be a junction or symbolic link.'
    }
    if (-not [IO.Path]::GetFullPath($destination).Equals([IO.Path]::Combine($expectedToolsDir, $folder), [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Unexpected portable Node.js path.'
    }
    if ((Test-Path $destination) -and ((Get-Item -LiteralPath $destination -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'The portable Node.js directory must not be a junction or symbolic link.'
    }
    if ((Test-Path $nodeExe) -and (Test-Path $npmCmd)) { return $nodeExe }
    New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
    $stage = Join-Path $toolsDir ([guid]::NewGuid().ToString('N'))
    $archive = Join-Path $stage "$folder.zip"
    New-Item -ItemType Directory -Path $stage | Out-Null
    try {
        $url = "https://nodejs.org/dist/v$nodeVersion/$folder.zip"
        Write-Host "Downloading portable Node.js v$nodeVersion ($arch)..."
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $url -OutFile $archive -UseBasicParsing
        $actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
        if ($actualHash -ine $hashes[$arch]) { throw 'The downloaded Node.js archive failed SHA-256 verification.' }
        Expand-Archive -LiteralPath $archive -DestinationPath $stage
        $extracted = Join-Path $stage $folder
        if (-not ((Test-Path (Join-Path $extracted 'node.exe')) -and (Test-Path (Join-Path $extracted 'npm.cmd')))) {
            throw 'The Node.js archive is missing node.exe or npm.cmd.'
        }
        if (Test-Path $destination) {
            Remove-Item -LiteralPath $destination -Recurse -Force
        }
        Move-Item -LiteralPath $extracted -Destination $destination
        return $nodeExe
    } finally {
        # The stage is a fresh GUID directory created directly under .tools.
        if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
    }
}

$nodeExe = Get-UsableSystemNode
if (-not $nodeExe) { $nodeExe = Install-PortableNode }
$nodeDir = Split-Path -Parent $nodeExe
$env:PATH = "$nodeDir;$env:PATH"

Push-Location $PSScriptRoot
try {
    # Build-related commands need npm packages even on the first invocation.
    $needsPackages = $Target -notin @('doctor','setup','install','ci','clean','clean-all','release-files','fixture')
    if ($needsPackages -and -not (Test-Path 'node_modules/.bin/esbuild.cmd')) {
        Write-Host 'Installing npm packages...'
        & (Join-Path $nodeDir 'npm.cmd') install --no-package-lock
        if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }
    }
    & $nodeExe scripts/tasks.mjs $Target --browser $Browser
    $code = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $code
