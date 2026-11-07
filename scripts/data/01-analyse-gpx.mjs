// Étape 1 — Analyse et comparaison des deux fichiers GPX sources.
// Ne modifie jamais les GPX. Produit un rapport JSON + le tracé de référence en GeoJSON.
import {mkdirSync, writeFileSync} from 'node:fs';
import {cumulative, haversine, nearestOnLine, parseGpx, round, vincenty} from './lib/geo.mjs';

const SRC_A = 'assets/data/Projet SEP Noaillan Cossé.gpx';
const SRC_B = 'assets/data/Tracé détaillé Noaillan Cossé.gpx';
mkdirSync('data/generated', {recursive: true});

const describe = (label, gpx) => {
	const pts = gpx.tracks.flatMap((t) => t.segments.flat());
	const coords = pts.map((p) => [p.lon, p.lat]);
	const cumV = cumulative(coords, vincenty);
	const cumH = cumulative(coords, haversine);
	let up = 0, down = 0, maxStep = 0, maxStepIdx = 0, dup = 0;
	const steps = [];
	for (let i = 1; i < pts.length; i++) {
		const s = cumV[i] - cumV[i - 1];
		steps.push(s);
		if (s === 0) dup++;
		if (s > maxStep) { maxStep = s; maxStepIdx = i; }
		if (pts[i].ele != null && pts[i - 1].ele != null) {
			const de = pts[i].ele - pts[i - 1].ele;
			if (de > 0) up += de; else down -= de;
		}
	}
	steps.sort((a, b) => a - b);
	const eles = pts.map((p) => p.ele).filter((e) => e != null);
	// 3D length (includes elevation changes)
	let len3d = 0;
	for (let i = 1; i < pts.length; i++) {
		const h = cumV[i] - cumV[i - 1];
		const de = (pts[i].ele ?? 0) - (pts[i - 1].ele ?? 0);
		len3d += Math.hypot(h, de);
	}
	return {
		label,
		creator: gpx.creator,
		metadataName: gpx.metadataName,
		metadataTime: gpx.metadataTime,
		tracks: gpx.tracks.length,
		segments: gpx.tracks.reduce((n, t) => n + t.segments.length, 0),
		points: pts.length,
		waypoints: gpx.waypoints.length,
		start: [pts[0].lat, pts[0].lon],
		end: [pts.at(-1).lat, pts.at(-1).lon],
		bbox: {
			minLat: Math.min(...pts.map((p) => p.lat)), maxLat: Math.max(...pts.map((p) => p.lat)),
			minLon: Math.min(...pts.map((p) => p.lon)), maxLon: Math.max(...pts.map((p) => p.lon)),
		},
		lengthKm: {vincentyWgs84: round(cumV.at(-1) / 1000, 3), haversine: round(cumH.at(-1) / 1000, 3), vincenty3d: round(len3d / 1000, 3)},
		elevation: {min: Math.min(...eles), max: Math.max(...eles), gainRaw: round(up, 1), lossRaw: round(down, 1)},
		stepMetres: {median: round(steps[steps.length >> 1], 2), p95: round(steps[Math.floor(steps.length * 0.95)], 2), max: round(maxStep, 1), maxAtIndex: maxStepIdx, duplicates: dup},
		_pts: pts, _coords: coords, _cum: cumV,
	};
};

const A = describe('Projet SEP (Garmin Desktop App)', parseGpx(SRC_A));
const gpxB = parseGpx(SRC_B);
const B = describe('Tracé détaillé (Garmin Connect)', gpxB);

// ---------------------------------------------------------------------------
// Comparaison géométrique A ↔ B (distance de chaque point de A au tracé B, et inversement)
// Les deux tracés sont ordonnés : on cherche dans une fenêtre glissante autour de l'avancement.
// ---------------------------------------------------------------------------
const deviation = (P, Q) => {
	const out = new Float64Array(P._coords.length);
	let j = 0;
	for (let i = 0; i < P._coords.length; i++) {
		const from = Math.max(0, j - 200), to = Math.min(Q._coords.length - 1, j + 400);
		const r = nearestOnLine(P._coords[i], Q._coords, Q._cum, from, to);
		out[i] = r.d;
		if (r.index >= 0) j = r.index;
	}
	return out;
};
const stats = (arr, P) => {
	const s = Array.from(arr).sort((a, b) => a - b);
	let maxI = 0;
	arr.forEach((v, i) => { if (v > arr[maxI]) maxI = i; });
	const over = (t) => Array.from(arr).filter((v) => v > t).length;
	return {mean: round(s.reduce((x, y) => x + y, 0) / s.length, 3), median: round(s[s.length >> 1], 3), p99: round(s[Math.floor(s.length * 0.99)], 3), max: round(s.at(-1), 3), maxAt: {index: maxI, km: round(P._cum[maxI] / 1000, 3), lat: P._coords[maxI][1], lon: P._coords[maxI][0]}, pointsOver1m: over(1), pointsOver5m: over(5), pointsOver20m: over(20)};
};
const devAB = deviation(A, B);
const devBA = deviation(B, A);

// Exact identity check on rounded coordinates (6 décimales ≈ 0,1 m)
const key = (c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
const setA = new Set(A._coords.map(key));
const onlyInB = B._coords.map((c, i) => ({i, c})).filter(({c}) => !setA.has(key(c)));
const setB = new Set(B._coords.map(key));
const onlyInA = A._coords.map((c, i) => ({i, c})).filter(({c}) => !setB.has(key(c)));

// ---------------------------------------------------------------------------
// Waypoints du tracé détaillé : position projetée sur le tracé
// ---------------------------------------------------------------------------
const waypoints = gpxB.waypoints.map((w) => {
	const r = nearestOnLine([w.lon, w.lat], B._coords, B._cum);
	return {name: w.name, cmt: w.cmt, type: w.type, lat: w.lat, lon: w.lon, distanceToTrackM: round(r.d, 1), trackIndex: r.index, kmOnTrack: round(r.km, 3)};
});

// ---------------------------------------------------------------------------
// Anomalies : retours en arrière / tronçons empruntés deux fois (aller-retour)
// ---------------------------------------------------------------------------
const revisits = [];
{
	const coords = B._coords, cum = B._cum;
	// grille ~50 m pour détecter un passage au même endroit à > 2 km d'intervalle
	const cell = (c) => `${Math.round(c[0] / 0.0007)}:${Math.round(c[1] / 0.00045)}`;
	const seen = new Map();
	for (let i = 0; i < coords.length; i++) {
		const k = cell(coords[i]);
		const prev = seen.get(k);
		if (prev !== undefined && cum[i] - cum[prev] > 2000) revisits.push({firstKm: round(cum[prev] / 1000, 2), againKm: round(cum[i] / 1000, 2), lat: coords[i][1], lon: coords[i][0]});
		if (prev === undefined) seen.set(k, i);
	}
}
// Regroupe les revisites consécutives
const revisitGroups = [];
for (const r of revisits) {
	const g = revisitGroups.at(-1);
	if (g && r.againKm - g.toKm < 0.5) { g.toKm = r.againKm; g.n++; } else revisitGroups.push({fromKm: r.againKm, toKm: r.againKm, firstPassKm: r.firstKm, n: 1, lat: r.lat, lon: r.lon});
}

const strip = ({_pts, _coords, _cum, ...rest}) => rest;
const report = {
	generatedAt: new Date().toISOString(),
	sources: {A: SRC_A, B: SRC_B},
	A: strip(A),
	B: strip(B),
	comparison: {
		deviationOfAfromB_m: stats(devAB, A),
		deviationOfBfromA_m: stats(devBA, B),
		pointsOnlyInB: onlyInB.length,
		pointsOnlyInA: onlyInA.length,
		sampleOnlyInB: onlyInB.slice(0, 40).map(({i, c}) => ({i, km: round(B._cum[i] / 1000, 3), lon: c[0], lat: c[1], devToA: round(devBA[i], 2)})),
		sampleOnlyInA: onlyInA.slice(0, 40).map(({i, c}) => ({i, km: round(A._cum[i] / 1000, 3), lon: c[0], lat: c[1], devToB: round(devAB[i], 2)})),
	},
	waypointsB: waypoints,
	revisitedSectionsB: revisitGroups,
};
writeFileSync('data/generated/gpx-analysis.json', JSON.stringify(report, null, 2));

// Tracé de référence : fichier détaillé (B), tous les points, ordre conservé, [lon, lat, ele]
const feature = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: {
				name: 'Un pas pour maman — Noaillan → Cossé-le-Vivien',
				source: SRC_B,
				points: B.points,
				lengthKmGpx: B.lengthKm.vincentyWgs84,
				lengthKmCommunication: 556,
			},
			geometry: {type: 'LineString', coordinates: B._pts.map((p) => [p.lon, p.lat, p.ele])},
		},
		...waypoints.map((w) => ({type: 'Feature', properties: {kind: 'waypoint', name: w.name, cmt: w.cmt, kmOnTrack: w.kmOnTrack, distanceToTrackM: w.distanceToTrackM}, geometry: {type: 'Point', coordinates: [w.lon, w.lat]}})),
	],
};
writeFileSync('data/generated/track.geojson', JSON.stringify(feature));
// Distances cumulées (m) par point, pour le film
writeFileSync('data/generated/track-cumulative-m.json', JSON.stringify(Array.from(B._cum, (v) => Math.round(v * 10) / 10)));

console.log(JSON.stringify(report, null, 1));
