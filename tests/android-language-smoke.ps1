param([Parameter(Mandatory = $true)][string]$Serial)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if ($Serial -notlike 'emulator-*') { throw 'Taaltests zijn uitsluitend voor een emulator.' }
$sdkPath = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$adbPath = Join-Path $sdkPath 'platform-tools\adb.exe'
$outputPath = Join-Path (Get-Location) 'app\build\language-smoke'
New-Item -ItemType Directory -Force $outputPath | Out-Null
function Adb {
    & $adbPath -s $Serial @args
    if ($LASTEXITCODE -ne 0) { throw "ADB mislukt: $args" }
}
function Ui {
    for ($retry = 0; $retry -lt 4; $retry++) {
        & $adbPath -s $Serial shell uiautomator dump /sdcard/jaarzon-language.xml | Out-Null
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep -Milliseconds 500
    }
    if ($LASTEXITCODE -ne 0) { throw 'Android toegankelijkheidsdump mislukt.' }
    Adb pull /sdcard/jaarzon-language.xml "$outputPath\screen.xml" | Out-Null
    [xml]$tree = Get-Content "$outputPath\screen.xml"
    return $tree
}
function Wait-Text([string]$pattern) {
    for ($i=0; $i -lt 16; $i++) {
        $tree=Ui
        if ($tree.SelectNodes('//node') | Where-Object { $_.text -match $pattern }) { return $tree }
        Start-Sleep -Milliseconds 500
    }
    throw "Android-tekst ontbreekt: $pattern"
}
function Tap($node) {
    if (-not $node) { throw 'Android-knop ontbreekt.' }
    $b=[regex]::Matches($node.bounds,'\d+') | ForEach-Object { [int]$_.Value }
    Adb shell input tap ([int](($b[0]+$b[2])/2)) ([int](($b[1]+$b[3])/2))
}
function Tap-Text([string]$text) {
    $tree=Wait-Text ('^'+[regex]::Escape($text)+'$')
    Tap ($tree.SelectNodes('//node') | Where-Object { $_.text -eq $text } | Select-Object -First 1)
}
function Start-App {
    Adb shell am force-stop nl.jaarzon
    Adb shell am start -W -n nl.jaarzon/.MainActivity | Out-Null
}
function Web([string]$expression) {
    $webPid=(Adb shell pidof nl.jaarzon).Trim()
    Adb forward tcp:9222 "localabstract:webview_devtools_remote_$webPid" | Out-Null
    $result=& node tests/webview-eval.js 9222 $expression
    if ($LASTEXITCODE -ne 0) { throw 'WebView niet gereed.' }
    return $result | ConvertFrom-Json
}
function Wait-Web([string]$pattern) {
    for ($i=0; $i -lt 25; $i++) {
        try {
            $text=Web 'document.body.innerText'
            if ($text -match $pattern) { return $text }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    throw "WebView-tekst ontbreekt: $pattern"
}
function Choose([string]$button,[string]$choice,[string]$expect) {
    $null=Web 'document.querySelector("[data-daylength-language]").click()'
    Tap-Text $choice
    $null=Wait-Web $expect
}
Adb install -r app/build/outputs/apk/debug/app-debug.apk
Adb shell pm clear nl.jaarzon
Adb shell cmd locale set-app-locales nl.jaarzon
Adb shell svc wifi disable
Adb shell svc data disable
Start-App
# Start with English as the test emulator's primary system language.
$null=Wait-Text '^Location for JaarZon$'
Tap-Text 'Not now'
$null=Wait-Web 'Location: Amsterdam, Netherlands \(default: no location permission\)'
$null=Wait-Web 'Today'
Write-Output 'PASS: Engelse systeemtaal, native uitleg en WebView-fallback zonder locatie.'
Choose 'Language' 'Nederlands' 'Vandaag'
if ((Web 'document.querySelector(".privacy-link").textContent') -ne 'Privacyverklaring') { throw 'Nederlandse privacylink ontbreekt na taalwisseling.' }
$null=Wait-Web 'Locatie: Amsterdam, Nederland'
$null=Web 'document.querySelector("[data-daylength-chart]").dispatchEvent(new KeyboardEvent("keydown",{key:"Home",bubbles:true}))'
$null=Wait-Web '1 januari \d{4}'
$duration=Web 'document.querySelector("[data-daylength-value]").textContent'
$curve=Web 'document.querySelector(".daylength-curve").getAttribute("points")'
$bar=Web 'document.querySelector("[data-daylength-bar]").innerHTML'
Choose 'Taal' 'English' '1 January \d{4}'
if ((Web 'document.querySelector(".privacy-link").textContent') -ne 'Privacy Policy') { throw 'Engelse privacylink ontbreekt na taalwisseling.' }
$null=Wait-Web 'Sunrise .*Sunset '
$englishDuration=Web 'document.querySelector("[data-daylength-value]").textContent'
if ($duration.Replace('u','h') -ne $englishDuration) { throw 'Daglengte veranderde door taalwisseling.' }
if ($curve -ne (Web 'document.querySelector(".daylength-curve").getAttribute("points")')) { throw 'Jaargrafiek veranderde door taalwisseling.' }
if ($bar -ne (Web 'document.querySelector("[data-daylength-bar]").innerHTML')) { throw 'Daglichtbalk veranderde door taalwisseling.' }
Write-Output 'PASS: handmatig Nederlands/English, datum, jaargrafiek en daglichtbalk behouden.'
Start-App
$null=Wait-Web 'Today'
$null=Wait-Web 'Time zone: Europe/Amsterdam'
Write-Output 'PASS: Engelse keuze blijft na procesherstart bewaard; tijdzone behouden.'
Choose 'Language' 'Automatic (system language)' 'Today'
$locales=(Adb shell cmd locale get-app-locales nl.jaarzon) -join ' '
if ($locales -notmatch '\[\]') { throw 'Automatisch heeft app-lokalen niet gewist.' }
Adb shell cmd locale set-app-locales nl.jaarzon --locales fr-FR
$null=Wait-Web 'Vandaag'
Write-Output 'PASS: onbekende Android-app-taal krijgt Nederlandse fallback.'
Adb shell cmd locale set-app-locales nl.jaarzon --locales nl
Start-Sleep -Seconds 2
$null=Wait-Web 'Vandaag'
Adb shell screencap -p /sdcard/jaarzon-language.png
Adb pull /sdcard/jaarzon-language.png "$outputPath\nederlands.png"
Adb shell cmd locale set-app-locales nl.jaarzon --locales en
$null=Wait-Web 'Today'
Adb shell screencap -p /sdcard/jaarzon-language.png
Adb pull /sdcard/jaarzon-language.png "$outputPath\english.png"
Adb shell pm grant nl.jaarzon android.permission.ACCESS_COARSE_LOCATION
Adb shell pm grant nl.jaarzon android.permission.ACCESS_FINE_LOCATION
Adb shell cmd location set-location-enabled true
Adb shell appops set com.android.shell android:mock_location allow
foreach ($provider in @('gps','network','fused')) {
    Adb shell cmd location providers add-test-provider $provider
    Adb shell cmd location providers set-test-provider-enabled $provider false
}
Adb shell cmd location providers set-test-provider-enabled gps true
Start-App
Adb shell cmd location providers set-test-provider-location gps --location '40.7128,-74.0060' --accuracy 10
$null=Wait-Web 'Time zone: America/New_York'
$curve=Web 'document.querySelector(".daylength-curve").getAttribute("points")'
$bar=Web 'document.querySelector("[data-daylength-bar]").innerHTML'
$golden=Web 'document.querySelector("[data-daylength-golden-morning]").textContent'
Choose 'Language' 'Nederlands' 'Tijdzone: America/New_York'
if ($curve -ne (Web 'document.querySelector(".daylength-curve").getAttribute("points")')) { throw 'Locatie/jaargrafiek veranderde door taalwisseling.' }
if ($bar -ne (Web 'document.querySelector("[data-daylength-bar]").innerHTML')) { throw 'Locatie/daglichtbalk veranderde door taalwisseling.' }
if ($golden -ne (Web 'document.querySelector("[data-daylength-golden-morning]").textContent')) { throw 'Golden Hour veranderde door taalwisseling.' }
Write-Output 'PASS: actuele Android-locatie New York behoudt tijdzone, grafiek, Golden Hour en balk bij taalwisseling.'
foreach ($provider in @('gps','network','fused')) { Adb shell cmd location providers remove-test-provider $provider }
Adb forward --remove tcp:9222
