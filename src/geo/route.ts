// Route geometry helpers: position along the GPX track by distance, partial slices,
// and a smoothed "camera rail" so the camera never shakes with the road's wiggles.
import routeData from '../data/route.json';
import {type LonLat, type Merc, toMerc} from './mercator';

export const ROUTE_COORDS = routeData.coords as LonLat[];
export const ROUTE_CUM_KM = routeData.cumKm as number[];
export const ROUTE_TOTAL_KM_GPX = routeData.totalKmGpx;
export const ROUTE_MERC: Merc[] = ROUTE_COORDS.map(toMerc);

/** Index i such that cum[i] <= km < cum[i+1] */
export const segmentAt = (km: number) => {
	let lo = 0, hi = ROUTE_CUM_KM.length - 1;
	if (km <= 0) return 0;
	if (km >= ROUTE_CUM_KM[hi]) return hi - 1;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		if (ROUTE_CUM_KM[mid] <= km) lo = mid; else hi = mid;
	}
	return lo;
};

export const mercAtKm = (km: number): Merc => {
	const i = segmentAt(km);
	const a = ROUTE_MERC[i], b = ROUTE_MERC[i + 1] ?? a;
	const d = ROUTE_CUM_KM[i + 1] - ROUTE_CUM_KM[i];
	const t = d > 0 ? Math.max(0, Math.min(1, (km - ROUTE_CUM_KM[i]) / d)) : 0;
	return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
};

export const lonLatAtKm = (km: number): LonLat => {
	const i = segmentAt(km);
	const a = ROUTE_COORDS[i], b = ROUTE_COORDS[i + 1] ?? a;
	const d = ROUTE_CUM_KM[i + 1] - ROUTE_CUM_KM[i];
	const t = d > 0 ? Math.max(0, Math.min(1, (km - ROUTE_CUM_KM[i]) / d)) : 0;
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
};

// ---------------------------------------------------------------------------
// Camera rail: Gaussian-smoothed route position sampled every RAIL_STEP km.
// ---------------------------------------------------------------------------
const RAIL_STEP = 0.25;
const buildRail = (sigmaKm: number) => {
	const n = Math.ceil(ROUTE_TOTAL_KM_GPX / RAIL_STEP) + 1;
	const raw: Merc[] = [];
	for (let i = 0; i < n; i++) raw.push(mercAtKm(i * RAIL_STEP));
	const half = Math.ceil((sigmaKm * 3) / RAIL_STEP);
	const w: number[] = [];
	for (let k = -half; k <= half; k++) w.push(Math.exp(-0.5 * ((k * RAIL_STEP) / sigmaKm) ** 2));
	const out: Merc[] = [];
	for (let i = 0; i < n; i++) {
		let sx = 0, sy = 0, sw = 0;
		for (let k = -half; k <= half; k++) {
			// mirror at the ends so the rail still starts/ends on the real points
			let j = i + k;
			if (j < 0) j = -j;
			if (j >= n) j = 2 * (n - 1) - j;
			const ww = w[k + half];
			sx += raw[j].x * ww;
			sy += raw[j].y * ww;
			sw += ww;
		}
		out.push({x: sx / sw, y: sy / sw});
	}
	return out;
};

const rails = new Map<number, Merc[]>();
export const railAtKm = (km: number, sigmaKm = 7): Merc => {
	let rail = rails.get(sigmaKm);
	if (!rail) {
		rail = buildRail(sigmaKm);
		rails.set(sigmaKm, rail);
	}
	const f = Math.max(0, Math.min(rail.length - 1.000001, km / RAIL_STEP));
	const i = Math.floor(f), t = f - i;
	return {x: rail[i].x + (rail[i + 1].x - rail[i].x) * t, y: rail[i].y + (rail[i + 1].y - rail[i].y) * t};
};
