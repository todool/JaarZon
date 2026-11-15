/* NOAA/Meeus solar coordinates; sunrise/set at solar centre altitude -0.833°.
 * Includes mean refraction and solar radius, assumes an unobstructed horizon.
 * https://gml.noaa.gov/grad/solcalc/calcdetails.html
 * All calendar arithmetic is UTC; presentation and 'today' use Amsterdam.
 */
(function () {
    "use strict";
    const DAY = 86400000;
    const RAD = Math.PI / 180;
    const zone = "Europe/Amsterdam";
    const dateFormat = new Intl.DateTimeFormat("nl-NL", {timeZone: zone, day: "numeric", month: "long", year: "numeric"});
    const shortFormat = new Intl.DateTimeFormat("nl-NL", {timeZone: zone, day: "numeric", month: "long"});
    const clock = new Intl.DateTimeFormat("nl-NL", {timeZone: zone, hour: "2-digit", minute: "2-digit"});
    function today(now = new Date()) {
        const parts = new Intl.DateTimeFormat("en-CA", {timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit"}).formatToParts(now);
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
    function solarDay(date) {
        function event(sign) {
            let minutes = 720 - 4 * 4.57 + sign * 360;
            // Re-evaluate coordinates at each event, including seasonal change within the day.
            for (let i = 0; i < 4; i++) {
                const {declination: d, eq} = coordinates(date + minutes * 60000);
                const angle = Math.acos((Math.sin(-0.833 * RAD) - Math.sin(51.8 * RAD) * Math.sin(d))
                    / (Math.cos(51.8 * RAD) * Math.cos(d))) / RAD;
                minutes = 720 - 4 * 4.57 - eq + sign * 4 * angle;
            }
            return date + minutes * 60000;
        }
        const sunrise = event(-1), sunset = event(1);
        return {date, sunrise, sunset, minutes: (sunset - sunrise) / 60000};
    }
    function yearDays(year) {
        const days = [];
        for (let date = Date.UTC(year, 0, 1); date < Date.UTC(year + 1, 0, 1); date += DAY) days.push(solarDay(date));
        return days;
    }
    function duration(minutes) {
        const rounded = Math.round(minutes);
        return `${Math.floor(rounded / 60)}u ${String(rounded % 60).padStart(2, "0")}m`;
    }
    // CommonJS export allows the actual browser calculation to be tested without dependencies.
    if (typeof module !== "undefined" && module.exports) module.exports = {today, solarDay, yearDays, duration, clock};
    if (typeof document === "undefined") return;
    document.addEventListener("DOMContentLoaded", () => {
        const widget = document.querySelector("[data-daylength-widget]");
        if (!widget) return;
        const field = name => widget.querySelector(`[data-daylength-${name}]`);
        const svg = field("chart");
        let displayedDate, days, selected = 0, timer, selectionLine, selectionDot;
        const x = i => 32 + i / (days.length - 1) * 316;
        const y = minutes => 192 - (minutes / 60 - 6) / 12 * 178;
        function element(tag, attributes, text) {
            const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
            for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
            if (text) node.textContent = text;
            svg.append(node);
            return node;
        }
        function showSelection() {
            const day = days[selected];
            const deltaSeconds = Math.round((day.minutes - solarDay(day.date - DAY).minutes) * 60);
            const absolute = Math.abs(deltaSeconds);
            const difference = `${Math.floor(absolute / 60)}m ${String(absolute % 60).padStart(2, "0")}s`;
            field("date").textContent = dateFormat.format(day.date);
            field("value").textContent = duration(day.minutes);
            field("change").textContent = `${deltaSeconds < 0 ? '−' : deltaSeconds > 0 ? '+' : ''}${difference} t.o.v. de vorige dag`;
            field("trend").textContent = deltaSeconds > 0 ? "De dagen worden langer" : deltaSeconds < 0 ? "De dagen worden korter" : "De daglengte blijft vrijwel gelijk";
            field("times").textContent = `Zonsopkomst ${clock.format(day.sunrise)} · Zonsondergang ${clock.format(day.sunset)}`;
            selectionLine.setAttribute("x1", x(selected));
            selectionLine.setAttribute("x2", x(selected));
            selectionDot.setAttribute("cx", x(selected));
            selectionDot.setAttribute("cy", y(day.minutes));
        }
        function draw(now = new Date()) {
            const date = today(now);
            if (displayedDate === date) return;
            displayedDate = date;
            const year = new Date(date).getUTCFullYear();
            days = yearDays(year);
            selected = days.findIndex(d => d.date === date);
            field("year").textContent = `Daglicht in ${year}`;
            const longest = days.reduce((a, b) => a.minutes > b.minutes ? a : b);
            const shortest = days.reduce((a, b) => a.minutes < b.minutes ? a : b);
            field("longest").textContent = `${shortFormat.format(longest.date)} · ${duration(longest.minutes)}`;
            field("shortest").textContent = `${shortFormat.format(shortest.date)} · ${duration(shortest.minutes)}`;
            svg.replaceChildren();
            for (let hour = 6; hour <= 18; hour += 3) {
                element("line", {x1: 32, x2: 348, y1: y(hour * 60), y2: y(hour * 60), class: "daylength-grid"});
                element("text", {x: 26, y: y(hour * 60) + 3, "text-anchor": "end"}, `${hour}u`);
            }
            const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
            days.forEach((d, i) => {
                if (new Date(d.date).getUTCDate() !== 1) return;
                element("line", {x1: x(i), x2: x(i), y1: 14, y2: 192, class: "daylength-grid"});
                element("text", {x: x(i), y: 214, "text-anchor": "middle"}, months[new Date(d.date).getUTCMonth()]);
            });
            element("polyline", {points: days.map((d, i) => `${x(i)},${y(d.minutes)}`).join(" "), class: "daylength-curve"});
            selectionLine = element("line", {y1: 14, y2: 192, class: "daylength-selected"});
            // Today stays visible when another date is selected.
            element("line", {x1: x(selected), x2: x(selected), y1: 14, y2: 192, class: "daylength-today"});
            selectionDot = element("circle", {r: 4, class: "daylength-dot"});
            svg.setAttribute("aria-label", `Daglengte ${year}. Rode lijn: vandaag. Gebruik de pijltoetsen om een datum te kiezen.`);
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
        function refresh() {
            clearTimeout(timer);
            draw();
            let low = Date.now(), high = low + 26 * 3600000;
            const current = today(new Date(low));
            while (high - low > 500) {
                const mid = Math.floor((low + high) / 2);
                if (today(new Date(mid)) === current) low = mid; else high = mid;
            }
            timer = setTimeout(refresh, high - Date.now() + 100);
        }
        document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
        refresh();
    });
}());
