# JaarZon — Data Safety na verwijderen Geocoder

Gecontroleerd op 18 november 2026. JaarZon 2.7, releasefix op basis van e9020b8;
deze wijzigingen zijn nog niet gecommit of gepubliceerd.
Ontwikkelaar: Tobie Doolaard, particulier onder Tobie Apps.
Contact: tobieapps.support@proton.me.

## Aantoonbare gegevensstromen

- Android LocationManager levert foregroundlocatie na coarse/fine-toestemming.
  Aanvraag maximaal circa tien seconden; geen achtergrondservice.
- Coördinaten, nauwkeurigheid en fixtijd dienen uitsluitend voor lokale
  astronomische berekeningen, tijdzones en weergave. Geen Geocoder-aanroepen,
  eigen netwerkaanroepen, locatie-upload of alternatieve plaatsnaamdienst.
- Eén private SharedPreferences-record: latitude, longitude, nauwkeurigheid,
  fixtijd en eventueel een historische plaatsnaam. Een naam blijft alleen
  behouden bij exact dezelfde opgeslagen coördinaten; anders coördinaten tonen.
  Geen locatiehistorie. Geen automatische vervaldatum; een nieuwe fix vervangt
  het record. Toestemming intrekken wist het niet.
- Android Gegevens wissen / Opslag wissen of app verwijderen wist lokale
  appgegevens; cache wissen niet. Oudere externe Geocoder-verwerking wordt
  daardoor niet ongedaan gemaakt.
- Taalkeuze en uitleg-vlag lokaal; tijdelijke schermstate via Android.
  Android beheert app-taal op API 33+. Auto Backup en device-transfer uitgesloten
  in de appconfiguratie. Geen garantie over iedere OEM-implementatie.
- Geen eigen backend, advertenties, analytics, tracking, accounts of
  eigen locatie-logregels. Alleen coarse/fine-permissies; geen INTERNET.
  WebView blokkeert netwerk. Privacy-link opent een vaste URL in de browser
  zonder coördinaten of persoonlijke queryparameters.

## Android-systeemvoorzieningen

Locatievoorzieningen kunnen op basis van toestel, provider en instellingen
netwerk gebruiken. De app geeft geen coördinaten meer door voor plaatsnamen.
Dit bewijst niet dat Android nooit extern locatiegegevens verwerkt.
Systeemaanbieder, eventuele telemetry, servers, transport en bewaartermijnen
zijn niet uit deze appcode vast te stellen. Niet blind alle OS-verwerking als
JaarZon-verzameling classificeren, maar ook geen algemene OS-privacygarantie geven.
Er is geen eigen Fused Location Provider SDK toegevoegd.

## Voorgestelde Google Play-antwoorden

Google definieert verzameling als gegevensoverdracht vanuit de app buiten het
apparaat; uitsluitend lokale verwerking valt daar niet onder. Onderstaande
conclusies gelden alleen voor deze aangepaste build en moeten worden vergeleken
met alle daadwerkelijk via Play aangeboden versies.

| Vraag | Voorstel en onderbouwing |
|---|---|
| Verzamelt/deelt JaarZon gebruikersgegevens? | Nee voor de aantoonbare eigen appstromen: geen externe overdracht van locatie of voorkeuren meer. Controleer het definitieve release-artifact en alle actieve Play-versies vóór indienen. Dit is geen claim dat Android of websites niets verwerken. |
| Globale/nauwkeurige locatie | Wel toegang en lokale opslag, maar geen collected/shared-categorie op grond van uitsluitend die lokale verwerking. Permissies alleen bewijzen geen externe verzameling. |
| Lokale voorkeuren/schermstate | Niet extern verzameld of gedeeld door JaarZon. |
| Tijdelijke externe verwerking | Niet van toepassing op de eigen appstromen; lokale persistente opslag is geen ephemeral externe verwerking. |
| Versleuteling tijdens overdracht | Geen eigen overdracht van gebruikersgegevens om als versleuteld aan te merken. Geen ongefundeerd ja voor Android, browser of e-mail; alleen beantwoorden indien de Console deze vraag op dit formulierpad stelt. |
| Verwijderen | Lokale gegevens door gebruiker te wissen; supportcorrespondentie op verzoek via supportadres. Geen toezegging over externe systeemlogs. |
| Accounts/accountverwijdering | Geen accounts; accountverwijdering niet van toepassing. |
| Supportgegevens | Vrijwillige externe e-mail, geen in-app formulier, automatische bijlage of app-upload. Niet als automatische locatie- of diagnostiekverzameling aangeven. Definitieve reikwijdte van eigen ontvangst van appgerelateerde supportmail zo nodig bij Play Support bevestigen. |
| Onafhankelijke beveiligingscontrole | Niet uitgevoerd; niet aanvinken. |

Bij eventuele opname van supportmail: relevante categorieën zijn e-mailadres,
berichtinhoud en alleen daadwerkelijk verwerkte naam/bijlagen. Doel support/
developer communications, optioneel, niet uitsluitend tijdelijk. Niet zonder
bewijs alle correspondentie als end-to-end versleuteld of als vrijgesteld delen
classificeren. Het formulier is nog niet ingevuld; de supportclassificatie en
alle actieve Play-artifacts blijven laatste verificatiepunten.

## Supportbeleid (ongewijzigd)

Vrijwillig verstrekte afzender, inhoud, naam en bijlagen dienen uitsluitend voor
vragen, meldingen en opvolging. Bewaring maximaal twaalf maanden na de laatste
correspondentie, tenzij een wettelijke verplichting langer vereist.
Verwijderverzoeken: tobieapps.support@proton.me. Dit is organisatorisch beleid,
geen automatische wisfunctie. Appgegevens wissen verwijdert geen e-mail.
Proton en de e-mailaanbieder van de gebruiker verwerken het mailverkeer;
geen garantie over hun logs, backups, beveiliging of bewaartermijnen.

## Publicatiecontrole

- Publiceer de bijgewerkte nl.html en en.html samen met de nieuwe appversie;
  de nu openbare pagina's beschrijven nog de oudere Geocoder-build.
- Bestaande URLs blijven /JaarZon/privacy/nl.html en /en.html vanuit /docs.
- Controleer release-AAB/manifest en alle actieve Play-versies: geen Geocoder,
  geen nieuwe SDK of upload; oudere Geocoder-versies beïnvloeden de verklaring.
- Geef de uiteindelijke release een passende hogere versionCode vóór upload;
  deze beperkte fix verandert versie of ondertekening niet.
- Voer het supportbeleid daadwerkelijk uit en bevestig zo nodig bij Play Support
  de behandeling van uitsluitend buiten de app ontvangen supportmail.
- Geen Pages-activering, publicatie of Console-invoer uitgevoerd voor deze fix.

## Officiële bronnen

Geraadpleegd 18 november 2026:
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en-en).
- [Google Play User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
- [Android LocationManager](https://developer.android.com/reference/android/location/LocationManager).
- [Proton privacy](https://proton.me/legal/privacy).
- [GitHub privacy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
