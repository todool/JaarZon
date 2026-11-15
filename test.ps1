$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
& node --check app/src/main/assets/daylength.js
if ($LASTEXITCODE -ne 0) { throw 'JavaScript-syntaxcontrole mislukt.' }
& node --test tests/daylength.test.js
if ($LASTEXITCODE -ne 0) { throw 'Daglengtetests mislukt.' }
& git diff --check
if ($LASTEXITCODE -ne 0) { throw 'Git-whitespacecontrole mislukt.' }
