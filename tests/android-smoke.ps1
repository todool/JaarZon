param([Parameter(Mandatory = $true)][string]$Serial)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if ($Serial -notlike 'emulator-*') { throw 'Deze offline-smoketest is uitsluitend voor een emulator.' }
$sdkPath = $env:ANDROID_HOME
if (-not $sdkPath) { $sdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$adbPath = Join-Path $sdkPath 'platform-tools\adb.exe'
function Invoke-Adb {
    & $adbPath -s $Serial @args
    if ($LASTEXITCODE -ne 0) { throw "ADB mislukt: $args" }
}
$outputPath = Join-Path (Get-Location) 'app\build\smoke'
New-Item -ItemType Directory -Force $outputPath | Out-Null
function Read-Ui {
    Invoke-Adb shell uiautomator dump /sdcard/jaarzon-smoke.xml | Out-Null
    Invoke-Adb pull /sdcard/jaarzon-smoke.xml "$outputPath\screen.xml" | Out-Null
    [xml]$tree = Get-Content -LiteralPath "$outputPath\screen.xml"
    return $tree
}
function Require-Text($tree, [string]$text) {
    $found = @($tree.SelectNodes('//node') | Where-Object { $_.text -eq $text })
    if (-not $found.Count) { throw "Tekst ontbreekt in Android WebView: $text" }
    return $found[0]
}
function Bounds($node) {
    $values = [regex]::Matches($node.bounds, '\d+') | ForEach-Object { [int]$_.Value }
    return $values
}
Invoke-Adb install -r app/build/outputs/apk/debug/app-debug.apk
Invoke-Adb shell svc wifi disable
Invoke-Adb shell svc data disable
Invoke-Adb shell am force-stop nl.jaarzon
Invoke-Adb shell am start -W -n nl.jaarzon/.MainActivity
$tree = Read-Ui
for ($attempt = 0; $attempt -lt 5 -and -not ($tree.SelectNodes('//node') | Where-Object { $_.text -eq 'Vandaag' }); $attempt++) {
    Start-Sleep -Milliseconds 500
    $tree = Read-Ui
}
$date = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTimeOffset]::Now, 'W. Europe Standard Time')
$culture = [Globalization.CultureInfo]::GetCultureInfo('nl-NL')
$todayText = $date.ToString('d MMMM yyyy', $culture)
$year = $date.Year
Require-Text $tree $todayText | Out-Null
$button = Require-Text $tree 'Vandaag'
$buttonBounds = Bounds $button
$chart = $tree.SelectNodes('//node') | Where-Object { $_.text -like "Daglengte $year. Rode lijn*" } | Select-Object -First 1
if (-not $chart) { throw 'Jaargrafiek ontbreekt.' }
$chartBounds = Bounds $chart
$left = $chartBounds[0]
$top = $chartBounds[1]
$width = $chartBounds[2] - $left
$height = $chartBounds[3] - $top
$y = [int]($top + $height / 2)
$januaryX = $left + 10
Invoke-Adb shell input tap $januaryX $y
$tree = Read-Ui
Require-Text $tree "1 januari $year" | Out-Null
$decemberX = $left + $width - 2
# Start inside the plot, away from Android's system back-gesture edge.
$middleX = [int]($left + $width / 2)
Invoke-Adb shell input swipe $middleX $y $decemberX $y 800
$tree = Read-Ui
# Android may deliver the last move before the finger-up endpoint. Verify the
# month reached by dragging, then select the exact year-end with a tap.
if (-not ($tree.SelectNodes('//node') | Where-Object { $_.text -match "^\d+ december $year$" })) {
    throw 'Slepen naar december heeft de geselecteerde datum niet bijgewerkt.'
}
Invoke-Adb shell input tap $decemberX $y
$tree = Read-Ui
Require-Text $tree "31 december $year" | Out-Null
Require-Text $tree 'De dagen worden langer' | Out-Null
Invoke-Adb shell input tap ([int](($buttonBounds[0] + $buttonBounds[2]) / 2)) ([int](($buttonBounds[1] + $buttonBounds[3]) / 2))
$tree = Read-Ui
Require-Text $tree $todayText | Out-Null
Invoke-Adb shell input keyevent KEYCODE_HOME
Invoke-Adb shell am start -W -n nl.jaarzon/.MainActivity
$tree = Read-Ui
Require-Text $tree $todayText | Out-Null
Invoke-Adb shell screencap -p /sdcard/jaarzon-smoke.png
Invoke-Adb pull /sdcard/jaarzon-smoke.png "$outputPath\jaarzon.png"
Invoke-Adb shell input swipe 540 1900 540 1100 600
$tree = Read-Ui
Require-Text $tree 'Golden Hour' | Out-Null
$isoDate = $date.ToString('yyyy-MM-dd')
$expectedGolden = & node -e "const m=require('./app/src/main/assets/daylength.js');const g=m.goldenHour(Date.parse(process.argv[1]));console.log(JSON.stringify([m.goldenRange(g.morningStart,g.morningEnd),m.goldenRange(g.eveningStart,g.eveningEnd)]));" $isoDate
if ($LASTEXITCODE -ne 0) { throw 'Golden Hour-referentieberekening mislukt.' }
$screenText = ($tree.SelectNodes('//node') | ForEach-Object { $_.text }) -join ' '
foreach ($range in ($expectedGolden | ConvertFrom-Json)) {
    if (-not $screenText.Contains($range)) { throw "Golden Hour-tijd ontbreekt in WebView: $range" }
}
Invoke-Adb shell screencap -p /sdcard/jaarzon-golden.png
Invoke-Adb pull /sdcard/jaarzon-golden.png "$outputPath\golden-hour.png"
Write-Output 'GESLAAGD: offline starten, datum aanraken, slepen, Vandaag, hervatten en Golden Hour in echte Android WebView.'
