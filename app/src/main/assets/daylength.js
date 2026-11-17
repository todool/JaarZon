/* NOAA/Meeus solar coordinates; sunrise/set at solar centre altitude -0.833°.
 * Includes mean refraction and solar radius, assumes an unobstructed horizon.
 * https://gml.noaa.gov/grad/solcalc/calcdetails.html
 * Calendar dates are UTC tokens; presentation uses the explicitly selected zone.
 */
(function () {
    "use strict";
    const i18n = typeof module !== "undefined" && module.exports ? require('./i18n.js') : globalThis.JaarZonI18n;
    let language = i18n.language(globalThis.JaarZonLanguage);
    let t = i18n.translator(language);
    const DAY = 86400000;
    const RAD = Math.PI / 180;
    function createAstronomy({latitude = 52.3676, longitude = 4.9041, timeZone = "Europe/Amsterdam", zoneRules = null, language = "nl"} = {}) {
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new RangeError("Invalid coordinates");
    const zone = timeZone;
    const lang = i18n.language(language), tr = i18n.translator(lang);
    const locale = lang === "en" ? "en-GB" : "nl-NL";
    function formatter(locale, options) {
        if (!zoneRules || zoneRules.zone !== zone || !Array.isArray(zoneRules.offsets) || !zoneRules.offsets.length)
            return new Intl.DateTimeFormat(locale, {...options, timeZone: zone});
        const utc = new Intl.DateTimeFormat(locale, {...options, timeZone: "UTC"});
        function shifted(input = new Date()) {
            const instant = Number(input);
            let offset = zoneRules.offsets[0][1];
            for (const entry of zoneRules.offsets) { if (entry[0] > instant) break; offset = entry[1]; }
            return new Date(instant + offset * 1000);
        }
        return {format: input => utc.format(shifted(input)), formatToParts: input => utc.formatToParts(shifted(input))};
    }
    // Calendar tokens are dates, not instants: avoid moving them to the previous day west of UTC.
    const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone:"UTC"});
    const shortFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone:"UTC"});
    const clock = formatter(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
    const calendarFormat = formatter("en-CA", { year: "numeric", month: "2-digit", day: "2-digit"});
    function today(now = new Date()) {
        const parts = calendarFormat.formatToParts(now);
        const part = name => Number(parts.find(p => p.type === name).value);
        return Date.UTC(part("year"), part("month") - 1, part("day"));
    }
    function coordinates(ms) {
        const t = (ms / DAY + 2440587.5 - 2451545) / 36525;
        const l = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
        const m = (357.52911 + t * (35999.05029 - 0.0001537 * t)) * RAD;
        const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
        const c = Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t))
            + Math.sin(2 * m) * (0.019993 - 0.000101 * t) + Math.sin(3 * m) * 0.000289;
        const omega = (125.04 - 1934.136 * t) * RAD;
        const lambda = (l + c - 0.00569 - 0.00478 * Math.sin(omega)) * RAD;
        const epsilon = (23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
            + 0.00256 * Math.cos(omega)) * RAD;
        const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
        const y = Math.tan(epsilon / 2) ** 2;
        const eq = 4 / RAD * (y * Math.sin(2 * l * RAD) - 2 * e * Math.sin(m)
            + 4 * e * y * Math.sin(m) * Math.cos(2 * l * RAD)
            - 0.5 * y * y * Math.sin(4 * l * RAD) - 1.25 * e * e * Math.sin(2 * m));
        return {declination, eq};
    }
    const midnightFormat = formatter("en-GB", { year: "numeric", month: "numeric", day: "numeric", hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric"});
    function midnight(date) {
        let instant = date;
        for (let i = 0; i < 4; i++) {
            const parts = midnightFormat.formatToParts(instant);
            const v = name => Number(parts.find(p => p.type === name).value);
            instant += date - Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
        }
        return instant;
    }
    function crossing(anchor, altitude, sign, lat = latitude, lon = longitude) {
        let minutes = 720 - 4 * lon + sign * 360;
        for (let i = 0; i < 4; i++) {
            const {declination: d, eq} = coordinates(anchor + minutes * 60000);
            const cosine = (Math.sin(altitude * RAD) - Math.sin(lat * RAD) * Math.sin(d))
                / (Math.cos(lat * RAD) * Math.cos(d));
            if (!Number.isFinite(cosine) || cosine < -1 || cosine > 1) return null;
            minutes = 720 - 4 * lon - eq + sign * 4 * Math.acos(cosine) / RAD;
        }
        return anchor + minutes * 60000;
    }
    function eventOnDate(date, altitude, sign, lat = latitude, lon = longitude) {
        for (const offset of [-DAY, 0, DAY]) {
            const instant = crossing(date + offset, altitude, sign, lat, lon);
            if (Number.isFinite(instant) && today(new Date(instant)) === date) return instant;
        }
        return null;
    }
    function solarDay(date) {
        const start = midnight(date), end = midnight(date + DAY);
        const daylight = [];
        for (const offset of [-2 * DAY, -DAY, 0, DAY]) {
            const rise = crossing(date + offset, -0.833, -1);
            const set = crossing(date + offset, -0.833, 1);
            if (Number.isFinite(rise) && Number.isFinite(set) && rise < end && set > start) {
                daylight.push({start: Math.max(start, rise), end: Math.min(end, set)});
            }
        }
        const sunrise = eventOnDate(date, -0.833, -1), sunset = eventOnDate(date, -0.833, 1);
        // Annual astronomical day length is tied to the solar cycle, never to
        // civil midnight, UTC clipping, or DST. Only the bar uses civil segments.
        const cycleRise = crossing(date, -0.833, -1), cycleSet = crossing(date, -0.833, 1);
        let minutes = Number.isFinite(cycleRise) && Number.isFinite(cycleSet) ? (cycleSet - cycleRise) / 60000 : null;
        if (cycleRise === null && cycleSet === null) {
            const {declination: d} = coordinates(date + (720 - 4 * longitude) * 60000);
            const cosine = (Math.sin(-0.833 * RAD) - Math.sin(latitude * RAD) * Math.sin(d)) / (Math.cos(latitude * RAD) * Math.cos(d));
            if (cosine < -1) minutes = 1440;
            else if (cosine > 1) minutes = 0;
        }
        if (!daylight.length) {
            const {declination: d} = coordinates((start + end) / 2);
            const cosine = (Math.sin(-0.833 * RAD) - Math.sin(latitude * RAD) * Math.sin(d)) / (Math.cos(latitude * RAD) * Math.cos(d));
            if (cosine < -1 && sunrise === null && sunset === null) daylight.push({start, end});
        }
        // At polar transition dates a single crossing is insufficient for a
        // complete daily interval. Show unknown instead of inventing 0/24 hours.
        if ((sunrise === null) !== (sunset === null)) daylight.length = 0;
        return {date, sunrise, sunset, minutes, daylight, start, end};
    }
    function yearDays(year) {
        const days = [];
        for (let date = Date.UTC(year, 0, 1); date < Date.UTC(year + 1, 0, 1); date += DAY) days.push(solarDay(date));
        return days;
    }
    function duration(minutes) {
        if (!Number.isFinite(minutes)) return tr("unavailable");
        const rounded = Math.round(minutes);
        return tr("duration", {hours:Math.floor(rounded / 60), minutes:String(rounded % 60).padStart(2, "0")});
    }
    // Same Meeus coordinates and iteration as sunrise/set, now at geometric
    // solar-centre altitudes -4° and +6°, without the -0.833° sunrise correction.
    // Optional coordinates support boundary tests; the UI uses this model's location.
    function goldenHour(date, lat = latitude, lon = longitude) {
        return {morningStart: eventOnDate(date, -4, -1, lat, lon), morningEnd: eventOnDate(date, 6, -1, lat, lon),
            eveningStart: eventOnDate(date, 6, 1, lat, lon), eveningEnd: eventOnDate(date, -4, 1, lat, lon)};
    }
    function goldenRange(start, end) {
        return start === null || end === null
            ? tr("goldenMissing")
            : end < start ? tr("midnight", {start:clock.format(start), end:clock.format(end)})
            : `${clock.format(start)} – ${clock.format(end)}`;
    }
    const barClock = formatter("en-GB", { hourCycle: "h23",
        hour: "2-digit", minute: "2-digit", second: "2-digit"});
    function minuteOfDay(instant = new Date()) {
        if (!Number.isFinite(Number(instant))) return null;
        const parts = barClock.formatToParts(instant);
        const value = name => Number(parts.find(p => p.type === name).value);
        return value("hour") * 60 + value("minute");
    }
    // Wall-clock scale, not elapsed time: DST days still run from 00 to 24.
    function daylightIntervals(day, golden) {
        function interval(start, end) {
            if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end
                || today(new Date(start)) !== day.date || today(new Date(end)) !== day.date) return null;
            const minute = instant => {
                const parts = barClock.formatToParts(instant);
                const value = name => Number(parts.find(p => p.type === name).value);
                return value("hour") * 60 + value("minute") + value("second") / 60;
            };
            const from = minute(start), to = minute(end);
            return from < to ? {start: from, end: to} : null;
        }
        return {daylight: interval(day.sunrise, day.sunset),
            morning: interval(golden.morningStart, golden.morningEnd),
            evening: interval(golden.eveningStart, golden.eveningEnd)};
    }
    function wallSegments(day, ranges) {
        const wallMinute = instant => {
            const parts = barClock.formatToParts(instant);
            const v = name => Number(parts.find(p => p.type === name).value);
            return v("hour") * 60 + v("minute") + v("second") / 60;
        };
        return ranges.map(range => ({start: range.start === day.start ? 0 : wallMinute(range.start),
            end: range.end === day.end ? 1440 : wallMinute(range.end)}));
    }
    function daySegments(day) { return Number.isFinite(day.minutes) && (day.sunrise === null) === (day.sunset === null) ? wallSegments(day, day.daylight) : null; }
    function goldenSegments(day) {
        const ranges = [];
        for (const offset of [-2 * DAY, -DAY, 0, DAY]) {
            for (const sign of [-1, 1]) {
                const begin = crossing(day.date + offset, sign === -1 ? -4 : 6, sign);
                const end = crossing(day.date + offset, sign === -1 ? 6 : -4, sign);
                if (Number.isFinite(begin) && Number.isFinite(end) && begin < end && begin < day.end && end > day.start)
                    ranges.push({start: Math.max(begin, day.start), end: Math.min(end, day.end)});
            }
        }
        return wallSegments(day, ranges);
    }
    return {today, solarDay, yearDays, duration, clock, goldenHour, goldenRange, daylightIntervals, dateFormat, shortFormat, daySegments, goldenSegments, minuteOfDay, timeZone: zone};
    }
    let model = createAstronomy({language});
    let {today, solarDay, yearDays, duration, clock, goldenHour, goldenRange, daylightIntervals, dateFormat, shortFormat} = model;
    // CommonJS export allows the actual browser calculation to be tested without dependencies.
    if (typeof module !== "undefined" && module.exports) module.exports = {...model, createAstronomy};
    if (typeof document === "undefined") return;
    document.addEventListener("DOMContentLoaded", () => {
        const widget = document.querySelector("[data-daylength-widget]");
        if (!widget) return;
        const field = name => widget.querySelector(`[data-daylength-${name}]`);
        const svg = field("chart");
        document.documentElement?.setAttribute("lang", language);
        for (const node of widget.querySelectorAll?.("[data-i18n]") || []) node.textContent = t(node.getAttribute("data-i18n"));
        for (const node of widget.querySelectorAll?.("[data-i18n-aria]") || []) node.setAttribute("aria-label", t(node.getAttribute("data-i18n-aria")));
        field("language").textContent = t("language");
        field("language").addEventListener("click", () => { window.location.href = "https://appassets.androidplatform.net/language?date=" + days[selected].date; });
        let displayedDate, days, selected = 0, timer, selectionLine, selectionDot;
        let minuteTimer, active = !document.hidden;
        function minuteTick() {
            clearTimeout(minuteTimer);
            const marker = field("now");
            const now = new Date();
            const visible = active && !document.hidden && days?.[selected]?.date === today(now);
            marker.setAttribute("data-visible", String(visible));
            if (!visible) return;
            const minute = model.minuteOfDay(now);
            for (const name of ["now-halo", "now-line"]) {
                field(name).setAttribute("x1", minute);
                field(name).setAttribute("x2", minute);
            }
            marker.setAttribute("aria-label", t("now", {time:clock.format(now), zone:model.timeZone}));
            minuteTimer = setTimeout(minuteTick, 60000 - Date.now() % 60000 + 10);
        }
        function stopTimers() {
            clearTimeout(timer);
            clearTimeout(minuteTimer);
            field("now").setAttribute("data-visible", "false");
        }
        const x = i => 32 + i / (days.length - 1) * 316;
        let axisLow = 6, axisHigh = 18;
        const y = minutes => 192 - (minutes / 60 - axisLow) / (axisHigh - axisLow) * 178;
        function element(tag, attributes, text) {
            const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
            for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
            if (text) node.textContent = text;
            svg.append(node);
            return node;
        }
        function showSelection() {
            const day = days[selected];
            const previous = solarDay(day.date - DAY).minutes;
            const deltaSeconds = Number.isFinite(day.minutes) && Number.isFinite(previous) ? Math.round((day.minutes - previous) * 60) : NaN;
            const absolute = Math.abs(deltaSeconds);
            const difference = t("differenceDuration", {minutes:Math.floor(absolute / 60), seconds:String(absolute % 60).padStart(2, "0")});
            field("date").textContent = dateFormat.format(day.date);
            field("value").textContent = duration(day.minutes);
            field("change").textContent = !Number.isFinite(deltaSeconds) ? t("differenceMissing") : t('difference', {value:`${deltaSeconds < 0 ? '−' : deltaSeconds > 0 ? '+' : ''}${difference}`});
            field("trend").textContent = !Number.isFinite(deltaSeconds) ? "" : deltaSeconds > 0 ? t("longer") : deltaSeconds < 0 ? t("shorter") : t("steady");
            field("times").textContent = t("times", {rise:Number.isFinite(day.sunrise) ? clock.format(day.sunrise) : t("missing"), set:Number.isFinite(day.sunset) ? clock.format(day.sunset) : t("missing")});
            const golden = goldenHour(day.date);
            field("golden-morning").textContent = goldenRange(golden.morningStart, golden.morningEnd);
            field("golden-evening").textContent = goldenRange(golden.eveningStart, golden.eveningEnd);
            const bar = field("bar");
            bar.replaceChildren();
            const rectangle = (start, end, kind) => {
                const node = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                for (const [key, value] of Object.entries({x: start, y: 0, width: end - start,
                    height: 14, class: `daystrip-${kind}`})) node.setAttribute(key, value);
                bar.append(node);
            };
            const segments = model.daySegments(day);
            rectangle(0, 1440, segments ? "night" : "unknown");
            if (segments) for (const range of segments) rectangle(range.start, range.end, "daylight");
            for (const range of model.goldenSegments(day)) rectangle(range.start, range.end, "golden");
            const incomplete = segments === null || Object.values(golden).some(instant => !Number.isFinite(instant));
            field("bar-status").textContent = incomplete ? t("incomplete") : "";
            bar.setAttribute("aria-label", t("bar", {date:dateFormat.format(day.date)}) + (incomplete ? t("barMissing") : ""));
            selectionLine.setAttribute("x1", x(selected));
            selectionLine.setAttribute("x2", x(selected));
            selectionDot.setAttribute("cx", x(selected));
            selectionDot.setAttribute("cy", Number.isFinite(day.minutes) ? y(day.minutes) : 192);
            selectionDot.setAttribute("visibility", Number.isFinite(day.minutes) ? "visible" : "hidden");
            minuteTick();
        }
        function draw(now = new Date()) {
            const date = today(now);
            if (displayedDate === date) return;
            displayedDate = date;
            const year = new Date(date).getUTCFullYear();
            days = yearDays(year);
            selected = days.findIndex(d => d.date === date);
            field("year").textContent = t("year", {year});
            const validDays = days.filter(d => Number.isFinite(d.minutes));
            const longest = validDays.reduce((a, b) => a.minutes > b.minutes ? a : b, validDays[0] || {date, minutes: null});
            const shortest = validDays.reduce((a, b) => a.minutes < b.minutes ? a : b, validDays[0] || {date, minutes: null});
            field("longest").textContent = `${shortFormat.format(longest.date)} · ${duration(longest.minutes)}`;
            field("shortest").textContent = `${shortFormat.format(shortest.date)} · ${duration(shortest.minutes)}`;
            axisLow = validDays.some(d => d.minutes < 360 || d.minutes > 1080) ? 0 : 6;
            axisHigh = axisLow === 0 ? 24 : 18;
            svg.replaceChildren();
            for (let hour = axisLow; hour <= axisHigh; hour += 3) {
                element("line", {x1: 32, x2: 348, y1: y(hour * 60), y2: y(hour * 60), class: "daylength-grid"});
                element("text", {x: 26, y: y(hour * 60) + 3, "text-anchor": "end"}, `${hour}${t("hourUnit")}`);
            }
            const months = t("months").split("");
            days.forEach((d, i) => {
                if (new Date(d.date).getUTCDate() !== 1) return;
                element("line", {x1: x(i), x2: x(i), y1: 14, y2: 192, class: "daylength-grid"});
                element("text", {x: x(i), y: 214, "text-anchor": "middle"}, months[new Date(d.date).getUTCMonth()]);
            });
            let points = [];
            function flushCurve() { if (points.length) element("polyline", {points: points.join(" "), class: "daylength-curve"}); points = []; }
            days.forEach((d, i) => { if (Number.isFinite(d.minutes)) points.push(`${x(i)},${y(d.minutes)}`); else flushCurve(); });
            flushCurve();
            selectionLine = element("line", {y1: 14, y2: 192, class: "daylength-selected"});
            // Today stays visible when another date is selected.
            element("line", {x1: x(selected), x2: x(selected), y1: 14, y2: 192, class: "daylength-today"});
            selectionDot = element("circle", {r: 4, class: "daylength-dot"});
            svg.setAttribute("aria-label", t("chart", {year}));
            svg.setAttribute("tabindex", "0");
            showSelection();
        }
        function selectPointer(event) {
            const rect = svg.getBoundingClientRect();
            selected = Math.max(0, Math.min(days.length - 1, Math.round(((event.clientX - rect.left) / rect.width * 360 - 32) / 316 * (days.length - 1))));
            showSelection();
        }
        svg.addEventListener("pointerdown", event => {
            if (event.pointerId !== undefined && svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
            selectPointer(event);
        });
        svg.addEventListener("pointermove", event => {
            if (event.pointerType === "mouse" || event.buttons || (svg.hasPointerCapture && svg.hasPointerCapture(event.pointerId))) selectPointer(event);
        });
        svg.addEventListener("keydown", event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            selected = event.key === "Home" ? 0 : event.key === "End" ? days.length - 1
                : Math.max(0, Math.min(days.length - 1, selected + (event.key === "ArrowLeft" ? -1 : 1)));
            showSelection();
        });
        field("today").addEventListener("click", () => {
            draw();
            selected = days.findIndex(d => d.date === today());
            showSelection();
        });
        field("locate").addEventListener("click", () => { window.location.href = "https://appassets.androidplatform.net/locate"; });
        let locationKey = "";
        window.addEventListener("jaarzon-location", event => {
            const info = event.detail;
            const key = `${info.latitude},${info.longitude},${info.timeZone},${JSON.stringify(info.zoneRules || null)}`;
            field("location").textContent = info.label;
            field("zone").textContent = info.zoneLabel;
            if (key === locationKey) return;
            try { model = createAstronomy({...info, language}); } catch (_) { return; }
            locationKey = key;
            ({today, solarDay, yearDays, duration, clock, goldenHour, goldenRange, daylightIntervals, dateFormat, shortFormat} = model);
            const selectedDate = days[selected]?.date;
            displayedDate = undefined;
            field("location").textContent = info.label;
            field("zone").textContent = info.zoneLabel;
            field("footer").textContent = t("footer");
            refresh();
            const index = days.findIndex(d => d.date === selectedDate);
            if (index >= 0) { selected = index; showSelection(); }
        });
        function refresh() {
            clearTimeout(timer);
            if (!active || document.hidden) { stopTimers(); return; }
            draw();
            let low = Date.now(), high = low + 26 * 3600000;
            const current = today(new Date(low));
            while (high - low > 500) {
                const mid = Math.floor((low + high) / 2);
                if (today(new Date(mid)) === current) low = mid; else high = mid;
            }
            timer = setTimeout(refresh, high - Date.now() + 100);
            minuteTick();
        }
        window.addEventListener("jaarzon-active", event => {
            active = event.detail === true;
            if (active && !document.hidden) refresh(); else stopTimers();
        });
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) stopTimers(); else if (active) refresh();
        });
        refresh();
        const initialIndex = days.findIndex(day => day.date === globalThis.JaarZonSelectedDate);
        if (initialIndex >= 0) { selected = initialIndex; showSelection(); }
    });
}());
