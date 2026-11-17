param([Parameter(Mandatory = $true)][string]$Serial)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if ($Serial -notlike 'emulator-*') { throw 'Locatietests zijn uitsluitend voor een emulator.' }
$sdkPath = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$adbPath = Join-Path $sdkPath 'platform-tools\adb.exe'
$outputPath = Join-Path (Get-Location) 'app\build\location-smoke'
New-Item -ItemType Directory -Force $outputPath | Out-Null
function Adb {
    & $adbPath -s $Serial @args
    if ($LASTEXITCODE -ne 0) { throw "ADB mislukt: $args" }
}
function Ui {
    for ($retry = 0; $retry -lt 3; $retry++) {
        & $adbPath -s $Serial shell uiautomator dump /sdcard/jaarzon-location.xml | Out-Null
        if ($LASTEXITCODE -eq 0) { break }
        if ($retry -eq 2) { throw 'Android toegankelijkheidsdump mislukt.' }
        Start-Sleep -Milliseconds 500
    }
    Adb pull /sdcard/jaarzon-location.xml "$outputPath\screen.xml" | Out-Null
    [xml]$tree = Get-Content "$outputPath\screen.xml"
    return $tree
}
function Wait-Text([string]$pattern) {
    for ($i = 0; $i -lt 7; $i++) {
        $tree = Ui
        if ($tree.SelectNodes('//node') | Where-Object { $_.text -match $pattern }) { return $tree }
        Start-Sleep -Milliseconds 500
    }
    throw "Android-tekst ontbreekt: $pattern"
}
function Start-App {
    Adb shell am force-stop nl.jaarzon
    Adb shell am start -W -n nl.jaarzon/.MainActivity | Out-Null
}
function Tap-Node($node) {
    if (-not $node) { throw 'Android-knop ontbreekt.' }
    $b = [regex]::Matches($node.bounds, '\d+') | ForEach-Object { [int]$_.Value }
    Adb shell input tap ([int](($b[0]+$b[2])/2)) ([int](($b[1]+$b[3])/2))
}
function Tap-Text([string]$text) {
    $tree = Wait-Text ('^' + [regex]::Escape($text) + '$')
    Tap-Node ($tree.SelectNodes('//node') | Where-Object { $_.text -eq $text } | Select-Object -First 1)
}
function Tap-Permission([string]$id) {
    $null = Wait-Text 'Don.t allow|Niet toestaan'
    $tree = Ui
    Tap-Node ($tree.SelectNodes('//node') | Where-Object { $_.'resource-id' -like "*$id" } | Select-Object -First 1)
}
Adb install -r app/build/outputs/apk/debug/app-debug.apk
Adb shell am force-stop nl.jaarzon
Adb shell pm clear nl.jaarzon
if ([int](Adb shell getprop ro.build.version.sdk) -ge 33) { Adb shell cmd locale set-app-locales nl.jaarzon --locales nl }
Adb shell svc wifi disable
Adb shell svc data disable
Adb shell cmd location set-location-enabled false
Start-App
$null = Wait-Text 'Locatie voor JaarZon'
Tap-Text 'Doorgaan'
Tap-Permission 'permission_deny_button'
$null = Wait-Text 'Amsterdam.*standaard.*geen locatietoestemming'
Start-App
$null = Wait-Text 'Amsterdam.*standaard.*geen locatietoestemming'
Write-Output 'PASS: eerste uitleg, Android-toestemming weigeren, Amsterdam en geen herhaalde vraag.'

Adb shell pm clear nl.jaarzon
if ([int](Adb shell getprop ro.build.version.sdk) -ge 33) { Adb shell cmd locale set-app-locales nl.jaarzon --locales nl }
Start-App
Tap-Text 'Doorgaan'
Tap-Permission 'permission_allow_foreground_only_button'
$null = Wait-Text 'Amsterdam.*standaard.*uitgeschakeld'
Write-Output 'PASS: toestemming verlenen en locatie uitgeschakeld.'
Adb shell cmd location set-location-enabled true
Adb shell appops set com.android.shell android:mock_location allow
foreach ($provider in @('gps','network','fused')) {
    Adb shell cmd location providers add-test-provider $provider
    Adb shell cmd location providers set-test-provider-enabled $provider false
}
Adb shell cmd location providers set-test-provider-enabled gps true
Start-App
Adb shell cmd location providers set-test-provider-location gps --location '51.5074,-0.1278' --accuracy 10
$null = Wait-Text 'Europe/London'
Write-Output 'PASS: automatische precieze locatie en geografische tijdzone Verenigd Koninkrijk.'
Start-App
Adb shell cmd location providers set-test-provider-location gps --location '50.8514,5.6910' --accuracy 5000
$null = Wait-Text 'Europe/Amsterdam'
Write-Output 'PASS: Maastricht met 5 km onzekerheid krijgt Europe/Amsterdam, niet UTC.'
Start-App
Adb shell cmd location providers set-test-provider-location gps --location '40.7128,-74.0060' --accuracy 10
$null = Wait-Text 'America/New_York'
Write-Output 'PASS: volgende start vernieuwt automatisch; tijdzone buiten Europa.'
Adb shell cmd location providers remove-test-provider gps
Adb shell cmd location providers add-test-provider gps
Adb shell cmd location providers set-test-provider-enabled gps true
Start-App
$null = Wait-Text 'laatst bekend.*geen recente locatie binnen 10 seconden'
$null = Wait-Text 'America/New_York'
Write-Output 'PASS: geen fix -> bewaarde locatie met expliciet laatst-bekend-label en timestamp.'
Adb shell pm revoke nl.jaarzon android.permission.ACCESS_FINE_LOCATION
Adb shell pm revoke nl.jaarzon android.permission.ACCESS_COARSE_LOCATION
Start-App
$null = Wait-Text 'laatst bekend.*geen locatietoestemming'
Write-Output 'PASS: ingetrokken/verlopen toestemming -> opgeslagen locatie, geen nieuwe toestemmingsvraag.'
Adb shell pm grant nl.jaarzon android.permission.ACCESS_COARSE_LOCATION
Adb shell cmd location providers set-test-provider-enabled gps false
Adb shell cmd location providers set-test-provider-enabled network true
Start-App
Adb shell cmd location providers set-test-provider-location network --location '52.3676,4.9041' --accuracy 2000
$null = Wait-Text 'Europe/Amsterdam'
Write-Output 'PASS: globale locatie wordt automatisch bepaald met Nederlandse tijdzone.'
Adb shell input keyevent KEYCODE_HOME
$active = ((Adb shell dumpsys location) -join "
") -split 'Historical Aggregate Location Provider Data:', 2
if ($active[0] -match 'nl\.jaarzon') { throw 'Actieve achtergrondaanvraag gevonden.' }
Write-Output 'PASS: geen achtergrondlocatie.'

Adb shell pm clear nl.jaarzon
if ([int](Adb shell getprop ro.build.version.sdk) -ge 33) { Adb shell cmd locale set-app-locales nl.jaarzon --locales nl }
Start-App
Tap-Text 'Doorgaan'
Tap-Permission 'permission_allow_one_time_button'
$flags = (Adb shell dumpsys package nl.jaarzon) -join "
"
if ($flags -notmatch 'ONE_TIME') { throw 'Eenmalige Android-toestemming niet ingesteld.' }
Adb shell pm revoke nl.jaarzon android.permission.ACCESS_FINE_LOCATION
Adb shell pm revoke nl.jaarzon android.permission.ACCESS_COARSE_LOCATION
Start-App
$null = Wait-Text 'Amsterdam.*standaard.*geen locatietoestemming'
Write-Output 'PASS: eenmalige toestemming en vervallen toestemming zonder herhaalde vraag.'

Adb shell cmd location providers remove-test-provider network
Adb shell cmd location providers add-test-provider network
Adb shell cmd location providers set-test-provider-enabled network true
Adb shell pm grant nl.jaarzon android.permission.ACCESS_COARSE_LOCATION
Start-App
$null = Wait-Text 'Amsterdam.*standaard.*geen recente locatie binnen 10 seconden'
Write-Output 'PASS: zonder bewaarde locatie en zonder fix -> Amsterdam.'
foreach ($provider in @('gps','network','fused')) { Adb shell cmd location providers remove-test-provider $provider }
Adb shell pm revoke nl.jaarzon android.permission.ACCESS_COARSE_LOCATION
Start-App
$null = Wait-Text 'Amsterdam.*standaard'
Adb shell screencap -p /sdcard/jaarzon-location.png
Adb pull /sdcard/jaarzon-location.png "$outputPath\location.png"
