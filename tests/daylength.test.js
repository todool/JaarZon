// Run with: node --test tests/daylength.test.js
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {solarDay, yearDays, today, clock, goldenHour, goldenRange} = require('../app/src/main/assets/daylength.js');
const vm = require('node:vm');
const fs = require('node:fs');
const day = date => solarDay(Date.parse(date));

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
    // A geometrically valid crossing on another Amsterdam date is rejected.
    const shifted = goldenHour(Date.parse('2026-06-21'), 51.8, 170);
    assert.equal(shifted.morningStart, null);
    assert.equal(shifted.morningEnd, null);
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
        document: {
            hidden: false,
            querySelector: () => widget,
            createElementNS: () => new Element(),
            addEventListener: (name, fn) => { listeners[name] = fn; }
        },
        PointerEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
        clearTimeout() {},
        setTimeout(fn, delay) { scheduled = {fn, delay}; }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../app/src/main/assets/daylength.js'), 'utf8'), context);
    listeners.DOMContentLoaded();
    const chart = fields['[data-daylength-chart]'];
    const marker = () => chart.children.find(n => n.attributes.class === 'daylength-today');
    assert.equal(marker().attributes.x1, 348);
    assert.ok(scheduled.delay > 59000 && scheduled.delay < 61000);
    chart.listeners.pointerdown({clientX: 25});
    assert.match(fields['[data-daylength-date]'].textContent, /januari/);
    chart.listeners.keydown({key: 'Home', preventDefault() {}});
    const jan1 = day('2026-01-01').minutes;
    const roundedJan1 = Math.round(jan1);
    assert.equal(fields['[data-daylength-value]'].textContent,
        `${Math.floor(roundedJan1 / 60)}u ${String(roundedJan1 % 60).padStart(2, '0')}m`);
    const goldenText = () => ['golden-morning', 'golden-evening'].map(name => fields[`[data-daylength-${name}]`].textContent);
    const januaryGolden = goldenText();
    const janGolden = goldenHour(Date.parse('2026-01-01'));
    assert.deepEqual(januaryGolden, [goldenRange(janGolden.morningStart, janGolden.morningEnd), goldenRange(janGolden.eveningStart, janGolden.eveningEnd)]);
    assert.equal(marker().attributes.x1, 348, 'selection must not move today');
    chart.listeners.keydown({key: 'End', preventDefault() {}});
    assert.match(fields['[data-daylength-date]'].textContent, /31 december/);
    fields['[data-daylength-today]'].listeners.click();
    assert.match(fields['[data-daylength-date]'].textContent, /31 december/);
    const todayGolden = goldenText();
    assert.notDeepEqual(todayGolden, januaryGolden);
    chart.listeners.keydown({key: 'Home', preventDefault() {}});
    assert.match(fields['[data-daylength-trend]'].textContent, /langer/);
    assert.match(fields['[data-daylength-change]'].textContent, /vorige dag/);
    chart.listeners.pointerdown({clientX: 140});
    assert.match(fields['[data-daylength-trend]'].textContent, /langer|korter|gelijk/);
    fields['[data-daylength-today]'].listeners.click();
    assert.match(fields['[data-daylength-date]'].textContent, /31 december/);
    assert.deepEqual(goldenText(), todayGolden);
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
});
