$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
& node --check app/src/main/assets/daylength.js
if ($LASTEXITCODE -ne 0) { throw 'JavaScript-syntaxcontrole mislukt.' }
& node --check app/src/main/assets/i18n.js
if ($LASTEXITCODE -ne 0) { throw "Vertalingen-syntaxcontrole mislukt." }
& node --test tests/daylength.test.js tests/i18n.test.js
if ($LASTEXITCODE -ne 0) { throw 'Daglengtetests mislukt.' }
& git diff --check
if ($LASTEXITCODE -ne 0) { throw 'Git-whitespacecontrole mislukt.' }
& .\tests\location-policy.ps1
if ($LASTEXITCODE -ne 0) { throw 'Android-locatiebeleidtests mislukt.' }
