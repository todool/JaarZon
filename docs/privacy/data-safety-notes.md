# JaarZon — privacy-audit en voorbereiding Data Safety

**HTML gereed voor publicatievoorbereiding; Data Safety nog niet definitief indienen.**
Bijgewerkt en gecontroleerd op 18 november 2026:
JaarZon 2.7, broncommit `db37681`, met de bestaande lokale taalsplits-correctie.
Ontwikkelaar: **Tobie Doolaard**, particulier onder de ontwikkelaarsnaam **Tobie Apps**.
Contact: **tobieapps.support@proton.me**, volgens de gebruiker actief beschikbaar
via zijn Proton-account; geen testmail verzonden. Naam, hoedanigheid en adres zijn
op 18 november 2026 door de gebruiker bevestigd. Geen bevestiging
van algehele juridische of Google Play-conformiteit; het Play Console-formulier is niet ingevuld.

## Aantoonbaar appgedrag

Bronnen staan onder `app/src/main/`; Java-bestanden onder `java/nl/jaarzon/`.

| Onderdeel | Bron | Bevinding |
|---|---|---|
| Permissies | `AndroidManifest.xml` | Alleen coarse/fine-locatie. Geen INTERNET-, achtergrondlocatie-, advertentie-ID- of opslagpermissie. |
| Locatie en doel | `MainActivity.java`: `locate`, `accept`, `onPause`; `LocationPolicy.java`: `acceptable` | LocationManager-aanvraag circa 10 seconden, alleen foreground. Nieuwe fixes maximaal 2 minuten oud en maximaal 5 km onzekerheid. Coördinaten dienen voor lokale zonberekeningen, grafieken, tijdzones en een Geocoder-plaatsnaam. |
| Bewaarde locatie | `MainActivity.java`: `saveCurrent`; `PlaceLookup.java` | Eén record in private SharedPreferences: volledige latitude/longitude, nauwkeurigheid, fixtijd en plaats-/gebiedsnaam plus land. Geen straatadres of locatiehistorie. Afronding op het scherm is geen afronding van de opgeslagen of doorgegeven coördinaten. |
| Overige lokale state | `attachBaseContext`, `chooseLanguage`, `askPermission`, `onSaveInstanceState` | Taalvoorkeur, vlag dat locatie-uitleg is getoond, tijdelijke schermstate met onder andere locatie en geselecteerde datum. Android beheert de app-taal op API 33+; op API 26–32 een lokale voorkeur. |
| Bewaren/verwijderen | `LocationPolicy.java`: `storedUsable`; appopslag | Geen automatische vervaldatum voor het bewaarde record; een nieuwe geaccepteerde fix vervangt het vorige. Toestemming intrekken wist het niet. Android **Gegevens wissen / Opslag wissen** of app verwijderen verwijdert lokale appgegevens; alleen cache wissen niet. OS-app-taalvoorkeur ook via Android wijzigen. Geen bewijs van verwijdering bij externe aanbieders. |
| Backup/beveiliging | Manifest; `res/xml/data_extraction_rules.xml`; WebView-instellingen | Auto Backup uit; appgegevens uitgesloten van cloudbackup en device-transfer. Private appopslag; WebView laadt alleen lokale whitelist en blokkeert netwerk. Dit is bronconfiguratie, geen test van iedere OEM-backupimplementatie. |
| Overige stromen | Java, assets, manifest, `app/build.gradle` | Geen eigen backend, uploadfunctie, advertenties, analytics, tracking-SDK's, accounts of eigen locatie-logregels aangetroffen. De virtuele HTTPS-origin, SVG-namespace en NOAA-broncommentaar zijn geen externe verzoeken. OS-/providerlogging is niet vastgesteld. |

## Geocoder: bewezen aanroep, onbekende aanbieder

`findPlace()` gebruikt `Geocoder(..., Locale.forLanguageTag(language))` en
`getFromLocation(latitude, longitude, 1, ...)`: gekozen taal en maximaal één resultaat.
API 33+ gebruikt callbacks; API 26–32 de blokkerende API op een workerthread.
De app stopt na circa vijf seconden met wachten en negeert verouderde callbacks.
**Dit bewijst geen annulering van een remote verzoek of serververwijdering na vijf seconden.**

Android documenteert mogelijk netwerkgebruik. Een aparte systeemaanbieder kan dus
netwerk gebruiken zonder INTERNET-permissie in JaarZon. Ook LocationManager gebruikt
systeemvoorzieningen die afhangen van toestelinstellingen. Niet vastgesteld:

- aanbieder, ontvangers, servers/landen en eventuele doorgifte buiten de EER;
- daadwerkelijke externe verwerking van coördinaten en eventuele verdere metadata;
- eigen doeleinden van de aanbieder, transportbeveiliging, logs, opslag en bewaartermijnen;
- wisprocedures en de rol van de aanbieder bij een eventuele uitzondering voor delen.

Geen netwerkmeting, providercontract of aanbieder-specifieke verklaring onderzocht.
Een meting op één toestel bewijst bovendien niet het gedrag van alle Android-aanbieders.

## Google Play: voorlopige categorieën en grenzen

| Categorie | Zeker | Openstaand |
|---|---|---|
| Approximate location | Coarse-toestemming, lokale verwerking en mogelijke Geocoder-aanvraag. | Externe verwerking en bijbehorende formulierantwoorden onderbouwen. |
| Precise location | Fine-toestemming en ongeronde coördinaten ondersteund. Schermafronding maakt de aanvraag niet globaal. | Dezelfde provideranalyse, inclusief nauwkeurige locatie. |
| Voorkeuren/schermstate | Geen eigen upload van taalvoorkeur of geselecteerde datum. Taal wordt wel aan Geocoder meegegeven. | Eventuele aanvullende providerverwerking niet uitsluiten zonder bewijs. |
| Accounts, advertenties, identifiers, analytics/diagnostiek | Geen eigen verzamelfuncties of SDK's hiervoor aangetroffen. | Geen algemene garanties over systeemaanbieders afleiden uit afwezige appcode. |
| Vrijwillige support-/privacycorrespondentie | Gebruiker mailt zelf naar `tobieapps.support@proton.me`: afzenderadres, berichtinhoud en eventueel naam/bijlagen. Mail verloopt via de eigen e-mailaanbieder en het Proton-account van Tobie Apps, buiten de lokale appopslag. | Privacyverklaring geldt ook voor deze correspondentie. Beoordeel voor Data Safety de feitelijke relatie tot de gepubliceerde app en eventuele externe e-mailapp; niet automatisch als app-upload of juist als vrijgesteld classificeren. Relevante mogelijke categorieën: Personal info → Email address/Name, Messages → Emails en bewust verwerkte bijlagen. Geen definitieve formulieraankruising op basis van alleen een mailto-link. |

Alleen lokale verwerking hoeft volgens Google niet als 'collected' te worden
verklaard. 'Collected' en 'shared' zijn verschillende vragen. Externe tijdelijke
('ephemeral') verwerking en uitzonderingen voor delen vereisen onderbouwing volgens
de actuele formulierinstructies. Appwachttijd bewijst geen tijdelijke serververwerking.
Het aantoonbare appdoel is **app functionality**; locatie is optioneel omdat de app
ook met een bewaarde fallback of Amsterdam werkt. Na intrekken van toestemming kan
het oude record nog als laatst bekend worden gebruikt.

Niet definitief verklaren zonder onderzoek: 'geen verzameling of delen', 'alles
blijft op het toestel', 'alle overdracht is versleuteld', 'aanbieders slaan niets op',
'geen doorgifte buiten de EER' of 'appgegevens wissen verwijdert externe kopieën'.

## Vastgesteld supportbeleid

De gebruiker heeft het volgende beleid opgedragen voor beide verklaringen:

- Uitsluitend gebruik voor vragen, meldingen en eventuele opvolging; geen marketingdoel.
- Maximaal **12 maanden na de laatste correspondentie**, tenzij een wettelijke
  verplichting langere bewaring vereist.
- Een verzoek tot verwijdering van correspondentie kan naar het supportadres.
  Een wettelijke bewaarplicht kan volledige verwijdering beperken.
- Dit is een organisatorisch uit te voeren beleid, geen technisch afgedwongen
  automatische wisfunctie. Appgegevens wissen verwijdert geen e-mail.

Tobie Apps moet dit beleid in de mailbox toepassen, inclusief beheerde kopieën
zoals verzonden/archiefberichten. De termijn voor eigen correspondentie bewijst
geen bewaartermijn van providerlogs of providerbackups. Die praktijk is niet
onderzocht; er wordt geen garantie over encryptie, backupwissen of doorgifte gegeven.

## Concrete verificatie vóór invullen van Data Safety

1. Naam en supportadres zijn ingevuld: Tobie Doolaard (particulier, Tobie Apps),
   `tobieapps.support@proton.me`. De gebruiker bevestigt dat het adres actief is.
2. Grondslag per verwerking en eventuele aanvullende wettelijke contactvereisten bevestigen.
   Android-runtimepermissie is geen volledige AVG-toestemmingsanalyse.
3. Ondersteunde toestellen/versies en bijbehorende Geocoder-/locatieaanbieders;
   officiële providerinformatie over ontvangers, doelen, beveiliging, bewaring,
   doorgifte en inzage-/wisverzoeken. Onbekenden expliciet blijven melden.
4. Het hierboven vastgestelde supportbeleid daadwerkelijk toepassen. Toegang tot
   de mailbox en toepasselijke Proton-afspraken verifiëren; alleen de naam Proton
   of een algemeen privacydocument bewijst geen accountinstellingen of end-to-endencryptie.
5. Maak per gegevensstroom een bewijsnotitie: bron, ontvanger, doel, lokaal/extern,
   optioneel/verplicht, bewaartermijn en beveiliging. Leg voor Geocoder de daadwerkelijke
   systeemaanbieder per ondersteunde toestelgroep vast via toestel-/providerinformatie;
   raadpleeg de officiële verklaringen en vraag zo nodig verduidelijking bij de aanbieder.
   Netwerkmetingen kunnen aanvullend helpen, maar bewijzen geen serverbewaring of
   het gedrag van andere toestellen. Vul bij ontbrekend bewijs niet 'geen verzameling',
   'uitsluitend tijdelijk' of 'geen delen' in als aanname. Voeg concrete ontvangers en
   relevante verwerkingsdetails ook aan de HTML toe zodra ze betrouwbaar bekend zijn.
6. Beoordeel vrijwillige e-mail los van de uitsluitend lokale appdata en de
   Geocoder-stroom. Controleer de actuele formulierreikwijdte en eventuele uitzonderingen
   voor een externe e-mailapp/gebruiker-geïnitieerde overdracht; vraag bij onduidelijkheid
   gerichte Play Console-beleidsverduidelijking. De privacyverklaring beschrijft e-mail
   ongeacht de uiteindelijke formulierclassificatie.

De HTML-pagina's bevatten nu publiceerbare beleidstekst zonder placeholders of interne
conceptmeldingen. Onbekend providergedrag blijft eerlijk vermeld. Dit betekent niet
dat de release of de nog openstaande Data Safety-classificatie is goedgekeurd.
Er is geen testmail verstuurd en geen mailboxinstelling aangepast.

## Toets aan huidige Google Play-privacyvereisten

Getoetst aan de officiële User Data-policy, geraadpleegd op 18 november 2026:

| Onderdeel | Stand |
|---|---|
| Duidelijke privacytitel, app-/ontwikkelaarsnaam en privacycontact | Aanwezig in beide HTML-pagina's: JaarZon, Tobie Apps/Tobie Doolaard, werkend adres volgens gebruiker. |
| Gegevenstypen, doeleinden, opslag, verwijdering en beveiligingsmaatregelen | Beschreven voor lokale appgegevens en vrijwillige e-mail. Systeemvoorzieningen en grenzen van de bewijsbaarheid apart beschreven. |
| Bewaren en verzoeken | Lokaal record zonder automatische afloop; appgegevens wissen; supportbeleid van 12 maanden en e-mailverwijderverzoek. Geen claim van automatische e-mailverwijdering. |
| Ontvangers en mogelijke externe verwerking | Android-systeemaanbieder, Proton/e-mailaanbieder en GitHub-hosting benoemd als stromen. Exacte Geocoder-aanbieder en verdere verwerking nog verifiëren; geen onvoorwaardelijke complianceclaim. |
| Openbare, toegankelijke HTML-URL en in-app toegang | Bestanden voorbereid voor /docs; publieke bereikbaarheid, HTTPS en geen login/geografische blokkering pas na activering toetsen. Nog geen privacyverwijzing in de app; die blijft vereist vóór Play-publicatie en valt buiten deze opdracht. |
| Consistentie met Data Safety en release | Opnieuw vergelijken na providerverificatie en bij iedere relevante wijziging. Formulier niet ingevuld; geen releasegoedkeuring. |

Google Play eist een openbare, niet-geografisch afgeschermde privacy-URL en toegang
tot de verklaring vanuit de app. Een technisch goede GitHub Pages-pagina alleen
voltooit die releasevoorwaarden dus niet. Andere juridische vragen, zoals de
grondslag en eventuele aanvullende contactvereisten, worden niet uit de code afgeleid.

## GitHub Pages: voorbereid, niet geactiveerd

Bestaande repository **todool/JaarZon**, toekomstige bron `main` → `/docs`, via
**Deploy from a branch**. Zonder afwijkend custom domein worden de paden:

| Bestand | Verwachte URL na activering |
|---|---|
| `docs/privacy/nl.html` | `https://todool.github.io/JaarZon/privacy/nl.html` |
| `docs/privacy/en.html` | `https://todool.github.io/JaarZon/privacy/en.html` |

`docs` wordt de publicatieroot, dus verschijnt niet in het URL-pad. De pagina's
werken zelfstandig; taalwissels zijn relatief (`nl.html`/`en.html`), ankers ook.
Een root-index is niet nodig voor deze directe URL's; er is nog geen rootlandingspagina.
Geen workflow, CNAME, aparte repository, Pages-activering of push uitgevoerd.

De pagina's bevatten geen scripts, analytics, formulieren of externe fonts/resources.
De enige absolute HTML-links zijn de expliciete privacyverwijzingen naar Proton en
GitHub en mailto-links; interne taalwissels/ankers zijn relatief. Bezoekers worden
niet automatisch naar de externe privacydiensten gestuurd.
GitHub verzorgt na publicatie de hosting; hun verwerking van websiteverkeer is
apart van de offline app te beoordelen aan de hand van actuele GitHub-privacyinformatie.

## Primaire bronnen

Geraadpleegd op 18 november 2026; opnieuw controleren wanneer beleid verandert.

- [Android Geocoder](https://developer.android.com/reference/android/location/Geocoder).
- [Google Play User Data en privacyverklaringseisen](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
- [GitHub Pages-bron: branch en /docs](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
- [GitHub Pages: statische hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
- [Europese Commissie: privacyrechten en transparantie](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en).
- [Proton-privacyinformatie](https://proton.me/legal/privacy) en [GitHub-privacyverklaring](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement): geen bewijs van specifieke accountinstellingen of de verwerking door een Geocoder-aanbieder.

Alleen de door de gebruiker aangeleverde naam en het voor openbaar gebruik bestemde
supportadres toegevoegd; geen persoonlijke meetcoördinaten, sleutels of wachtwoorden. Amsterdam
is de vaste productinstelling. Appcode en de bestaande lokale Gradle-wijziging
zijn voor deze documentatieopdracht ongemoeid gelaten.
