param(
    [ValidateSet('help','doctor','setup','install','clean','clean-all','build','dev','run','run-chrome','run-edge','test','test-watch','typecheck','assets','assets-validate','check','package','release','ci','fixture','release-files')]
    [string]$Target = 'help',
    [ValidateSet('chrome','edge')]
    [string]$Browser = 'chrome'
)

$ErrorActionPreference = 'Stop'

function Invoke-Step {
    param([scriptblock]$Command)
    & $Command
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

function Show-Help {
    @'
Hanyu Pinyin Reader build commands

  .\make.ps1 setup             Check tools and install dependencies
  .\make.ps1 install           Install npm dependencies
  .\make.ps1 doctor            Print required tool versions
  .\make.ps1 build             Build production extension into dist
  .\make.ps1 dev               Watch source files and rebuild
  .\make.ps1 run               Build and launch Chrome by default
  .\make.ps1 run -Browser edge Build and launch Microsoft Edge
  .\make.ps1 run-chrome        Build and launch Chrome
  .\make.ps1 run-edge          Build and launch Microsoft Edge
  .\make.ps1 test              Run automated tests
  .\make.ps1 test-watch        Run tests in watch mode
  .\make.ps1 typecheck         Run TypeScript validation
  .\make.ps1 assets            Generate store graphics and extension icons
  .\make.ps1 assets-validate   Validate Chrome Web Store assets
  .\make.ps1 check             Typecheck, test, build, and validate assets
  .\make.ps1 package           Build and package ZIP files without repeating tests
  .\make.ps1 release           Full validated Chrome Web Store release
  .\make.ps1 ci                Clean install plus full release flow
  .\make.ps1 fixture           Serve local test fixture on port 8080
  .\make.ps1 release-files     List generated release files
  .\make.ps1 clean             Remove generated build and release output
  .\make.ps1 clean-all         Also remove node_modules and browser test profiles
'@
}

function Test-Tools {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required' }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is required' }
    node --version
    npm --version
    $major = [int]((node -p "process.versions.node.split('.')[0]").Trim())
    if ($major -lt 20) { throw 'Node.js 20 or newer is required' }
}

switch ($Target) {
    'help' { Show-Help }
    'doctor' { Test-Tools }
    'setup' { Test-Tools; Invoke-Step { npm install } }
    'install' { Invoke-Step { npm install } }
    'clean' {
        Invoke-Step { npm run clean }
        Remove-Item -Recurse -Force release -ErrorAction SilentlyContinue
    }
    'clean-all' {
        Invoke-Step { npm run clean }
        Remove-Item -Recurse -Force release,node_modules,.browser-profile -ErrorAction SilentlyContinue
    }
    'build' { Invoke-Step { npm run build } }
    'dev' { Invoke-Step { npm run dev } }
    'run' {
        Invoke-Step { npm run build }
        Invoke-Step { node scripts/run-extension.mjs --browser $Browser --dist dist --profile ".browser-profile/$Browser" }
    }
    'run-chrome' {
        Invoke-Step { npm run build }
        Invoke-Step { node scripts/run-extension.mjs --browser chrome --dist dist --profile '.browser-profile/chrome' }
    }
    'run-edge' {
        Invoke-Step { npm run build }
        Invoke-Step { node scripts/run-extension.mjs --browser edge --dist dist --profile '.browser-profile/edge' }
    }
    'test' { Invoke-Step { npm test } }
    'test-watch' { Invoke-Step { npm run test:watch } }
    'typecheck' { Invoke-Step { npm exec tsc -- --noEmit } }
    'assets' { Invoke-Step { npm run store:generate } }
    'assets-validate' { Invoke-Step { npm run store:validate } }
    'check' { Invoke-Step { npm run check } }
    'package' {
        Invoke-Step { npm run build }
        Invoke-Step { npm run store:validate }
        Invoke-Step { node scripts/package-release.mjs }
    }
    'release' { Invoke-Step { npm run store:release } }
    'ci' {
        Test-Tools
        Invoke-Step { npm install }
        Invoke-Step { npm run store:release }
    }
    'fixture' { Invoke-Step { node scripts/serve-fixture.mjs } }
    'release-files' {
        if (Test-Path release) {
            Get-ChildItem release -File | Sort-Object Name | ForEach-Object { $_.FullName }
        } else {
            Write-Host 'No release directory. Run .\make.ps1 release first.'
        }
    }
}
