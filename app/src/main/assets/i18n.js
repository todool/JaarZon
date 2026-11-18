/* Local UI translations. Keep identical keys in every language. No network. */
(function (root) {
    'use strict';
    const messages = {
        nl: {
            eyebrow:'DAGLICHT · OFFLINE', privacy:'Privacyverklaring', language:'Taal', automatic:'Automatisch (systeemtaal)', dutch:'Nederlands', english:'English',
            location:'Locatie: {place}', defaultLocation:'Locatie: Amsterdam, Nederland (standaard)', zone:'Tijdzone: {zone}',
            locate:'Locatie vernieuwen', chartTitle:'Daglengte in het kalenderjaar', year:'Daglicht in {year}', today:'Vandaag',
            selectedDate:'Geselecteerde datum', hint:'Raak de grafiek aan of sleep om een dag te kiezen.',
            barTitle:'24-uurs daglichtbalk', now:'Actuele tijd {time} ({zone})', night:'Nacht', daylight:'Daglicht', golden:'Golden Hour',
            selectedDay:'GESELECTEERDE DAG', morning:'Ochtend:', evening:'Avond:', extremes:'Langste en kortste dag',
            longest:'LANGSTE DAG', shortest:'KORTSTE DAG', footer:'Berekend voor bovenstaande locatie en tijdzone · Volledig offline',
            horizon:'Vrije horizon en gemiddelde atmosferische refractie.', unavailable:'Niet beschikbaar', hourUnit:'u', duration:'{hours}u {minutes}m', differenceDuration:'{minutes}m {seconds}s', months:'JFMAMJJASOND',
            differenceMissing:'Verschil niet beschikbaar', difference:'{value} t.o.v. de vorige dag',
            longer:'De dagen worden langer', shorter:'De dagen worden korter', steady:'De daglengte blijft vrijwel gelijk',
            times:'Zonsopkomst {rise} · Zonsondergang {set}', missing:'ontbreekt',
            goldenMissing:'Niet beschikbaar: een grensmoment ontbreekt op deze datum.',
            midnight:'Over middernacht (grenzen vandaag: {start} / {end})', incomplete:'Onvolledige gegevens',
            bar:'24-uurs daglichtbalk voor {date}. Nacht: donkerblauw; daglicht: geel; Golden Hour: oranje.',
            barMissing:' Ontbrekende intervallen zijn niet ingetekend; grijs betekent onbekend.',
            chart:'Daglengte {year}. Rode lijn: vandaag. Gebruik de pijltoetsen om een datum te kiezen.'
        },
        en: {
            eyebrow:'DAYLIGHT · OFFLINE', privacy:'Privacy Policy', language:'Language', automatic:'Automatic (system language)', dutch:'Nederlands', english:'English',
            location:'Location: {place}', defaultLocation:'Location: Amsterdam, Netherlands (default)', zone:'Time zone: {zone}',
            locate:'Refresh location', chartTitle:'Day length throughout the calendar year', year:'Daylight in {year}', today:'Today',
            selectedDate:'Selected date', hint:'Touch or drag across the chart to choose a day.',
            barTitle:'24-hour daylight bar', now:'Current time {time} ({zone})', night:'Night', daylight:'Daylight', golden:'Golden Hour',
            selectedDay:'SELECTED DAY', morning:'Morning:', evening:'Evening:', extremes:'Longest and shortest day',
            longest:'LONGEST DAY', shortest:'SHORTEST DAY', footer:'Calculated for the location and time zone above · Fully offline',
            horizon:'Unobstructed horizon and average atmospheric refraction.', unavailable:'Unavailable', hourUnit:'h', duration:'{hours}h {minutes}m', differenceDuration:'{minutes}m {seconds}s', months:'JFMAMJJASOND',
            differenceMissing:'Difference unavailable', difference:'{value} compared with the previous day',
            longer:'The days are getting longer', shorter:'The days are getting shorter', steady:'Day length is almost unchanged',
            times:'Sunrise {rise} · Sunset {set}', missing:'unavailable',
            goldenMissing:'Unavailable: a boundary event does not occur on this date.',
            midnight:'Across midnight (today’s boundaries: {start} / {end})', incomplete:'Incomplete data',
            bar:'24-hour daylight bar for {date}. Night: dark blue; daylight: yellow; Golden Hour: orange.',
            barMissing:' Missing intervals are omitted; grey means unknown.',
            chart:'Day length {year}. Red line: today. Use the arrow keys to choose a date.'
        }
    };
    function language(tag) { return String(tag || '').toLowerCase().split(/[-_]/)[0] === 'en' ? 'en' : 'nl'; }
    function translator(tag) {
        const lang = language(tag);
        return (key, values = {}) => {
            if (!(key in messages[lang])) throw new Error('Unknown translation key: ' + key);
            return messages[lang][key].replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
        };
    }
    const api = {messages, language, translator};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.JaarZonI18n = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
