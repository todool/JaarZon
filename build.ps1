$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not $env:JAVA_HOME) {
    $studioJdk = 'C:\Program Files\Android\Android Studio\jbr'
    if (Test-Path -LiteralPath "$studioJdk\bin\java.exe") { $env:JAVA_HOME = $studioJdk }
}
& .\gradlew.bat --no-daemon :app:assembleDebug :app:lintDebug
if ($LASTEXITCODE -ne 0) { throw "Android build/lint mislukt (exitcode $LASTEXITCODE)." }
