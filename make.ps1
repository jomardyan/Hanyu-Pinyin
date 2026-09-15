param(
    [ValidateSet('help','doctor','setup','install','build','dev','run','run-chrome','run-edge','run-chromium','test','test-watch','test-browser','test-ui','test-backend','typecheck','assets','assets-validate','check','package','release','ci','fixture','release-files','clean','clean-all')]
    [string]$Target = 'help',
    [ValidateSet('chrome','edge','chromium')]
    [string]$Browser = 'chromium'
)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20 or newer is required' }
Push-Location $PSScriptRoot
try {
    & node scripts/tasks.mjs $Target $Browser
    $code = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $code
