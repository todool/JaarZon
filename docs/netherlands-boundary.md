# Offline Nederlandse tijdzonegrens

Bron: Kadaster/PDOK, BRK Bestuurlijke Gebieden, Landgebied LND6030 (Nederland).
- Bron: https://api.pdok.nl/kadaster/brk-bestuurlijke-gebieden/ogc/v1/collections/landgebied/items?f=json&limit=10
- Beschrijving: https://www.pdok.nl/ogc-apis/-/article/bestuurlijke-gebieden
- Licentie: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/deed.nl
- Naamsvermelding: Kadaster/PDOK, BRK Bestuurlijke Gebieden.
- Opgehaald: 17 november 2026; bron bijgewerkt tot 28 januari 2026.
- SHA-256 bronbestand: d1eba2683c8a6257a419ac9078f54bdc0659d132d520705ce5089051b0f5e1c6

NetherlandsBoundary bundelt 9 polygonen, 31 ringen inclusief enclavegaten,
37594 hoekpunten. Geen geometrische vereenvoudiging. Coördinaten zijn afgerond op
zes decimalen (circa 0.1 meter), als 32-bit integers opgeslagen en met standaard
GZIP/Base64 gecodeerd. Dit is de enige afgeleide wijziging aan de brongeometrie.
Geen runtime-download, database of extra dependency. Het originele bronbestand
staat alleen in genegeerde buildoutput.

De gerapporteerde positie bepaalt het land. De nauwkeurigheid blijft afzonderlijk
begrensd tot 5 km door LocationPolicy; zij wist een herkende Nederlandse positie
niet langer uit, zoals bij de oude Maastricht-cirkel van 1.5 km. Bij GPS-onzekerheid
rond een landsgrens wordt de gerapporteerde positie geclassificeerd; de app kan
niet weten aan welke kant de gebruiker werkelijk staat. Grenswijzigingen na de
brondatum vereisen een data-update. Caribisch Nederland is niet dit Europese
landgebied en krijgt niet ten onrechte Europe/Amsterdam.

Een eerste proef met gegeneraliseerde Natural Earth 1:10.000.000-grenzen werd
verworpen omdat de Vaals-regressietest faalde. Alleen de officiële PDOK-data is
gebundeld in de definitieve implementatie.

Regenereren met een lokaal bronbestand: `node scripts/generate-netherlands-boundary.js app/build/timezone-source/pdok.geojson`. Het script gebruikt geen netwerk of dependencies. De APK bundelt de naamsvermelding en licentielinks in assets/NOTICE.txt.
