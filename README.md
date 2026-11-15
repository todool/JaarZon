# JaarZon 2.0

Zelfstandige offline Android-app voor de daglengte in Puttershoek. Java met een
lokale WebView; geen runtime-dependencies, permissies, API's of services.
Ondersteunt Android 8.0 (API 26) en hoger met een actuele Android System WebView.

## Werking

Bij starten verschijnt het huidige kalenderjaar in Europe/Amsterdam. Raak de
grafiek aan of sleep horizontaal om een datum te selecteren. De rode lijn blijft
vandaag aangeven; de gestippelde lijn en stip volgen de selectie. De knop
**Vandaag** herstelt de selectie. Pijltoetsen en Home/End werken ook.
Daglengte, verschil met de vorige dag (minuten/seconden), richting van de
verandering, opkomst/ondergang en langste/kortste dag worden lokaal berekend.
De kalender ververst bij middernacht en bij terugkeer naar de app.

De NOAA/Meeus-berekening is overgenomen uit Cockpit `static/daylength.js`,
inclusief vier iteraties per zongebeurtenis, coördinaten 51.8°N / 4.57°E en
zonshoogte −0.833°. De functies voor astronomische berekeningen zijn ongewijzigd.
Datums worden in UTC doorgerekend; presentatie gebruikt Europe/Amsterdam,
inclusief zomer-/wintertijd. Vrije horizon en gemiddelde refractie zijn aannames;
dit is geen voorspelling van weersinvloed of lokale obstakels.

## Ontwikkelen en bouwen

- Android Studio Otter 2 (2025.2.2) of een compatibele nieuwere versie.
- Android Gradle Plugin 8.13.2, Gradle 8.13; geen dynamische versies.
- JDK 17 of 21; hier gebruikt: Android Studio JBR 21.0.8.
- Android SDK Platform 36 en Build Tools 35.0.0.
- Node.js 24 voor de dependencyvrije JavaScript-tests.

De combinatie volgt de officiële
[AGP 8.13-compatibiliteitstabel](https://developer.android.com/build/releases/agp-8-13-0-release-notes).

Open deze map in Android Studio en laat Gradle de wrapper gebruiken. Configureer
het lokale SDK-pad in het genegeerde `local.properties`, of stel ANDROID_HOME in.
Het buildsysteem kan bij de eerste build internet nodig hebben om gereedschappen
op te halen; de geïnstalleerde app heeft dat niet nodig.

```powershell
.\test.ps1
.\build.ps1
```

Met een volledig opgestarte testemulator:

```powershell
.\tests\android-smoke.ps1 -Serial emulator-5554
```

Deze test installeert de APK uitsluitend in een emulator, schakelt daar wifi en
mobiele data uit en controleert starten, aanraken, slepen, Vandaag en hervatten.
Screenshot en toegankelijkheidsboom staan daarna in `app/build/smoke/`.

`build.ps1` gebruikt JAVA_HOME of de JBR van Android Studio op de standaardlocatie.
De APK verschijnt in `app/build/outputs/apk/debug/app-debug.apk`; het lintrapport
in `app/build/reports/lint-results-debug.html`. Debugondertekening is uitsluitend
voor lokaal testen. Sleutels en buildoutput horen niet in Git.

## Samsung installeren en controleren

Kopieer de APK naar de telefoon, open hem via Mijn bestanden en sta desgevraagd
installatie vanuit die bron toe. Samsung Auto Blocker kan installatie buiten een
appwinkel blokkeren; de precieze instelling hangt af van de One UI-versie.
Een alternatief bij ingeschakelde USB-foutopsporing en geautoriseerde computer:

```powershell
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Controleer in vliegtuigstand: start, volledige grafiek in portretstand,
datumselectie en slepen, vaste vandaaglijn, Vandaag-knop en opnieuw openen na
appwisselen. Controleer ook grotere systeemtekst en schermrotatie. Node-tests
dekken de berekening en DOM-logica; ze vervangen geen echte WebView-/toesteltest.

## Uitgevoerde verificatie — 15 november 2026

- `test.ps1`: vier tests geslaagd, inclusief equinoxen/zonnewendes,
  365/366 dagen, eeuwjaren, tijdzone/DST, jaarwisseling en selectie/Vandaag.
- De astronomische kern is tekstueel vergeleken met Cockpit en is exact gelijk.
- `build.ps1`: debug-APK gebouwd; lint geslaagd. Een eerste API-26-stijlfout is
  hersteld met een API-27-resource. Na volledige herhaling resteert één
  lintwaarschuwing over een nieuwere Gradle-versie; er zijn geen lintfouten.
  Gradle/Java melden tevens deprecations; de vastgelegde build slaagt.
- `tests/android-smoke.ps1 -Serial emulator-5554`: geslaagd op de Pixel 7-emulator
  met Android 16/API 36 en wifi/mobiele data uit. Starten, aanraken, horizontaal
  slepen, Vandaag en hervatten zijn gecontroleerd. De uiteindelijke screenshot
  is visueel gecontroleerd, inclusief statusbalk en de volledige jaargrafiek.
- De APK heeft volgens `aapt dump permissions` geen Android-permissies.
- Niet geverifieerd op een fysieke Samsung of op Android 8.0; grotere
  systeemtekst en schermrotatie zijn nog handmatige toestelcontroles.

## WebView-beperking

Er is geen INTERNET-permissie. De Java-laag beantwoordt alleen drie exacte lokale
resource-URL's onder een virtuele HTTPS-origin; er vindt geen serververbinding
plaats. Overige requests en navigatie worden geweigerd. Bestands-/contenttoegang,
cookies, DOM-opslag, geolocatie en gemengde inhoud zijn uitgeschakeld. Er is geen
JavaScript-bridge. Een Content Security Policy beperkt scripts en stijlen tot de
eigen origin en blokkeert netwerkverbindingen.
