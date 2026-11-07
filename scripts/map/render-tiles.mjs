// Rendu des tuiles de fond de carte (512 px) avec MapLibre Native, par « méta-tuiles » 4×4
// pour éviter les coutures. Les tuiles sources (vectorielles/raster) sont mises en cache disque.
// Usage : node scripts/map/render-tiles.mjs [--force]
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import mbgl from '@maplibre/maplibre-gl-native';
import sharp from 'sharp';
import {buildStyle} from './style.mjs';

const UA = 'un-pas-pour-maman-carto/1.0 (documentary route map; low volume)';
const TILE = 512;
const META = 4;
const OUT = 'public/tiles';
const CACHE = 'cache/tile-sources';
const CONCURRENCY = 3;
const force = process.argv.includes('--force');
mkdirSync(CACHE, {recursive: true});

const needed = JSON.parse(readFileSync('data/generated/tiles-needed.json', 'utf8'));
const tilePath = (z, x, y) => `${OUT}/${z}/${x}/${y}.jpg`;
const missing = needed.filter((k) => force || !existsSync(tilePath(...k.split('/').map(Number))));
console.log(`Tuiles nécessaires : ${needed.length} — à rendre : ${missing.length}`);

// Group into metatiles
const metas = new Map();
for (const k of missing) {
	const [z, x, y] = k.split('/').map(Number);
	const m = Math.min(META, 2 ** z);
	const key = `${z}/${Math.floor(x / m)}/${Math.floor(y / m)}`;
	metas.set(key, {z, mx: Math.floor(x / m), my: Math.floor(y / m), m});
}
console.log(`Méta-tuiles : ${metas.size}`);

// ---------------------------------------------------------------------------
// Network with disk cache
// ---------------------------------------------------------------------------
let fetched = 0, cached = 0, empty = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getResource = async (url) => {
	const file = `${CACHE}/${createHash('sha1').update(url).digest('hex')}`;
	if (existsSync(file)) {
		cached++;
		const buf = readFileSync(file);
		return buf.length ? buf : null;
	}
	for (let attempt = 0; attempt < 5; attempt++) {
		try {
			const res = await fetch(url, {headers: {'User-Agent': UA}});
			if (res.status === 404 || res.status === 204 || res.status === 400) {
				writeFileSync(file, Buffer.alloc(0));
				empty++;
				return null;
			}
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const buf = Buffer.from(await res.arrayBuffer());
			writeFileSync(file, buf);
			fetched++;
			return buf;
		} catch (e) {
			if (attempt === 4) throw new Error(`${url}: ${e.message}`);
			await sleep(800 * (attempt + 1));
		}
	}
};

const makeMap = () =>
	new mbgl.Map({
		ratio: 1,
		request: (req, callback) => {
			getResource(req.url)
				.then((data) => (data ? callback(null, {data}) : callback()))
				.catch((err) => callback(err));
		},
	});

// ---------------------------------------------------------------------------
// Render one metatile and slice it
// ---------------------------------------------------------------------------
const lonOf = (px, worldPx) => (px / worldPx) * 360 - 180;
const latOf = (py, worldPx) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * py) / worldPx))) * 180) / Math.PI;

const renderMeta = (map, {z, mx, my, m}) =>
	new Promise((resolve, reject) => {
		const worldPx = TILE * 2 ** z;
		const size = TILE * m;
		const cx = mx * size + size / 2;
		const cy = my * size + size / 2;
		map.render({zoom: z, center: [lonOf(cx, worldPx), latOf(cy, worldPx)], width: size, height: size, bearing: 0, pitch: 0}, async (err, buffer) => {
			if (err) return reject(err);
			try {
				const img = sharp(buffer, {raw: {width: size, height: size, channels: 4}});
				const base = await img.removeAlpha().toBuffer({resolveWithObject: true});
				for (let i = 0; i < m; i++) {
					for (let j = 0; j < m; j++) {
						const x = mx * m + i, y = my * m + j;
						const p = tilePath(z, x, y);
						mkdirSync(dirname(p), {recursive: true});
						await sharp(base.data, {raw: {width: size, height: size, channels: 3}})
							.extract({left: i * TILE, top: j * TILE, width: TILE, height: TILE})
							.jpeg({quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true})
							.toFile(p);
					}
				}
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	});

const style = buildStyle();
const queue = [...metas.values()].sort((a, b) => a.z - b.z);
let done = 0;
const t0 = Date.now();
const worker = async () => {
	const map = makeMap();
	map.load(style);
	while (queue.length) {
		const job = queue.shift();
		await renderMeta(map, job);
		done++;
		if (done % 10 === 0 || queue.length === 0) {
			const el = (Date.now() - t0) / 1000;
			console.log(`  ${done}/${metas.size} méta-tuiles — ${el.toFixed(0)} s — réseau ${fetched}, cache ${cached}, vides ${empty}`);
		}
	}
	map.release();
};
await Promise.all(Array.from({length: CONCURRENCY}, worker));
console.log('Terminé.');

// Manifeste des tuiles disponibles (lu par le film pour ne jamais demander une tuile absente)
import {readdirSync} from 'node:fs';
const all = [];
for (const zz of readdirSync(OUT)) for (const xx of readdirSync(`${OUT}/${zz}`)) for (const f of readdirSync(`${OUT}/${zz}/${xx}`)) if (f.endsWith('.jpg')) all.push(`${zz}/${xx}/${f.slice(0, -4)}`);
writeFileSync('src/data/tiles-manifest.json', JSON.stringify(all.sort()));
console.log(`Manifeste : ${all.length} tuiles`);
