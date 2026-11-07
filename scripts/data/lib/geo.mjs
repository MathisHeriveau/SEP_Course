// Shared geodesy helpers for the data pipeline.
// All coordinates are [lon, lat] (GeoJSON order).
import {readFileSync} from 'node:fs';
import {XMLParser} from 'fast-xml-parser';

// ---------------------------------------------------------------------------
// GPX parsing
// ---------------------------------------------------------------------------
export const parseGpx = (path) => {
	const xml = readFileSync(path, 'utf8').replace(/^﻿/, '');
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '',
		isArray: (name) => ['trk', 'trkseg', 'trkpt', 'wpt', 'rte', 'rtept'].includes(name),
	});
	const doc = parser.parse(xml).gpx;
	const toNum = (v) => (v === undefined || v === '' ? null : Number(v));
	const tracks = (doc.trk ?? []).map((trk) => ({
		name: trk.name ?? null,
		segments: (trk.trkseg ?? []).map((seg) =>
			(seg.trkpt ?? []).map((p) => ({
				lon: Number(p.lon),
				lat: Number(p.lat),
				ele: toNum(p.ele),
				time: p.time ?? null,
			})),
		),
	}));
	const waypoints = (doc.wpt ?? []).map((w) => ({
		name: String(w.name ?? ''),
		cmt: w.cmt === undefined || w.cmt === '' ? null : String(w.cmt),
		type: w.type ?? null,
		lon: Number(w.lon),
		lat: Number(w.lat),
	}));
	return {creator: doc.creator ?? null, metadataName: doc.metadata?.name ?? null, metadataTime: doc.metadata?.time ?? null, tracks, waypoints};
};

// ---------------------------------------------------------------------------
// Distances
// ---------------------------------------------------------------------------
const R = 6371008.8; // mean Earth radius (m), same as Turf
const rad = (d) => (d * Math.PI) / 180;

export const haversine = (a, b) => {
	const dLat = rad(b[1] - a[1]);
	const dLon = rad(b[0] - a[0]);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

// Vincenty inverse formula on the WGS84 ellipsoid (metres). Accurate to < 1 mm.
export const vincenty = (p1, p2) => {
	const a = 6378137;
	const f = 1 / 298.257223563;
	const b = (1 - f) * a;
	const L = rad(p2[0] - p1[0]);
	const U1 = Math.atan((1 - f) * Math.tan(rad(p1[1])));
	const U2 = Math.atan((1 - f) * Math.tan(rad(p2[1])));
	const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1), sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
	let lambda = L, lambdaP, iter = 100;
	let sinSigma, cosSigma, sigma, cosSqAlpha, cos2SigmaM;
	do {
		const sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
		sinSigma = Math.sqrt((cosU2 * sinLambda) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2);
		if (sinSigma === 0) return 0;
		cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
		sigma = Math.atan2(sinSigma, cosSigma);
		const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
		cosSqAlpha = 1 - sinAlpha * sinAlpha;
		cos2SigmaM = cosSqAlpha !== 0 ? cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha : 0;
		const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
		lambdaP = lambda;
		lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
	} while (Math.abs(lambda - lambdaP) > 1e-12 && --iter > 0);
	const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
	const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
	const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
	const deltaSigma = B * sinSigma * (cos2SigmaM + (B / 4) * (cosSigma * (-1 + 2 * cos2SigmaM ** 2) - (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)));
	return b * A * (sigma - deltaSigma);
};

export const cumulative = (coords, fn = vincenty) => {
	const cum = new Float64Array(coords.length);
	for (let i = 1; i < coords.length; i++) cum[i] = cum[i - 1] + fn(coords[i - 1], coords[i]);
	return cum;
};

// Local equirectangular projection (metres) around a reference latitude — fine for < 50 km.
export const localXY = (p, ref) => {
	const k = Math.cos(rad(ref[1]));
	return [rad(p[0] - ref[0]) * R * k, rad(p[1] - ref[1]) * R];
};

// Distance (m) from point p to segment [a,b], plus projection parameter t in [0,1].
export const pointSegment = (p, a, b) => {
	const A = localXY(a, p), B = localXY(b, p);
	const dx = B[0] - A[0], dy = B[1] - A[1];
	const len2 = dx * dx + dy * dy;
	let t = len2 === 0 ? 0 : -(A[0] * dx + A[1] * dy) / len2;
	t = Math.max(0, Math.min(1, t));
	const x = A[0] + t * dx, y = A[1] + t * dy;
	return {d: Math.hypot(x, y), t};
};

// Nearest position on a polyline. Returns {d (m), index (segment start), t, km}.
export const nearestOnLine = (p, coords, cum, from = 0, to = coords.length - 1) => {
	let best = {d: Infinity, index: -1, t: 0};
	for (let i = from; i < to; i++) {
		// Cheap bbox reject (~0.05° ≈ 4–5 km margin) before exact distance
		const a = coords[i], b = coords[i + 1];
		if (best.d < 5000) {
			const margin = best.d / 80000;
			if (p[0] < Math.min(a[0], b[0]) - margin * 1.5 || p[0] > Math.max(a[0], b[0]) + margin * 1.5) continue;
			if (p[1] < Math.min(a[1], b[1]) - margin || p[1] > Math.max(a[1], b[1]) + margin) continue;
		}
		const r = pointSegment(p, a, b);
		if (r.d < best.d) best = {d: r.d, index: i, t: r.t};
	}
	const km = (cum[best.index] + best.t * (cum[best.index + 1] - cum[best.index])) / 1000;
	return {...best, km};
};

export const round = (x, n = 6) => Math.round(x * 10 ** n) / 10 ** n;
