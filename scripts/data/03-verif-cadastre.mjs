// Étape 3 — Contre-vérification des cas limites avec une seconde source officielle indépendante :
// les limites communales du cadastre (DGFiP, via cadastre.data.gouv.fr / Etalab).
// Pour chaque commune dont la pénétration ADMIN EXPRESS est faible (< 50 m), on recalcule
// longueur intérieure et profondeur maximale avec la géométrie cadastrale.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {cumulative, round, vincenty} from './lib/geo.mjs';

const THRESHOLD_M = 50;
mkdirSync('cache/cadastre', {recursive: true});

const raw = JSON.parse(readFileSync('data/generated/communes-raw.json', 'utf8'));
const targets = raw.communes.filter((c) => !c.maxDepthCapped && c.maxDepthM < THRESHOLD_M);

const track = JSON.parse(readFileSync('data/generated/track.geojson', 'utf8')).features[0].geometry.coordinates.map((c) => [c[0], c[1]]);
const cum = cumulative(track, vincenty);

const fetchCadastre = async (code) => {
	const dep = code.startsWith('97') ? code.slice(0, 3) : code.slice(0, 2);
	const file = `cache/cadastre/cadastre-${code}-communes.json`;
	if (!existsSync(file)) {
		const url = `https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/${dep}/${code}/cadastre-${code}-communes.json.gz`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`${url} → ${res.status}`);
		writeFileSync(file, gunzipSync(Buffer.from(await res.arrayBuffer())));
	}
	const fc = JSON.parse(readFileSync(file, 'utf8'));
	const f = fc.features[0];
	return f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
};

const inRing = (x, y, ring) => {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
};
const inPolys = (x, y, polys) => polys.some((poly) => inRing(x, y, poly[0]) && !poly.slice(1).some((h) => inRing(x, y, h)));
const boundaryDistance = (p, polys) => {
	const kx = 111320 * Math.cos((p[1] * Math.PI) / 180), ky = 110574;
	let best = Infinity;
	for (const poly of polys) for (const ring of poly) for (let i = 0; i < ring.length - 1; i++) {
		const ax = (ring[i][0] - p[0]) * kx, ay = (ring[i][1] - p[1]) * ky, bx = (ring[i + 1][0] - p[0]) * kx, by = (ring[i + 1][1] - p[1]) * ky;
		const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
		let t = l2 ? -(ax * dx + ay * dy) / l2 : 0;
		t = Math.max(0, Math.min(1, t));
		const d = Math.hypot(ax + t * dx, ay + t * dy);
		if (d < best) best = d;
	}
	return best;
};

const results = [];
for (const c of targets) {
	const polys = await fetchCadastre(c.code);
	// Fenêtre du tracé : ±1 km autour des passages détectés
	const from = c.entryKm * 1000 - 1000, to = c.exitKm * 1000 + 1000;
	let inside = 0, depth = 0, passages = 0, prevIn = false;
	for (let i = 0; i < track.length - 1; i++) {
		if (cum[i + 1] < from || cum[i] > to) continue;
		const seg = cum[i + 1] - cum[i];
		const n = Math.max(1, Math.ceil(seg / 2));
		for (let k = 0; k < n; k++) {
			const t = k / n;
			const p = [track[i][0] + (track[i + 1][0] - track[i][0]) * t, track[i][1] + (track[i + 1][1] - track[i][1]) * t];
			const isIn = inPolys(p[0], p[1], polys);
			if (isIn) {
				inside += seg / n;
				if (k % 5 === 0) depth = Math.max(depth, boundaryDistance(p, polys));
			}
			if (isIn && !prevIn) passages++;
			prevIn = isIn;
		}
	}
	const r = {
		code: c.code, nom: c.nom,
		adminExpress: {insideLengthM: c.insideLengthM, maxDepthM: c.maxDepthM, passages: c.passages, entryKm: c.entryKm},
		cadastre: {insideLengthM: round(inside, 1), maxDepthM: round(depth, 1), passages},
	};
	results.push(r);
	console.log(`${c.code} ${c.nom.padEnd(28)} ADMIN EXPRESS in=${String(Math.round(c.insideLengthM)).padStart(5)} m depth=${String(Math.round(c.maxDepthM)).padStart(3)} m | CADASTRE in=${String(Math.round(inside)).padStart(5)} m depth=${String(Math.round(depth)).padStart(3)} m pass=${passages}`);
}
writeFileSync('data/generated/cadastre-check.json', JSON.stringify({generatedAt: new Date().toISOString(), source: 'cadastre.data.gouv.fr — etalab-cadastre latest (limites communales DGFiP)', thresholdM: THRESHOLD_M, results}, null, 2));
