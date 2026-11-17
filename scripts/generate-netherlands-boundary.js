// Regenerate bundled data from a locally downloaded official PDOK GeoJSON.
// No network access or dependencies. Usage: node scripts/generate-netherlands-boundary.js <source.geojson>
const fs = require('node:fs');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
if (!process.argv[2]) throw new Error('Supply the local PDOK landgebied GeoJSON path.');
const source = fs.readFileSync(process.argv[2]);
const feature = JSON.parse(source).features.find(f => f.properties.code === '6030');
if (!feature || feature.geometry.type !== 'MultiPolygon') throw new Error('Expected Dutch landgebied LND6030 MultiPolygon.');
const polygons = feature.geometry.coordinates;
const words = [polygons.length];
for (const polygon of polygons) {
    words.push(polygon.length);
    for (const ring of polygon) {
        words.push(ring.length);
        for (const [x,y] of ring) {
            if (!Number.isFinite(x) || !Number.isFinite(y) || x < 3 || x > 8 || y < 50 || y > 54.5) throw new Error('Outside European Netherlands.');
            words.push(Math.round(x*1e6), Math.round(y*1e6));
        }
    }
}
const binary = Buffer.alloc(words.length*4);
words.forEach((value,index) => binary.writeInt32BE(value,index*4));
const encoded = zlib.gzipSync(binary).toString('base64').match(/.{1,12000}/g);
const javaPath = path.join(root,'app/src/main/java/nl/jaarzon/NetherlandsBoundary.java');
const java = fs.readFileSync(javaPath,'utf8');
const data = '    private static final String[] DATA = {\n' + encoded.map(s=>'        "'+s+'"').join(',\n') + '\n    };';
if (!java.includes('private static final String[] DATA')) throw new Error('Missing data block.');
fs.writeFileSync(javaPath,java.replace(/    private static final String\[\] DATA = \{[\s\S]*?\n    \};/,data));
const docPath = path.join(root,'docs/netherlands-boundary.md');
const sha = crypto.createHash('sha256').update(source).digest('hex');
fs.writeFileSync(docPath,fs.readFileSync(docPath,'utf8').replace(/SHA-256 bronbestand: [a-f0-9]+/,'SHA-256 bronbestand: '+sha));
console.log(`Generated ${polygons.length} polygons; source SHA-256 ${sha}`);
