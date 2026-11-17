// Run with: node --test tests/daylength.test.js
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createAstronomy} = require('../app/src/main/assets/daylength.js');
const {solarDay, yearDays, today, clock, goldenHour, goldenRange, daylightIntervals} = createAstronomy({latitude:51.8, longitude:4.57});
const vm = require('node:vm');
const fs = require('node:fs');
const day = date => solarDay(Date.parse(date));

test('Maastricht uses one Dutch timezone for sunrise, sunset, Golden Hour and bar in winter/summer', () => {
    const local = createAstronomy({latitude:50.8514,longitude:5.691,timeZone:'Europe/Amsterdam'});
    const utc = createAstronomy({latitude:50.8514,longitude:5.691,timeZone:'UTC'});
    for (const [date, offset] of [['2026-01-15',60],['2026-07-15',120]]) {
        const token = Date.parse(date), sun = local.solarDay(token), gold = local.goldenHour(token);
        assert.equal(sun.sunrise,utc.solarDay(token).sunrise);
        assert.equal(sun.sunset,utc.solarDay(token).sunset);
        assert.equal(sun.minutes,utc.solarDay(token).minutes);
        for (const instant of [sun.sunrise,sun.sunset,...Object.values(gold)]) {
            assert.equal(local.minuteOfDay(instant)-utc.minuteOfDay(instant),offset);
            assert.equal(local.today(new Date(instant)),token);
        }
        const bar = local.daylightIntervals(sun,gold);
        const utcBar = utc.daylightIntervals(utc.solarDay(token),utc.goldenHour(token));
        for (const key of ['daylight','morning','evening']) {
            assert.ok(Math.abs(bar[key].start-utcBar[key].start-offset)<0.001);
            assert.ok(Math.abs(bar[key].end-utcBar[key].end-offset)<0.001);
        }
    }
});

test('current-time marker uses active clock positions and DST, including explicit UTC', () => {
    const utc = createAstronomy({timeZone:'UTC'});
    for (const [hour, position] of [[0,0],[6,360],[12,720],[18,1080]]) {
        assert.equal(utc.minuteOfDay(Date.UTC(2026,5,21,hour)),position);
    }
    const nl = createAstronomy();
    assert.equal(nl.minuteOfDay(Date.parse('2026-06-20T22:00Z')),0);
    assert.equal(nl.minuteOfDay(Date.parse('2026-03-29T00:59Z')),119);
    assert.equal(nl.minuteOfDay(Date.parse('2026-03-29T01:00Z')),180);
    assert.equal(nl.minuteOfDay(Date.parse('2026-10-25T00:59Z')),179);
    assert.equal(nl.minuteOfDay(Date.parse('2026-10-25T01:00Z')),120);
    assert.equal(createAstronomy({timeZone:'America/New_York'}).minuteOfDay(Date.parse('2026-06-21T16:00Z')),720);
    assert.equal(createAstronomy({timeZone:'Europe/London'}).minuteOfDay(Date.parse('2026-06-21T11:00Z')),720);
    const android = createAstronomy({zoneRules:{zone:'Europe/Amsterdam',offsets:[[Date.UTC(2026,0,1),900]]}});
    assert.equal(android.minuteOfDay(Date.parse('2026-06-21T12:00Z')),735);
    assert.equal(nl.minuteOfDay(NaN),null);
});

test('default Amsterdam and yearly astronomical lengths are timezone-independent', () => {
    const amsterdam = createAstronomy();
    assert.equal(amsterdam.solarDay(Date.parse('2026-06-21')).minutes,
        createAstronomy({latitude:52.3676,longitude:4.9041,timeZone:'UTC'}).solarDay(Date.parse('2026-06-21')).minutes);
    for (const [latitude,longitude,zone] of [[40.7128,-74.006,'America/New_York'],[51.5074,-0.1278,'Europe/London'],[35.6762,139.6503,'Asia/Tokyo']]) {
        const utc = createAstronomy({latitude,longitude,timeZone:'UTC'});
        const local = createAstronomy({latitude,longitude,timeZone:zone});
        assert.deepEqual(utc.yearDays(2026).map(d=>d.minutes),local.yearDays(2026).map(d=>d.minutes));
    }
});

test('Android-provided offset transitions drive clocks, day boundaries, Golden Hour and bar', () => {
    const offsets = [[Date.UTC(2026,0,1),3600],[Date.UTC(2026,2,29,1),7200],[Date.UTC(2026,9,25,1),3600]];
    const android = createAstronomy({latitude:51.8,longitude:4.57,zoneRules:{zone:'Europe/Amsterdam',offsets}});
    for (const date of ['2026-03-28','2026-03-29','2026-10-24','2026-10-25']) {
        const token = Date.parse(date), sun = android.solarDay(token), golden = android.goldenHour(token);
        assert.equal(android.clock.format(sun.sunrise),clock.format(solarDay(token).sunrise));
        assert.equal(android.goldenRange(golden.morningStart,golden.morningEnd),goldenRange(goldenHour(token).morningStart,goldenHour(token).morningEnd));
        assert.deepEqual(android.daylightIntervals(sun,golden),daylightIntervals(solarDay(token),goldenHour(token)));
        assert.equal(android.today(new Date(sun.sunrise)),token);
    }
    const forced = createAstronomy({zoneRules:{zone:'Europe/Amsterdam',offsets:[[Date.UTC(2026,0,1),900]]}});
    assert.equal(forced.clock.format(Date.UTC(2026,5,21)), '00:15', 'uses supplied Android rules rather than WebView tzdb');
});

test('one location model drives year, Golden Hour and bar with an explicit time zone', () => {
    const dutch = createAstronomy();
    const other = createAstronomy({latitude: 40.71, longitude: -74, timeZone: 'UTC'});
    const date = Date.parse('2026-06-21');
    assert.notEqual(other.solarDay(date).minutes, dutch.solarDay(date).minutes);
    assert.notDeepEqual(other.goldenHour(date), dutch.goldenHour(date));
    assert.notDeepEqual(other.daylightIntervals(other.solarDay(date), other.goldenHour(date)),
        dutch.daylightIntervals(dutch.solarDay(date), dutch.goldenHour(date)));
    assert.equal(other.yearDays(2028).length, 366);
    assert.equal(other.today(new Date('2026-12-31T23:30Z')), Date.parse('2026-12-31'));
    assert.equal(dutch.today(new Date('2026-12-31T23:30Z')), Date.parse('2027-01-01'));
    const tokyo = createAstronomy({latitude: 35.68, longitude: 139.69, timeZone: 'Asia/Tokyo'});
    const tokyoDay = tokyo.solarDay(date);
    assert.equal(tokyo.today(new Date(tokyoDay.sunrise)), date);
    assert.ok(Number.isFinite(tokyoDay.minutes));
    assert.throws(() => createAstronomy({latitude: 91}), RangeError);
    assert.throws(() => createAstronomy({timeZone: 'Invalid/Zone'}), RangeError);
});

test('UTC dates with split daylight and polar day/night do not invent crossings', () => {
    const far = createAstronomy({latitude: 35, longitude: 170, timeZone: 'UTC'});
    const day = far.solarDay(Date.parse('2026-06-21'));
    const segments = far.daySegments(day);
    assert.equal(segments.length, 2);
    assert.equal(segments[0].start, 0);
    assert.equal(segments[1].end, 1440);
    assert.ok(day.sunset < day.sunrise);
    assert.ok(segments.reduce((sum, r) => sum + r.end - r.start, 0) > 800);
    const north = createAstronomy({latitude: 80, longitude: 15, timeZone: 'UTC'});
    const summer = north.solarDay(Date.parse('2026-06-21'));
    const winter = north.solarDay(Date.parse('2026-12-21'));
    assert.equal(summer.minutes, 1440); assert.equal(winter.minutes, 0);
    assert.equal(summer.sunrise, null); assert.equal(winter.sunset, null);
    assert.deepEqual(north.daySegments(summer), [{start: 0, end: 1440}]);
    assert.deepEqual(north.daySegments(winter), []);
    assert.equal(north.goldenHour(summer.date).morningStart, null);
    const transition = north.yearDays(2026).find(d => (d.sunrise === null) !== (d.sunset === null));
    assert.ok(transition);
    // A missing civil crossing makes the bar unknown, independently of solar-cycle duration.
    assert.equal(north.daySegments(transition), null);
    const midnightGolden = createAstronomy({latitude: 35, longitude: 70, timeZone: 'UTC'});
    const midnightDay = midnightGolden.solarDay(Date.parse('2026-06-21'));
    const gold = midnightGolden.goldenHour(midnightDay.date);
    assert.ok(gold.morningEnd < gold.morningStart);
    const orange = midnightGolden.goldenSegments(midnightDay);
    assert.equal(orange.length, 3);
    assert.ok(orange.some(r => r.start === 0));
    assert.ok(orange.some(r => r.end === 1440));
    assert.match(midnightGolden.goldenRange(gold.morningStart, gold.morningEnd), /Over middernacht/);
});

test('24-hour bar positions use Amsterdam clock time including both DST transitions', () => {
    const cases = [
        ['2026-06-21', 322, 294, 1353], ['2026-12-21', 526, 501, 1018],
        ['2026-03-28', 386, 365, 1169], ['2026-03-29', 443, 423, 1230],
        ['2026-10-24', 501, 480, 1130], ['2026-10-25', 443, 421, 1068]
    ];
    for (const [date, sunriseMinute, morningMinute, eveningMinute] of cases) {
        const sun = day(date), golden = goldenHour(sun.date);
        const intervals = daylightIntervals(sun, golden);
        assert.ok(Math.abs(intervals.daylight.start - sunriseMinute) < 1, date);
        assert.ok(Math.abs(intervals.morning.start - morningMinute) < 1, date);
        assert.ok(Math.abs(intervals.evening.end - eveningMinute) < 1, date);
        assert.ok(intervals.morning.start < intervals.daylight.start, 'orange before sunrise');
        assert.ok(intervals.evening.end > intervals.daylight.end, 'orange after sunset');
        for (const range of Object.values(intervals)) {
            assert.ok(range.start >= 0 && range.start < range.end && range.end <= 1440);
        }
    }
    const date = Date.parse('2026-12-21');
    const synthetic = daylightIntervals({date, sunrise: date + 5 * 3600000, sunset: date + 17 * 3600000}, {});
    assert.deepEqual(synthetic.daylight, {start: 360, end: 1080}); // 06–18 = 25%–75%.
    assert.deepEqual(daylightIntervals({date, sunrise: date - 3600000,
        sunset: date + 22 * 3600000 + 59 * 60000}, {}).daylight, {start: 0, end: 1439});
});

test('24-hour bar rejects missing, reversed, non-finite and wrong-date intervals', () => {
    const sun = day('2026-06-21'), golden = goldenHour(sun.date);
    for (const invalid of [null, undefined, NaN, Infinity, sun.date - 86400000, sun.sunset + 1]) {
        const result = daylightIntervals({...sun, sunrise: invalid}, golden);
        assert.equal(result.daylight, null);
        assert.notEqual(result.morning, null, 'valid Golden Hour remains available independently');
    }
    const result = daylightIntervals(sun, {...golden, morningStart: null, eveningEnd: NaN});
    assert.notEqual(result.daylight, null);
    assert.equal(result.morning, null);
    assert.equal(result.evening, null);
    assert.deepEqual(daylightIntervals({date: sun.date}, {}), {daylight: null, morning: null, evening: null});
});

test('Golden Hour summer and winter boundaries at Puttershoek', () => {
    for (const [date, expected] of [
        ['2026-06-21', ['04:54', '06:17', '21:09', '22:33']],
        ['2026-12-21', ['08:21', '09:48', '15:30', '16:58']]]) {
        const times = Object.values(goldenHour(Date.parse(date)));
        assert.deepEqual(times.map(t => clock.format(t)), expected);
        const sun = day(date);
        assert.ok(times[0] < sun.sunrise && sun.sunrise < times[1]);
        assert.ok(times[2] < sun.sunset && sun.sunset < times[3]);
    }
    // Every boundary stays on the selected Amsterdam day, including leap day
    // and the first/last days of the year; all four crossings are ordered.
    for (const {date} of [...yearDays(2026), ...yearDays(2028)]) {
        const times = Object.values(goldenHour(date));
        times.forEach(t => { assert.ok(Number.isFinite(t)); assert.equal(today(new Date(t)), date); });
        for (let i = 1; i < times.length; i++) assert.ok(times[i] > times[i - 1]);
    }
});

test('Golden Hour follows Amsterdam summer/winter clock changes', () => {
    for (const [before, after, expectedShift] of [
        ['2026-03-28', '2026-03-29', 60], ['2026-10-24', '2026-10-25', -60]]) {
        const first = Object.values(goldenHour(Date.parse(before)));
        const second = Object.values(goldenHour(Date.parse(after)));
        for (let i = 0; i < first.length; i++) {
            const minutes = t => { const [h, m] = clock.format(t).split(':').map(Number); return h * 60 + m; };
            assert.ok(Math.abs(minutes(second[i]) - minutes(first[i]) - expectedShift) <= 3);
            assert.ok(Math.abs((second[i] - first[i]) / 60000 - 1440) < 3);
        }
    }
});

test('missing Golden Hour boundaries produce a clear message, never an invented time', () => {
    // No missing boundaries occur at Puttershoek in a normal year. Exercise
    // polar cases through calculation arguments, without adding location UI.
    const summer = goldenHour(Date.parse('2026-06-21'), 66, 4.57);
    assert.equal(summer.morningStart, null);
    assert.equal(summer.eveningEnd, null);
    assert.ok(Number.isFinite(summer.morningEnd));
    const winter = goldenHour(Date.parse('2026-12-21'), 80, 4.57);
    assert.deepEqual(Object.values(winter), [null, null, null, null]);
    assert.match(goldenRange(summer.morningStart, summer.morningEnd), /grensmoment ontbreekt/);
    assert.match(goldenRange(winter.eveningStart, winter.eveningEnd), /Niet beschikbaar/);
    // Find the real crossing on this local date, even when its solar cycle
    // starts on an adjacent UTC date (important outside the Netherlands).
    const shifted = goldenHour(Date.parse('2026-06-21'), 51.8, 170);
    assert.equal(today(new Date(shifted.morningStart)), Date.parse('2026-06-21'));
    assert.equal(today(new Date(shifted.morningEnd)), Date.parse('2026-06-21'));
});

test('solstices and equinoxes at Puttershoek (minutes)', () => {
    for (const [date, expected] of [['2026-06-21', 1002], ['2026-12-21', 467],
        ['2026-03-20', 730], ['2026-09-23', 729]]) {
        assert.ok(Math.abs(day(date).minutes - expected) < 2, date);
    }
    const days = yearDays(2026);
    assert.equal(new Date(days.reduce((a,b) => a.minutes > b.minutes ? a : b).date).toISOString().slice(0,10), '2026-06-21');
    assert.equal(new Date(days.reduce((a,b) => a.minutes < b.minutes ? a : b).date).toISOString().slice(0,10), '2026-12-21');
});
test('leap year and complete year boundaries', () => {
    const days = yearDays(2024);
    assert.equal(days.length, 366);
    assert.equal(days[59].date, Date.UTC(2024, 1, 29));
    assert.equal(days[365].date, Date.UTC(2024, 11, 31));
    assert.equal(yearDays(2025).length, 365);
    assert.equal(yearDays(2000).length, 366);
    assert.equal(yearDays(2100).length, 365);
    for (const year of [2024, 2026, 2100]) {
        const fullYear = yearDays(year);
        for (let i = 0; i < fullYear.length; i++) {
            assert.equal(fullYear[i].date, Date.UTC(year, 0, 1) + i * 86400000);
            assert.ok(Number.isFinite(fullYear[i].minutes));
            assert.ok(fullYear[i].minutes > 0 && fullYear[i].minutes < 1440);
        }
    }
});
test('Amsterdam today including year boundary and DST transitions', () => {
    for (const [instant, expected] of [
        ['2026-12-31T23:30:00Z', '2027-01-01'],
        ['2026-06-20T22:30:00Z', '2026-06-21'],
        ['2026-03-28T23:30:00Z', '2026-03-29'],
        ['2026-10-24T22:30:00Z', '2026-10-25'],
        ['2026-10-25T23:30:00Z', '2026-10-26']]) {
        const date = today(new Date(instant));
        assert.equal(date, Date.parse(expected));
        assert.equal(yearDays(new Date(date).getUTCFullYear()).filter(d => d.date === date).length, 1);
    }
    assert.equal(clock.format(Date.parse('2026-03-29T01:30:00Z')), '03:30');
    assert.equal(clock.format(Date.parse('2026-10-25T01:30:00Z')), '02:30');
    assert.equal(clock.format(day('2026-06-21').sunrise), '05:22');
    assert.equal(clock.format(day('2026-12-21').sunrise), '08:46');
});

test('actual widget marks today, supports touch/keyboard and redraws across New Year', () => {
    let instant = Date.parse('2026-12-31T22:59:00Z');
    let scheduled;
    const timers = new Map();
    let nextTimer = 0;
    const listeners = {};
    const fields = {};
    class Element {
        constructor() { this.attributes = {}; this.children = []; this.listeners = {}; }
        setAttribute(key, value) { this.attributes[key] = value; }
        append(node) { this.children.push(node); }
        replaceChildren() { this.children = []; }
        addEventListener(name, fn) { this.listeners[name] = fn; }
        dispatchEvent(event) { this.listeners[event.type](event); }
        getBoundingClientRect() { return {left: 0, width: 280}; }
    }
    const widget = {querySelector: selector => fields[selector] ||= new Element()};
    class ClockDate extends Date {
        constructor(...args) { super(...(args.length ? args : [instant])); }
        static now() { return instant; }
    }
    const context = {
        Date: ClockDate, Intl, Math,
        window: {location: {}, addEventListener: (name, fn) => { listeners[name] = fn; }},
        document: {
            hidden: false,
            querySelector: () => widget,
            createElementNS: () => new Element(),
            addEventListener: (name, fn) => { listeners[name] = fn; }
        },
        PointerEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
        clearTimeout(id) { timers.delete(id); },
        setTimeout(fn, delay) {
            const id = ++nextTimer;
            timers.set(id,{fn,delay});
            if (fn.name === 'refresh') scheduled = {fn,delay};
            return id;
        }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../app/src/main/assets/i18n.js'), 'utf8'), context);
    vm.runInNewContext(fs.readFileSync(require.resolve('../app/src/main/assets/daylength.js'), 'utf8'), context);
    listeners.DOMContentLoaded();
    assert.match(fields['[data-daylength-value]'].textContent, /u/);
    listeners['jaarzon-location']({detail: {latitude:51.8, longitude:4.57, timeZone:'Europe/Amsterdam',label:'Puttershoek testreferentie',zoneLabel:'Europe/Amsterdam'}});
    const chart = fields['[data-daylength-chart]'];
    const marker = () => chart.children.find(n => n.attributes.class === 'daylength-today');
    assert.equal(marker().attributes.x1, 348);
    assert.ok(scheduled.delay > 59000 && scheduled.delay < 61000);
    const nowMarker = fields['[data-daylength-now]'];
    const nowLine = fields['[data-daylength-now-line]'];
    assert.equal(nowMarker.attributes['data-visible'],'true');
    assert.equal(nowLine.attributes.x1,1439);
    const minuteTimer = () => [...timers.values()].find(t => t.fn.name === 'minuteTick');
    assert.ok(minuteTimer().delay > 59000 && minuteTimer().delay < 61000);
    chart.listeners.pointerdown({clientX: 25});
    assert.match(fields['[data-daylength-date]'].textContent, /januari/);
    assert.equal(nowMarker.attributes['data-visible'],'false');
    assert.equal(minuteTimer(),undefined);
    chart.listeners.keydown({key: 'Home', preventDefault() {}});
    const jan1 = day('2026-01-01').minutes;
    const roundedJan1 = Math.round(jan1);
    assert.equal(fields['[data-daylength-value]'].textContent,
        `${Math.floor(roundedJan1 / 60)}u ${String(roundedJan1 % 60).padStart(2, '0')}m`);
    const goldenText = () => ['golden-morning', 'golden-evening'].map(name => fields[`[data-daylength-${name}]`].textContent);
    const januaryGolden = goldenText();
    const bar = fields['[data-daylength-bar]'];
    const barRects = () => bar.children.map(node => ({...node.attributes}));
    const januaryBar = barRects();
    assert.equal(januaryBar.length, 4);
    assert.equal(januaryBar[0].width, 1440);
    assert.deepEqual(januaryBar.map(r => r.class), ['daystrip-night', 'daystrip-daylight', 'daystrip-golden', 'daystrip-golden']);
    assert.ok(januaryBar[2].x < januaryBar[1].x);
    assert.ok(januaryBar[3].x + januaryBar[3].width > januaryBar[1].x + januaryBar[1].width);
    const janGolden = goldenHour(Date.parse('2026-01-01'));
    assert.deepEqual(januaryGolden, [goldenRange(janGolden.morningStart, janGolden.morningEnd), goldenRange(janGolden.eveningStart, janGolden.eveningEnd)]);
    assert.equal(marker().attributes.x1, 348, 'selection must not move today');
    chart.listeners.keydown({key: 'End', preventDefault() {}});
    assert.match(fields['[data-daylength-date]'].textContent, /31 december/);
    fields['[data-daylength-today]'].listeners.click();
    assert.match(fields['[data-daylength-date]'].textContent, /31 december/);
    const todayGolden = goldenText();
    const todayBar = barRects();
    assert.equal(nowMarker.attributes['data-visible'],'true');
    assert.notDeepEqual(todayBar, januaryBar);
    assert.notDeepEqual(todayGolden, januaryGolden);
    chart.listeners.keydown({key: 'Home', preventDefault() {}});
    assert.match(fields['[data-daylength-trend]'].textContent, /langer/);
    assert.match(fields['[data-daylength-change]'].textContent, /vorige dag/);
    chart.listeners.pointerdown({clientX: 140});
    assert.match(fields['[data-daylength-trend]'].textContent, /langer|korter|gelijk/);
    fields['[data-daylength-today]'].listeners.click();
    assert.match(fields['[data-daylength-date]'].textContent, /31 december/);
    assert.deepEqual(goldenText(), todayGolden);
    assert.deepEqual(barRects(), todayBar);
    instant = Date.parse('2026-12-31T23:00:01Z');
    scheduled.fn();
    assert.equal(marker().attributes.x1, 32);
    assert.match(chart.attributes['aria-label'], /2027/);
    assert.equal(chart.children.find(n => n.attributes.class === 'daylength-curve').attributes.points.split(' ').length, 365);
    instant = Date.parse('2028-02-29T11:00:00Z');
    scheduled.fn();
    assert.equal(chart.children.find(n => n.attributes.class === 'daylength-curve').attributes.points.split(' ').length, 366);
    assert.match(fields['[data-daylength-date]'].textContent, /29 februari 2028/);
    chart.listeners.pointerdown({clientX: 280, pointerType: 'touch'});
    assert.match(fields['[data-daylength-date]'].textContent, /31 december/);
    fields['[data-daylength-today]'].listeners.click();
    assert.match(fields['[data-daylength-date]'].textContent, /29 februari/);
    assert.equal(nowLine.attributes.x1,720);
    instant += 60000;
    minuteTimer().fn();
    assert.equal(nowLine.attributes.x1,721);
    listeners['jaarzon-active']({detail:false});
    assert.equal(timers.size,0,'no timers while Android is paused');
    assert.equal(nowMarker.attributes['data-visible'],'false');
    instant += 120000;
    listeners['jaarzon-active']({detail:true});
    assert.equal(nowMarker.attributes['data-visible'],'true');
    assert.equal(nowLine.attributes.x1,723);
    context.document.hidden = true;
    listeners.visibilitychange();
    assert.equal(timers.size,0,'no timers while document is hidden');
    context.document.hidden = false;
    listeners.visibilitychange();
    assert.equal(nowMarker.attributes['data-visible'],'true');
    const oldCurve = chart.children.find(n => n.attributes.class === 'daylength-curve').attributes.points;
    const oldGolden = goldenText();
    const oldBar = barRects();
    listeners['jaarzon-location']({detail: {latitude: 40.71, longitude: -74, timeZone: 'UTC',
        label: 'Locatie: 40.71° N, 74.00° W', zoneLabel: 'Tijdzone: UTC — lokale tijdzone offline onbekend'}});
    assert.notEqual(chart.children.find(n => n.attributes.class === 'daylength-curve').attributes.points, oldCurve);
    assert.notDeepEqual(goldenText(), oldGolden);
    assert.notDeepEqual(barRects(), oldBar);
    assert.match(fields['[data-daylength-date]'].textContent, /29 februari/);
    assert.match(fields['[data-daylength-zone]'].textContent, /UTC/);
    assert.equal(nowLine.attributes.x1,663);
    assert.match(nowMarker.attributes['aria-label'], /UTC/);
    listeners['jaarzon-location']({detail: {latitude: 51.8, longitude: 4.57, timeZone: 'Europe/Amsterdam',
        label: 'Locatie: Puttershoek (standaard)', zoneLabel: 'Tijdzone: Europe/Amsterdam'}});
    assert.equal(chart.children.find(n => n.attributes.class === 'daylength-curve').attributes.points, oldCurve);
    assert.deepEqual(goldenText(), oldGolden);
    assert.deepEqual(barRects(), oldBar);
    assert.equal(nowLine.attributes.x1,723);
});
