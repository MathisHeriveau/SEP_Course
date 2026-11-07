// Étape 2 — Intersection spatiale du tracé (21 034 points) avec les limites communales officielles.
// Source : Etalab « contours administratifs » (dérivés d'IGN ADMIN EXPRESS COG), simplification 5 m.
// Méthode :
//   1. Densification du tracé à ≤ 5 m (uniquement pour la classification ; le tracé source n'est pas modifié).
//   2. Pour chaque point densifié : commune contenant le point (point-dans-polygone).
//   3. Pour chaque commune : longueur parcourue à l'intérieur, nombre de passages, km d'entrée/sortie,
//      profondeur maximale (distance à la limite communale depuis l'intérieur).
//   4. Communes « proches » : non pénétrées mais dont la limite est à < 1 km du tracé.
// Résultats bruts conservés dans data/generated/communes-raw.json.
import {readFileSync, writeFileSync} from 'node:fs';
import {cumulative, localXY, round, vincenty} from './lib/geo.mjs';

const STEP_M = 5;
const NEAR_M = 1000;

const track = JSON.parse(readFileSync('data/generated/track.geojson', 'utf8')).features[0].geometry.coordinates.map((c) => [c[0], c[1]]);
const cum = cumulative(track, vincenty);

// --- 1. Densification -------------------------------------------------------
const dense = []; // {p:[lon,lat], km}
for (let i = 0; i < track.length - 1; i++) {
	const a = track[i], b = track[i + 1];
	const seg = cum[i + 1] - cum[i];
	const n = Math.max(1, Math.ceil(seg / STEP_M));
	for (let k = 0; k < n; k++) {
		const t = k / n;
		dense.push({p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], m: cum[i] + seg * t, src: i});
	}
}
dense.push({p: track.at(-1), m: cum.at(-1), src: track.length - 1});
console.log(`Points source : ${track.length} — densifiés : ${dense.length}`);

// --- Chargement des polygones (limité à l'emprise du tracé + marge) -----------
let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
for (const [x, y] of track) { minLon = Math.min(minLon, x); maxLon = Math.max(maxLon, x); minLat = Math.min(minLat, y); maxLat = Math.max(maxLat, y); }
const M = 0.05;
const loadLayer = (path) => {
	const fc = JSON.parse(readFileSync(path, 'utf8'));
	const out = [];
	for (const f of fc.features) {
		const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
		let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
		for (const poly of polys) for (const ring of poly) for (const [x, y] of ring) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
		if (bx1 < minLon - M || bx0 > maxLon + M || by1 < minLat - M || by0 > maxLat + M) continue;
		out.push({props: f.properties, polys, bbox: [bx0, by0, bx1, by1]});
	}
	return out;
};
const communes = loadLayer('cache/official/communes-5m.geojson');
const deleguees = loadLayer('cache/official/communes-associees-deleguees-5m.geojson');
console.log(`Communes candidates (emprise) : ${communes.length} — communes déléguées/associées : ${deleguees.length}`);

// --- Point dans polygone (ray casting, avec trous) ----------------------------
const inRing = (x, y, ring) => {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
};
const inPolys = (x, y, polys) => {
	for (const poly of polys) {
		if (!inRing(x, y, poly[0])) continue;
		let hole = false;
		for (let h = 1; h < poly.length; h++) if (inRing(x, y, poly[h])) { hole = true; break; }
		if (!hole) return true;
	}
	return false;
};
const locate = (layer, x, y, hint) => {
	if (hint && x >= hint.bbox[0] && x <= hint.bbox[2] && y >= hint.bbox[1] && y <= hint.bbox[3] && inPolys(x, y, hint.polys)) return hint;
	for (const c of layer) {
		if (x < c.bbox[0] || x > c.bbox[2] || y < c.bbox[1] || y > c.bbox[3]) continue;
		if (c === hint) continue;
		if (inPolys(x, y, c.polys)) return c;
	}
	return null;
};

// --- Distance d'un point à la limite d'un polygone (m) -------------------------
const segDist = (P, A, B) => {
	const dx = B[0] - A[0], dy = B[1] - A[1];
	const l2 = dx * dx + dy * dy;
	let t = l2 ? ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / l2 : 0;
	t = Math.max(0, Math.min(1, t));
	return Math.hypot(A[0] + t * dx - P[0], A[1] + t * dy - P[1]);
};
const boundaryDistance = (p, polys) => {
	let best = Infinity;
	const lat0 = p[1];
	const kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110574;
	const P = [0, 0];
	for (const poly of polys) for (const ring of poly) {
		for (let i = 0; i < ring.length - 1; i++) {
			const A = [(ring[i][0] - p[0]) * kx, (ring[i][1] - p[1]) * ky];
			const B = [(ring[i + 1][0] - p[0]) * kx, (ring[i + 1][1] - p[1]) * ky];
			// rejet rapide
			if (Math.min(Math.abs(A[0]), Math.abs(B[0])) > best && Math.sign(A[0]) === Math.sign(B[0])) continue;
			if (Math.min(Math.abs(A[1]), Math.abs(B[1])) > best && Math.sign(A[1]) === Math.sign(B[1])) continue;
			const d = segDist(P, A, B);
			if (d < best) best = d;
		}
	}
	return best;
};

// --- 2/3. Parcours et agrégation ---------------------------------------------
const walk = (layer, label) => {
	const runs = [];
	let hint = null, cur = null;
	const unlocated = [];
	for (let k = 0; k < dense.length; k++) {
		const {p, m} = dense[k];
		const c = locate(layer, p[0], p[1], hint);
		if (c) hint = c;
		const code = c ? c.props.code : null;
		if (!cur || cur.code !== code) {
			if (cur) { cur.endM = m; runs.push(cur); }
			cur = {code, c, startM: m, endM: m, k0: k, k1: k};
		}
		cur.k1 = k;
		if (!c) unlocated.push(k);
	}
	cur.endM = dense.at(-1).m;
	runs.push(cur);
	console.log(`[${label}] passages : ${runs.length} — points hors commune : ${unlocated.length}`);
	return {runs, unlocated};
};

const aggregate = (runs, label) => {
	const by = new Map();
	for (const r of runs) {
		if (!r.code) continue;
		const e = by.get(r.code) ?? {code: r.code, nom: r.c.props.nom, departement: r.c.props.departement, type: r.c.props.type ?? 'commune', runs: [], c: r.c};
		e.runs.push({fromKm: round(r.startM / 1000, 3), toKm: round(r.endM / 1000, 3), lengthM: round(r.endM - r.startM, 1), k0: r.k0, k1: r.k1});
		by.set(r.code, e);
	}
	const list = [...by.values()];
	let n = 0;
	for (const e of list) {
		e.insideLengthM = round(e.runs.reduce((s, r) => s + r.lengthM, 0), 1);
		e.passages = e.runs.length;
		e.entryKm = e.runs[0].fromKm;
		e.exitKm = e.runs.at(-1).toKm;
		// Profondeur max : distance à la limite, échantillonnée tous les 25 m, arrêt anticipé à 300 m.
		let depth = 0, depthKm = null;
		outer: for (const r of e.runs) {
			for (let k = r.k0; k <= r.k1; k += 5) {
				const d = boundaryDistance(dense[k].p, e.c.polys);
				if (d > depth) { depth = d; depthKm = dense[k].m / 1000; }
				if (depth >= 300) break outer;
			}
		}
		e.maxDepthM = round(depth, 1);
		e.maxDepthCapped = depth >= 300;
		e.maxDepthAtKm = depthKm === null ? null : round(depthKm, 3);
		for (const r of e.runs) { delete r.k0; delete r.k1; }
		if (++n % 50 === 0) console.log(`  [${label}] profondeur ${n}/${list.length}`);
	}
	return list.sort((a, b) => a.entryKm - b.entryKm);
};

const C = walk(communes, 'communes');
const communesTouched = aggregate(C.runs, 'communes');
const D = walk(deleguees, 'déléguées');
const delegTouched = aggregate(D.runs, 'déléguées');

// --- 4. Communes proches non pénétrées ----------------------------------------
// distance minimale entre la limite communale et le tracé (échantillon de points du tracé tous les ~25 m)
const touchedCodes = new Set(communesTouched.map((c) => c.code));
const sample = dense.filter((_, k) => k % 5 === 0);
const near = [];
for (const c of communes) {
	if (touchedCodes.has(c.code ?? c.props.code)) continue;
	const [bx0, by0, bx1, by1] = c.bbox;
	const mlon = NEAR_M / 75000, mlat = NEAR_M / 111000;
	let best = Infinity, bestKm = null;
	for (const s of sample) {
		const [x, y] = s.p;
		if (x < bx0 - mlon || x > bx1 + mlon || y < by0 - mlat || y > by1 + mlat) continue;
		const d = boundaryDistance(s.p, c.polys);
		if (d < best) { best = d; bestKm = s.m / 1000; }
	}
	if (best <= NEAR_M) near.push({code: c.props.code, nom: c.props.nom, departement: c.props.departement, minDistanceM: round(best, 1), atKm: round(bestKm, 3)});
}
near.sort((a, b) => a.atKm - b.atKm);

const clean = (list) => list.map(({c, ...rest}) => rest);
const out = {
	generatedAt: new Date().toISOString(),
	method: {
		boundaries: 'Etalab contours-administratifs (latest, 2026-05) — IGN ADMIN EXPRESS COG, simplification 5 m',
		trackSource: 'assets/data/Tracé détaillé Noaillan Cossé.gpx (21 034 points, ordre conservé)',
		densificationStepM: STEP_M,
		depthSamplingM: STEP_M * 5,
		nearThresholdM: NEAR_M,
		distance: 'géodésique WGS84 (Vincenty) le long du tracé GPX',
	},
	unlocatedPoints: C.unlocated.length,
	unlocatedSamples: C.unlocated.slice(0, 20).map((k) => ({km: round(dense[k].m / 1000, 3), lon: dense[k].p[0], lat: dense[k].p[1]})),
	communes: clean(communesTouched),
	communesDelegueesOuAssociees: clean(delegTouched),
	communesProchesNonTraversees: near,
};
writeFileSync('data/generated/communes-raw.json', JSON.stringify(out, null, 2));

// Résumé console
console.log(`\nCommunes pénétrées : ${communesTouched.length}`);
for (const c of communesTouched) console.log(`${String(c.entryKm.toFixed(1)).padStart(6)} km  ${c.code}  ${c.nom.padEnd(36)} dép ${c.departement}  in=${String(Math.round(c.insideLengthM)).padStart(6)} m  pass=${c.passages}  depth=${c.maxDepthCapped ? '≥300' : Math.round(c.maxDepthM)} m`);
console.log(`\nDéléguées/associées pénétrées : ${delegTouched.length}`);
console.log(`Communes proches (< ${NEAR_M} m) non pénétrées : ${near.length}`);
