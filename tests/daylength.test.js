// Run with: node --test tests/daylength.test.js
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {solarDay, yearDays, today, clock} = require('../app/src/main/assets/daylength.js');
const vm = require('node:vm');
const fs = require('node:fs');
const day = date => solarDay(Date.parse(date));

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
    assert.equal(marker().attributes.x1, 348, 'selection must not move today');
    chart.listeners.keydown({key: 'End', preventDefault() {}});
    assert.match(fields['[data-daylength-date]'].textContent, /31 december/);
    fields['[data-daylength-today]'].listeners.click();
    assert.match(fields['[data-daylength-date]'].textContent, /31 december/);
    chart.listeners.keydown({key: 'Home', preventDefault() {}});
    assert.match(fields['[data-daylength-trend]'].textContent, /langer/);
    assert.match(fields['[data-daylength-change]'].textContent, /vorige dag/);
    chart.listeners.pointerdown({clientX: 140});
    assert.match(fields['[data-daylength-trend]'].textContent, /langer|korter|gelijk/);
    fields['[data-daylength-today]'].listeners.click();
    assert.match(fields['[data-daylength-date]'].textContent, /31 december/);
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
