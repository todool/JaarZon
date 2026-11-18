const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {messages, language, translator} = require('../app/src/main/assets/i18n.js');
const {createAstronomy} = require('../app/src/main/assets/daylength.js');

test('privacy link is a translated, keyboard-accessible local route with no remote WebView navigation', () => {
    assert.equal(translator('nl')('privacy'),'Privacyverklaring');
    assert.equal(translator('en')('privacy'),'Privacy Policy');
    const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
    assert.match(html,/<a\b[^>]*href="privacy"[^>]*data-i18n="privacy"/);
    assert.doesNotMatch(html,/<a\b[^>]*target="_blank"/);
});

test('native resources have matching keys and formats; HTML contains only translation keys', () => {
    const strings = dir => Object.fromEntries([...fs.readFileSync(`app/src/main/res/${dir}/strings.xml`, 'utf8')
        .matchAll(/<string name="([^"]+)">([^<]*)<\/string>/g)].map(m => [m[1],m[2]]));
    const nl = strings('values'), en = strings('values-en');
    assert.deepEqual(Object.keys(nl).sort(),Object.keys(en).sort());
    for (const key of Object.keys(nl)) {
        assert.ok(en[key].length);
        assert.deepEqual(nl[key].match(/%\d+\$[.\d]*[sfd]/g),en[key].match(/%\d+\$[.\d]*[sfd]/g),key);
    }
    const java = fs.readFileSync('app/src/main/java/nl/jaarzon/MainActivity.java','utf8');
    for (const match of java.matchAll(/R\.string\.(\w+)/g)) assert.ok(nl[match[1]],match[1]);
    const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
    for (const match of html.matchAll(/>([^<>]+)</g)) {
        const text=match[1].trim();
        if (text) assert.match(text,/^(JaarZon|☀|↻|00|06|12|18|24)$/);
    }
});

test('system language fallback and complete translation keys/placeholders', () => {
    for (const tag of ['nl', 'nl-NL', 'de-DE', 'fr', '', null]) assert.equal(language(tag), 'nl');
    for (const tag of ['en', 'en-US', 'EN-GB']) assert.equal(language(tag), 'en');
    assert.deepEqual(Object.keys(messages.nl).sort(), Object.keys(messages.en).sort());
    for (const key of Object.keys(messages.nl)) {
        assert.ok(messages.en[key].length);
        assert.deepEqual((messages.nl[key].match(/\{\w+\}/g)||[]).sort(), (messages.en[key].match(/\{\w+\}/g)||[]).sort());
    }
    const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
    for (const match of html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)) assert.ok(messages.nl[match[1]], match[1]);
    assert.equal(translator('en')('year', {year:2026}), 'Daylight in 2026');
    assert.equal(translator('fr')('today'), 'Vandaag');
});

test('locale dates and 24-hour clocks change only presentation, never astronomical results', () => {
    for (const timeZone of ['Europe/Amsterdam','Europe/London','America/New_York','UTC']) {
        const nl = createAstronomy({language:'nl',timeZone}), en = createAstronomy({language:'en',timeZone});
        assert.deepEqual(nl.yearDays(2028), en.yearDays(2028));
        assert.equal(en.dateFormat.format(Date.parse('2026-11-17')), '17 November 2026');
        assert.equal(nl.dateFormat.format(Date.parse('2026-11-17')), '17 november 2026');
        for (const date of ['2026-01-15','2026-07-15','2026-03-29','2026-10-25']) {
            const token = Date.parse(date), sun = nl.solarDay(token);
            assert.deepEqual(nl.goldenHour(token), en.goldenHour(token));
            assert.deepEqual(nl.daylightIntervals(sun,nl.goldenHour(token)), en.daylightIntervals(sun,en.goldenHour(token)));
            assert.equal(nl.clock.format(sun.sunrise), en.clock.format(sun.sunrise));
            assert.equal(nl.today(new Date(sun.sunrise)),en.today(new Date(sun.sunrise)));
        }
    }
    assert.equal(createAstronomy({language:'en'}).dateFormat.format(Date.parse('2026-11-17')), '17 November 2026');
    assert.equal(createAstronomy({language:'nl'}).dateFormat.format(Date.parse('2026-11-17')), '17 november 2026');
    assert.equal(createAstronomy({language:'en'}).goldenRange(null,null),messages.en.goldenMissing);
    assert.equal(createAstronomy({language:'en'}).duration(null),'Unavailable');
});

test('English WebView selection, Today, unknown location and missing events stay translated', () => {
    const listeners = {}, fields = {};
    class Element {
        constructor(){this.attributes={};this.children=[];this.listeners={};}
        setAttribute(k,v){this.attributes[k]=v;}
        addEventListener(k,f){this.listeners[k]=f;}
        append(n){this.children.push(n);}
        replaceChildren(){this.children=[];}
        getBoundingClientRect(){return {left:0,width:360};}
    }
    const widget={querySelector:k=>fields[k] ||= new Element()};
    const context={JaarZonLanguage:'en',Intl,Date,Math,
        document:{querySelector:()=>widget,createElementNS:()=>new Element(),addEventListener:(k,f)=>listeners[k]=f,hidden:false},
        window:{location:{},addEventListener:(k,f)=>listeners[k]=f},setTimeout:()=>1,clearTimeout:()=>{}};
    for (const file of ['i18n.js','daylength.js']) vm.runInNewContext(fs.readFileSync('app/src/main/assets/'+file,'utf8'),context);
    listeners.DOMContentLoaded();
    const field=k=>fields[`[data-daylength-${k}]`];
    assert.match(field('year').textContent,/Daylight in/);
    assert.equal(field('language').textContent,'Language');
    field('chart').listeners.keydown({key:'Home',preventDefault(){}});
    assert.match(field('date').textContent,/1 January/);
    assert.match(field('times').textContent,/Sunrise .*Sunset/);
    assert.match(field('change').textContent,/compared with the previous day/);
    field('language').listeners.click();
    assert.match(context.window.location.href,/\/language\?date=\d+/);
    field('today').listeners.click();
    assert.equal(field('date').textContent,createAstronomy({language:'en'}).dateFormat.format(createAstronomy().today()));
    listeners['jaarzon-location']({detail:{latitude:90,longitude:0,timeZone:'UTC',label:'Location: 90° N, 0° E',zoneLabel:'Time zone: UTC — local time zone unknown offline'}});
    assert.match(field('zone').textContent,/unknown offline/);
    assert.equal(field('golden-morning').textContent,messages.en.goldenMissing);
    assert.match(field('bar').attributes['aria-label'],/24-hour daylight bar/);
    assert.equal(field('footer').textContent,messages.en.footer);
});

test('Android location stays local without a place lookup service', () => {
    const activity=fs.readFileSync('app/src/main/java/nl/jaarzon/MainActivity.java','utf8');
    assert.doesNotMatch(activity,/Geocoder|getFromLocation|findPlace|geocodeWorker|PlaceLookup/);
    assert.match(activity,/LocationPolicy\.savedPlace\(currentLatitude, currentLongitude/);
    assert.match(activity,/requestLocationUpdates/);
    assert.match(activity,/setBlockNetworkLoads\(true\)/);
    const manifest=fs.readFileSync('app/src/main/AndroidManifest.xml','utf8');
    assert.doesNotMatch(manifest,/android.permission.INTERNET/);
});
