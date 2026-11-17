$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$testJdk = $env:JAVA_HOME
if (-not $testJdk) { $testJdk = 'C:\Program Files\Android\Android Studio\jbr' }
New-Item -ItemType Directory -Force app/build/location-policy | Out-Null
& "$testJdk\bin\javac.exe" --release 17 -d app/build/location-policy app/src/main/java/nl/jaarzon/LanguagePolicy.java app/src/main/java/nl/jaarzon/NetherlandsBoundary.java app/src/main/java/nl/jaarzon/LocationPolicy.java app/src/main/java/nl/jaarzon/PlaceLookup.java tests/LocationPolicyTest.java
if ($LASTEXITCODE -ne 0) { throw 'Compileren LocationPolicy-tests mislukt.' }
& "$testJdk\bin\java.exe" -cp app/build/location-policy LocationPolicyTest
if ($LASTEXITCODE -ne 0) { throw 'LocationPolicy-tests mislukt.' }
