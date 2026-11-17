# JaarZon 2.7 — Internationalisering

Zelfstandige Android-app met offline astronomische berekeningen voor de gevonden
locatie (standaard Amsterdam). Java met een
lokale WebView; geen externe runtime-dependencies, API's of services. Alleen
foreground coarse/fine-locatiepermissies; geen internet- of achtergrondpermissie.
Ondersteunt Android 8.0 (API 26) en hoger met een actuele Android System WebView.

## Werking

Bij starten verschijnt het huidige kalenderjaar in de expliciet getoonde tijdzone. Raak de
grafiek aan of sleep horizontaal om een datum te selecteren. De rode lijn blijft
vandaag aangeven; de gestippelde lijn en stip volgen de selectie. De knop
**Vandaag** herstelt de selectie. Pijltoetsen en Home/End werken ook.
Daglengte, verschil met de vorige dag (minuten/seconden), richting van de
verandering, opkomst/ondergang en langste/kortste dag worden lokaal berekend.
De kalender ververst bij middernacht en bij terugkeer naar de app.

Direct onder de jaargrafiek staat een niet-interactieve 24-uursbalk: donkerblauw
voor nacht, zachtgeel voor daglicht en oranje voor de volledige Golden Hour,
ook vóór zonsopkomst en na zonsondergang. De balk is 14 pixels hoog, met kleine
kloktijden en legenda (circa 46 pixels samen). Hij volgt de datumselectie en
Vandaag. Posities gebruiken de getoonde kloktijd op een vaste 00–24-schaal,
ook bij zomer-/wintertijd. Ontbrekende intervallen worden niet ingetekend;
bij ontbrekende opkomst/ondergang is de achtergrond grijs (onbekend).

Een dun streepje met lichte contrastrand geeft de actuele kloktijd aan. Het
steekt drie pixels boven de balk uit en neemt geen extra ruimte in. Alleen
zichtbaar bij vandaag in de getoonde tijdzone (ook expliciet UTC). Het ververst
op elke minuutgrens en na selectie, Vandaag of een tijdzonewissel. Bij pauzeren
of verbergen vervallen de JavaScript-timers; Android pauzeert daarnaast de
WebView-timers en hervat ze bij terugkeer. Balk, legenda en labels blijven gelijk.

Onder de daggegevens staat Golden Hour voor de geselecteerde datum: ochtend van
−4° naar +6° zonshoogte en avond van +6° naar −4°. De uitbreiding gebruikt dezelfde
Meeus-zonnecoördinaten met vier iteraties per grens, voor het geometrische
zonnemiddelpunt (zonder de opkomstcorrectie van −0.833°). Tijden verschijnen in
de getoonde tijdzone. Een ontbrekende grens of een grens buiten de geselecteerde
lokale kalenderdag geeft een melding in plaats van een tijd. De grafiek en
bestaande daglengteberekening zijn niet gewijzigd.

De NOAA/Meeus-berekening is overgenomen uit Cockpit `static/daylength.js`,
inclusief vier iteraties per zongebeurtenis en zonshoogte −0.833°. De formules
zijn behouden; alle onderdelen gebruiken hetzelfde locatie-/tijdzonemodel.
Amsterdam, Nederland (52.3676°N / 4.9041°E) is de standaard. Datums zijn UTC-kalendertokens;
gebeurtenissen worden aan de geselecteerde dag in de getoonde tijdzone gekoppeld,
ook over middernacht. Poolgrenzen zonder volledig interval tonen onbekend.
Vrije horizon en gemiddelde refractie zijn aannames;
dit is geen voorspelling van weersinvloed of lokale obstakels.

## Automatische locatie, plaatsnaam en privacy

- Eerste gebruik zonder toestemming toont een korte uitleg en daarna de Android-
  dialoog. Globale of nauwkeurige toestemming werkt; ook eenmalige toestemming
  blijft onder beheer van Android. Volgende starts vernieuwen automatisch bij
  geldige toestemming. Na weigering/verlopen toestemming volgt geen nieuwe vraag;
  het vernieuwicoon kan de aanvraag opnieuw starten.
- LocationManager stopt bij een geschikte fix, bij verlaten van de app of na tien
  seconden. Een recente Android-fix mag maximaal twee minuten oud zijn, met
  maximaal 5 km onzekerheid. De interface blijft tijdens het zoeken bruikbaar.
- Eén eerdere fix wordt lokaal in app-private SharedPreferences bewaard: positie,
  nauwkeurigheid, oorspronkelijke fixtijd en plaatsnaam. Bij terugval wordt deze
  altijd als **laatst bekend** met UTC-tijdstempel getoond, nooit als actueel.
  Zonder geldig opgeslagen record volgt **Amsterdam, Nederland (standaard)**.
  De app bewaart geen geschiedenis; Android-back-up is uitgeschakeld.
- Android Geocoder vraagt alleen voor een gevonden locatie met toestemming een
  plaatsnaam/land op. API 33+: asynchrone callback; API 26–32: achtergrondthread.
  Na vijf seconden, een fout of een leeg resultaat blijven coördinaten staan.
  Achtergrond-/verouderde callbacks worden genegeerd. De ondersteunde Android-API
  biedt geen annulering van een al lopende backend-aanvraag; deze blokkeert de UI
  niet. Er is geen eigen server of HTTP-client. Androids Geocoder-aanbieder mag
  voor plaatsnamen netwerk gebruiken; de app zelf houdt geen INTERNET-permissie.

## Offline tijdzones: bewust beperkte dekking

Europees Nederland wordt herkend met de gebundelde officiële Kadaster/PDOK-landgrens,
inclusief enclavegaten. Dit is onafhankelijk van de nabijheid van een stad; ook
een globale Maastricht-fix van 5 km krijgt Europe/Amsterdam. Zie
[bron, licentie en dataformaat](docs/netherlands-boundary.md).
Buiten Nederland blijven de bestaande conservatieve regio's voor Londen (30 km),
New York (20 km) en Tokio (50 km) behouden, inclusief onzekerheidsmarge.
Elders blijft **UTC — lokale tijdzone offline onbekend** de terugval.

De toestelzone wordt alleen aanvullend gebruikt wanneer haar volledige ZoneRules
overeenkomen met de geografisch vastgestelde zone. De toestelzone kan een
onbekende geografische zone nooit vervangen. De getoonde IANA-zone blijft geografisch.
Java/Android ZoneRules
levert de werkelijke offsets en overgangen voor het huidige jaar ±2 jaar aan
JavaScript; de WebView gebruikt dus deze Android-regels voor kloktijden en
kalendergrenzen. De jaargrafiek gebruikt de astronomische zonnecyclus, onafhankelijk
van kloktijdzone, DST of afknippen aan lokale middernacht. De 24-uursbalk wordt
wel op de geselecteerde lokale kalenderdag afgeknipt.

## Ontwikkelen en bouwen

- Android Studio met ondersteuning voor de huidige projectconfiguratie.
- Android Gradle Plugin 9.5.1, Gradle 9.6.0; geen dynamische versies.
- JetBrains JDK 21 via `gradle/gradle-daemon-jvm.properties`; Java 17-broncode.
- Android SDK Platform 36 en Build Tools 36.0.0. AGP negeert met een waarschuwing
  de oudere expliciete Build Tools 35.0.0-instelling.
- Node.js 24 voor de dependencyvrije JavaScript-tests.

Dit is de bestaande Android Studio-upgradeconfiguratie waarmee de 2.1-debugbuild
en lintcontrole succesvol zijn uitgevoerd.

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

Golden Hour-uitbreiding: zeven Node-tests geslaagd, inclusief zomer/winter,
beide DST-overgangen, ontbrekende grenzen en bijwerken van de selectie.
Debugbuild en lint slagen met de reeds lokaal bijgewerkte buildconfiguratie;
lint geeft drie versie-/SDK-waarschuwingen en geen fouten. De offline-smoketest
op Android 16 slaagt inclusief Golden Hour. De sleepcontrole controleert december
en selecteert daarna 31 december exact met een tik, omdat Android de laatste
sleepbeweging vóór het loslaten kan bemonsteren. Screenshot:
`app/build/smoke/golden-hour.png`. De gebruiker heeft daarna bevestigd dat Golden
Hour zichtbaar is op de Samsung met versie 2.1 (versionCode 2).

## Verificatie daglichtbalk

Versie 2.2 (16 november 2026): negen Node-tests geslaagd, inclusief plaatsing op
de 24-uurs kloktijdsschaal, volledige Golden Hour, DST en ongeldige/ontbrekende
intervallen. Debugbuild en lint geslaagd (drie bestaande versie-/SDK-waarschuwingen).
Offline Android 16-smoketest geslaagd, inclusief bijwerken van de balk na
datumselectie en Vandaag. Screenshot visueel gecontroleerd. Nog geen fysieke
Samsung-test van deze uitbreiding. Installatiebestand: `JaarZon-2.2-Daglichtbalk.apk`
(lokale kopie, uitgesloten van Git).

## Verificatie locatie

Versie 2.3 (16 november 2026): elf Node-tests en twaalf Java-locatiebeleidschecks
geslaagd. Getest: locatie-/tijdzonewissel, volledig jaar, UTC-middernacht,
pooldag/poolnacht, ontbrekende grensmomenten en Nederlandse zomer-/wintertijd.
`android-location-smoke.ps1` slaagt op Android 16 met fictieve testproviders:
Android-toestemmingsvenster en weigeren, precies, alleen globaal, locatie uit,
geen fix binnen tien seconden en geen actieve achtergrondaanvraag. De test
onderscheidt actieve aanvragen van Androids historische logboek. Tijdelijke
toegankelijkheidsdumpfouten worden opnieuw geprobeerd. Debugbuild en lint slagen
met drie bestaande versie-/SDK-waarschuwingen; geen lintfouten. Geen fysieke
Samsung-test van de locatie-uitbreiding. Lokale installatiekopie:
`JaarZon-2.3-Locatie.apk` (niet in Git).

De bestaande offline Android-regressietest is ook geslaagd voor grafiek,
datumselectie, Vandaag, hervatten, daglichtbalk en Golden Hour.

## Verificatie 2.4 en 2.5 — 17 november 2026

- 2.4: dertien JavaScript-tests en 45 Java-controles geslaagd. Geocoder-callbacks
  geldig/leeg/fout/annulering zijn met een deterministische bron getest; een echte
  plaatsnaam blijft afhankelijk van de systeemaanbieder. Op Android 16 getest:
  uitleg bij eerste gebruik, Android-toestemming weigeren/verlenen, volgende start
  automatisch vernieuwen, globale locatie, opgeslagen locatie na timeout,
  ingetrokken en eenmalige toestemming, Amsterdam zonder opgeslagen fix en geen
  achtergrondaanvraag. Offlineregressie voor grafiek/Golden Hour/balk geslaagd.
- 2.5: veertien JavaScript-tests en dezelfde 45 Java-controles geslaagd. Extra:
  00/06/12/18-posities, minuutverplaatsing, andere datum/Vandaag, UTC/tijdzonewissel,
  beide DST-overgangen en nul timers bij pauzeren/verbergen. Android-regressietest
  controleert ook verdwijnen/herstellen van de echte SVG-markering; screenshot
  visueel gecontroleerd. Native WebView pauseTimers/resumeTimers zijn gekoppeld
  aan Activity onPause/onResume.
  Een echte minuutovergang is zonder aanraken of hervatten waargenomen in Android:
  de markering veranderde automatisch van 11:36 naar 11:37 (Europe/Amsterdam).
- Beide debugbuilds en lint geslaagd; drie bestaande versie-/SDK-waarschuwingen,
  geen lintfouten. De gebruiker test APK's zelf op Samsung; voor deze nieuwe
  versies is nog geen specifieke bevestiging van hem ontvangen.
- APK's: `JaarZon-2.4-Locatie.apk` en `JaarZon-2.5-Tijdmarkering.apk` (lokaal,
  uitgesloten van Git). Screenshot: `app/build/smoke/jaarzon.png`.

## WebView-beperking

Er is geen INTERNET-permissie. De Java-laag beantwoordt alleen drie exacte lokale
resource-URL's onder een virtuele HTTPS-origin; er vindt geen serververbinding
plaats. Overige requests en navigatie worden geweigerd. Bestands-/contenttoegang,
cookies, DOM-opslag, geolocatie en gemengde inhoud zijn uitgeschakeld. Er is geen
JavaScript-bridge. Een Content Security Policy beperkt scripts en stijlen tot de
eigen origin en blokkeert netwerkverbindingen.

## Verificatie 2.6 — 17 november 2026

- Oorzaak: Maastricht had slechts een cirkel van 1.5 km; de GPS-onzekerheid
  telde bij de afstand op, waardoor zelfs een fix in het centrum UTC kon opleveren.
- Correctie: officiële offline Nederlandse landsgrens; Android-toestelzone alleen
  aanvullend bij volledig gelijke ZoneRules. Onbekende geografische zones blijven UTC.
- `test.ps1`: 15 JavaScript-tests en 69 Java-controles geslaagd, inclusief
  Maastricht, Amsterdam, Londen, New York, Tokio, Nederlandse zomer-/wintertijd,
  buitenlandse toestelzone en onbekende locatie. `git diff --check` geslaagd.
- `build.ps1`: assembleDebug en lintDebug geslaagd; drie bestaande lintwaarschuwingen
  (OldTargetApi, AndroidGradlePluginVersion, GradleDependency), geen lintfouten.
- Android-locatietest geslaagd op emulator-5554, inclusief Maastricht met 5 km
  onzekerheid, Londen, New York en globale Amsterdam-fix. De eerste poging werd
  geblokkeerd door een vastgelopen emulator-System UI; na herstel slaagde de test.
- APK: `JaarZon-2.6-Tijdzone.apk`, versionCode 7. Geen commit of push uitgevoerd.
- Android-WebView-regressie eveneens geslaagd: offline starten, datumselectie, slepen, Vandaag, hervatten, daglichtbalk en Golden Hour.


## Internationalisering

De knop Taal/Language opent een compacte Android-keuze: Automatisch (systeemtaal),
Nederlands, English. De primaire Android-systeemtaal bepaalt de automatische taal;
andere talen dan nl/en vallen terug op Nederlands. Op Android 13+ wordt de keuze
via LocaleManager opgeslagen en is hij ook in Androids app-taalinstellingen beschikbaar.
Op Android 8–12 staat de keuze in een lokale SharedPreference; een Activity-context
past de taal toe zonder de globale toestelinstellingen te wijzigen.
De appnaam blijft JaarZon. De taal wordt bij iedere Activity-herstart opnieuw bepaald.
Een taalwisseling bewaart de huidige coördinaten en tijdzone, met een nieuwe poging
voor een plaatsnaam in de gekozen taal. Bij ontbreken daarvan blijft de beschikbare
oude naam staan. Bij de ingebouwde taalknop blijft ook de geselecteerde datum behouden.

Android-teksten staan in res/values/strings.xml (nl) en res/values-en/strings.xml.
Alle WebView-teksten en eenheden staan in assets/i18n.js; index.html gebruikt
vertaalsleutels. Android levert de gekozen taal mee aan het strikt lokale script.
Locale-afhankelijke kalenderdatums gebruiken nl-NL/en-GB; kloktijden zijn altijd
24-uurs en behouden de geografische tijdzone en zomer-/wintertijd. Kalenderdatums
zijn UTC-datumtokens: ze worden bij weergave niet nogmaals naar een andere tijdzone
verschoven, zodat westelijk van UTC geen vorige kalenderdag verschijnt.

Een taal toevoegen:
1. Voeg dezelfde vertaalsleutels en placeholders aan assets/i18n.js toe en breid
   de taalnormalisatie uit met de nieuwe taal en bijbehorende datumlocale.
2. Voeg res/values-<taal>/strings.xml toe met alle native sleutels.
3. Breid LanguagePolicy, locales_config.xml en de compacte native taallijst uit.
4. Voeg taal-/fallbacktests toe en voer test.ps1, build.ps1 en emulatorcontroles uit.

Gewijzigd voor deze uitbreiding: app/build.gradle, AndroidManifest.xml,
MainActivity.java, assets/daylength.js, index.html, style.css, test.ps1,
tests/daylength.test.js, tests/LocationPolicyTest.java, tests/location-policy.ps1,
tests/android-smoke.ps1, tests/android-location-smoke.ps1,
AGENTS.md en README.md. Nieuw: assets/i18n.js, LanguagePolicy.java, twee
strings.xml-bestanden, res/xml/locales_config.xml, tests/i18n.test.js,
tests/android-language-smoke.ps1 en tests/webview-eval.js.
Geen bekende onvertaalde app-teksten. Geocoder-namen blijven zo nodig in de
beschikbare oorspronkelijke taal; Android-systeemdialogen worden door Android beheerd.

De APK heet JaarZon-2.7-International.apk. De internationale versie is op opdracht
hernummerd van 2.5 naar 2.7, aansluitend op de bestaande 2.6. versionCode is 9,
zodat installatie over zowel 2.6/code 7 als de eerdere internationale build/code 8 mogelijk is.

Verificatie Internationalisering (17 november 2026):
- test.ps1: 19 JavaScript-tests, 75 Java-controles, syntax- en whitespacecontrole geslaagd.
- build.ps1: assembleDebug en lintDebug geslaagd. Vijf lintwaarschuwingen:
  de bestaande OldTargetApi, AndroidGradlePluginVersion, GradleDependency, plus
  UnusedAttribute (localeConfig is API 33+) en AppBundleLocaleChanges (waarschuwing
  voor optionele Play-taalsplits). Deze zelfstandige APK bevat beide talen volledig;
  geen Play Core of taaldownload nodig. Bestaande Gradle-deprecatiewaarschuwingen blijven.
- android-language-smoke.ps1: automatische Engelse systeemtaal, handmatig nl/en,
  automatische stand, opslag na herstart, native uitleg, datumselectie, gelijke
  grafiekpunten/barsegmenten en onbekende Android-app-taal geslaagd. Met een fictieve
  Android-fix in New York bleven locatie, zone, Golden Hour, grafiek en balk behouden.
- Handmatig in Android Settings de werkelijke systeemtaal gewijzigd: nl-NL werd
  Nederlands; de-DE als eerste systeemtaal met nl/en erachter viel terug op Nederlands.
  Daarna de primaire Engelse systeemtaal hersteld. Bewijs: app/build/language-smoke/.
- Eerste schermlezertests gaven na Activity-recreatie soms een onvolledige
  toegankelijkheidsboom. De taaltest controleert daarom de actuele DOM via lokaal CDP;
  native Android-dialogen worden nog wel via UIAutomator gecontroleerd.
- Bestaande android-location-smoke.ps1 geslaagd, inclusief toestemming, timeout,
  Maastricht, Londen, New York, coarse/fine, opgeslagen locatie en geen achtergrondfix.
- De taalresolver is met zuivere Java-tests gecontroleerd. Deze emulator draait
  API 36; opslag en Activity-herstart op Android 8–12 zijn niet daadwerkelijk op
  die oudere runtime uitgevoerd.
- Geen installatie op een fysiek toestel en geen Git-commit/push uitgevoerd.
- Bestaande android-smoke.ps1 eveneens geslaagd: offline starten, datumselectie,
  slepen, Vandaag, hervatten, tijdmarkering, daglichtbalk en Golden Hour.
- Engelse interface op 320 CSS-pixels breed gecontroleerd: geen horizontale
  overflow, jaargrafiek behoudt viewBox-verhouding 360:228, daglichtbalk blijft
  14 px hoog. Screenshot en meetwaarden staan in app/build/language-smoke/.

Versiecorrectie naar 2.7: app/build.gradle, AGENTS.md en deze README bijgewerkt;
versionName 2.7, versionCode 9. test.ps1 (19 JavaScript-tests, 75 Java-controles)
en build.ps1 (assembleDebug/lintDebug) opnieuw geslaagd. Dezelfde vijf
lintwaarschuwingen blijven aanwezig, geen fouten. Geen nieuwe emulatortest
uitgevoerd voor deze wijziging van alleen versiegegevens. APK-metadata met aapt
gecontroleerd. De eerdere APK blijft bewaard. Geen commit of push uitgevoerd.
