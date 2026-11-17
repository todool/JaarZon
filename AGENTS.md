# JaarZon

Lees dit bestand volledig voordat je het project onderzoekt of wijzigt. Volg de
hier vastgelegde procedures; zoek ze alleen opnieuw uit als ze ontbreken, niet
werken of aantoonbaar verouderd zijn.

## Doel en grenzen

- Ontwikkel een zelfstandige Android-app die de daglengte gedurende het
  kalenderjaar interactief weergeeft en volledig offline functioneert.
- Amsterdam, Nederland (52.3676, 4.9041; Europe/Amsterdam) is vanaf 2.4 de standaardlocatie.
- Automatische foregroundlocatie is inmiddels expliciet toegestaan. Gebruik
  uitsluitend Android LocationManager, coarse/fine-toestemming en een begrensde
  aanvraag; geen achtergrondlocatie. Vanaf 2.4 is één lokale laatst-bekende
  locatie (coördinaten, nauwkeurigheid, fixtijd en plaatsnaam) expliciet toegestaan.
  Die wordt bij terugval altijd als laatst bekend met tijdstempel aangeduid.
- Vanaf 2.4 is Android Geocoder expliciet toegestaan voor plaatsnamen; de
  systeemaanbieder mag daarvoor netwerk gebruiken. Geen eigen geocodingserver,
  eigen netwerkaanroepen of externe tijdzone-API. WebView blijft netwerkloos.
- Eerste gebruik zonder toestemming: korte uitleg, daarna Androids dialoog.
  Bij volgende starts geldige toestemming hergebruiken; niet opnieuw vragen
  na weigering/verlopen toestemming tenzij de gebruiker op vernieuwen tikt.
- Offline tijdzones: Europees Nederland via de gebundelde Kadaster/PDOK-landgrens
  (NetherlandsBoundary; bron/licentie in docs/netherlands-boundary.md). Buiten
  Nederland alleen conservatieve bekende regio's met onzekerheidsmarge.
  Elders expliciet UTC, nooit blind de toestelzone.
  Android ZoneRules levert de offsets voor het actuele jaar ±2 jaar aan WebView.
  Astronomische jaardaglengte blijft onafhankelijk van de gebruikte kloktijdzone.
- Voorlopige technische voorkeur: Java met een lokale Android WebView en
  HTML/JavaScript/SVG. Bundel de benodigde webbestanden lokaal; vereis geen
  externe API, CDN of netwerkverbinding voor de appfunctionaliteit.
- Locatie-instellingen, maanfunctionaliteit en Play Store-publicatie vallen
  buiten de eerste ontwikkelfase.
- De gebruiker heeft de herbouw naar JaarZon 2.0 opgedragen. De oude Sun Moon-app
  is vervangen; voeg geen oude netwerk- of maanfunctionaliteit terug.
- De bestaande projectmap `C:\Users\tobie\programming_act\JaarZon` blijft de
  definitieve locatie voor de nieuwe Android-app; bouw die niet in een aparte
  projectmap naast JaarZon.

## Talen

- Versie 2.7 Internationalisering gebruikt Nederlands en Engels. Onbekende primaire
  systeemtaal valt terug op Nederlands. De taal mag locatie/tijdzone nooit wijzigen.
- Android 13+: LocaleManager en res/xml/locales_config.xml; Android 8–12:
  lokale taalvoorkeur en een Activity-configuratiecontext. Geen vertaalbibliotheek.
- Native teksten: res/values/strings.xml en res/values-en/strings.xml.
  WebView-teksten: assets/i18n.js; HTML gebruikt data-i18n(-aria)-sleutels.
  Voeg geen zichtbare hardgecodeerde teksten toe. Datumtokens worden als kalenderdatum
  geformatteerd; kloktijden blijven de geografische Android-tijdzoneregels gebruiken.
- Taaltest emulator: tests/android-language-smoke.ps1 -Serial emulator-5554
  (begint met Engelse primaire systeemtaal; wist uitsluitend emulator-appgegevens).
  Rechtstreekse DOM-controles gebruiken tests/webview-eval.js via een tijdelijk
  lokaal ADB-debugkanaal. Geen testcode wordt in de APK gebundeld.

## Bekende bronnen

- Project: `C:\Users\tobie\programming_act\JaarZon`.
- Android-scherm: `app/src/main/java/nl/jaarzon/MainActivity.java`;
  lokale webbestanden: `app/src/main/assets/`; resources: `app/src/main/res/`; manifest:
  `app/src/main/AndroidManifest.xml`.
- Bestaande bouwconfiguratie: `build.gradle`, `app/build.gradle`,
  `settings.gradle` en `gradle/wrapper/gradle-wrapper.properties`.
- Functionele basis: `C:\Users\tobie\programming_act\cockpit`.
  Lees daar eerst de volledige `AGENTS.md` bij onderzoek van dat project.
- Cockpit-widget: `static/daylength.js`, `templates/widgets/daylength.html`,
  relevante stijlen in `static/dashboard.css` en tests in
  `tests/daylength.test.js`. Deze bevatten de lokale zonberekening en jaargrafiek.
- Cockpit is uitsluitend een bron voor hergebruik van bestaande functionaliteit
  en tests. Cockpit-bestanden mogen uitsluitend worden gelezen, nooit gewijzigd.

## Veilig werken en Git

- Controleer vóór wijzigingen de bestaande projectstructuur en eventuele
  Git-status. Gebruik bij een aanwezige repository `git status --short --branch`
  en inspecteer relevante bestaande wijzigingen.
- Op 15 november 2026 is op expliciete opdracht een lokale Git-repository met
  branch `main` geïnitialiseerd. De gebruiker heeft de eerste commit en push
  naar `https://github.com/todool/JaarZon.git` toegestaan; gebruik die repository
  als `origin`. Verdere commits en pushes vereisen opnieuw expliciete toestemming.
- Bestaande code mag nooit zonder expliciete toestemming worden verwijderd of
  vervangen. De gebruiker heeft bevestigd dat een back-up van de oude Sun
  Moon-app bestaat en heeft expliciet toestemming gegeven om bij de daadwerkelijke
  herbouw alle bestaande applicatiecode en verouderde projectbestanden binnen
  JaarZon te verwijderen of vervangen. Deze toestemming hoeft bij die herbouw
  niet opnieuw te worden gevraagd. De herbouw is inmiddels expliciet opgedragen.
  Deze toestemming geldt niet voor Cockpit, nieuwe JaarZon-code of andere
  bestanden buiten deze scope. Vraag voor overige verwijderingen of vervangingen eerst
  expliciete toestemming.
- Beperk wijzigingen tot de opdracht. Bewaar bestaande bestanden en wijzigingen
  van de gebruiker; overschrijf of herstel die niet op eigen initiatief.
- Installeer of upgrade geen ontwikkeltools of dependencies en wijzig geen
  configuratie buiten de opdracht. Houd lokale paden en geheimen buiten commits.
- Inspecteer na wijzigingen de diff en Git-status indien beschikbaar. Stage
  geen ongerelateerde bestanden. Git-commits en pushes vereisen ieder expliciete
  toestemming. Voer geen destructieve Git-acties uit zonder expliciete opdracht.

## Ontwikkeling, tests en builds

- Java 17-broncode, Android Gradle Plugin 9.5.1, Gradle-wrapper 9.6.0,
  compile/target SDK 36 en min SDK 26. Gebruik de wrapper. De bestaande
  Android Studio-upgradeconfiguratie is behouden en de 2.1-build slaagt hiermee.
  AGP gebruikt Build Tools 36.0.0 en waarschuwt dat de expliciete 35.0.0-instelling
  wordt genegeerd. `gradle/gradle-daemon-jvm.properties` selecteert JetBrains JDK 21.
- Voer `.\test.ps1` uit voor de dependencyvrije Node.js-tests (Node 24),
  JavaScript-syntax en `git diff --check`. De astronomische functies uit Cockpit
  behouden hun Meeus-formules; coördinaten en expliciete tijdzone zijn nu per
  rekenmodel instelbaar. Behoud de nauwkeurigheid en Nederlandse referentietests.
- `test.ps1` voert ook `tests/location-policy.ps1` uit met de lokale JDK voor
  leeftijd/nauwkeurigheid, opgeslagen locaties, tijdzones en PlaceLookup-callbacks.
  Extra emulatorcontrole:
  `.\tests\android-location-smoke.ps1 -Serial emulator-5554`; uitsluitend
  fictieve testproviders, toestemming, uitgeschakelde locatie en timeout.
  Deze test wist alleen in een emulator de JaarZon-appgegevens om eerste gebruik
  te testen; nooit tegen een fysiek toestel uitvoeren. De gebruiker test APK's
  daarnaast zelf op Samsung; onderscheid diens bevestigingen van onze controles.
- Voer `.\build.ps1` uit voor `:app:assembleDebug :app:lintDebug`. Het script
  gebruikt JAVA_HOME of de standaard Android Studio JBR. SDK-configuratie hoort
  in genegeerd `local.properties` of ANDROID_HOME. Een eerste build kan netwerk
  vereisen voor buildtools; de app zelf moet volledig offline blijven.
- APK: `app/build/outputs/apk/debug/app-debug.apk`; lintrapport:
  `app/build/reports/lint-results-debug.html`. Leg verificatieresultaten en
  eventuele fouten vast in de oplevering; oude output bewijst geen nieuwe build.
- Test bij implementatie ten minste jaargrenzen, schrikkeljaren, zonnewendes,
  zomer-/wintertijd, datumselectie en werking zonder netwerk. Gebruik de
  Cockpit-testgevallen als referentie en controleer ook de echte Android WebView.
- Gebruik voor de Android-smoketest bij een opgestarte emulator
  `.\tests\android-smoke.ps1 -Serial emulator-5554` (pas het emulatornummer aan).
  Deze installeert de debug-APK en schakelt wifi/mobiele data in die emulator uit;
  de test weigert fysieke toestellen. Bewijs staat in `app/build/smoke/`.
- Rapporteer na werk welke bestanden zijn gewijzigd, welke tests en builds zijn
  uitgevoerd, hun resultaat en eventuele fouten of beperkingen. Vermeld ook
  expliciet wanneer tests of builds niet zijn uitgevoerd.
- Deployment, installatie op een toestel en publicatie gebeuren alleen na een
  expliciete opdracht. Een lokale emulator mag voor de gevraagde verificatie
  worden gebruikt. Samsung-installatie en handmatige controles staan in README.md.
