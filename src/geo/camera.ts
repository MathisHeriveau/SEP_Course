// Camera choreography. Pure functions of (time, viewport) so the same camera can be
// evaluated by the film (Remotion) and by the tile-list script (Node).
import franceFeature from '../data/france.json';
import waypointsData from '../data/waypoints.json';
import {FPS, PACING, TIMELINE} from '../config/film';
import {type Camera, type LonLat, type Viewport, boundsOf, fitBounds, toMerc, worldSize} from './mercator';
import {ROUTE_COORDS, ROUTE_TOTAL_KM_GPX, railAtKm} from './route';

export type Format = 'landscape' | 'portrait';

// ---------------------------------------------------------------------------
// Easing helpers
// ---------------------------------------------------------------------------
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const progress = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));
// Cubic-bezier evaluation (same maths as CSS / Remotion Easing.bezier)
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
	const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
	const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
	const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
	const sy = (t: number) => ((ay * t + by) * t + cy) * t;
	const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
	return (x: number) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let t = x;
		for (let i = 0; i < 8; i++) {
			const e = sx(t) - x;
			const d = dsx(t);
			if (Math.abs(e) < 1e-7 || d === 0) break;
			t -= e / d;
		}
		return sy(Math.max(0, Math.min(1, t)));
	};
};
export const easeInOut = bezier(0.45, 0, 0.2, 1); // cinematic: soft start, long settle
export const easeOut = bezier(0.16, 1, 0.3, 1);
export const easeIn = bezier(0.5, 0, 0.75, 0);
export const smooth = (x: number) => x * x * (3 - 2 * x);

// ---------------------------------------------------------------------------
// Per-format framing parameters
// ---------------------------------------------------------------------------
type Framing = {
	startZoom: number;
	followZoom: number;
	waypointZoomBoost: number;
	arrivalZoom: number;
	leadKm: number;
	/** vertical offset of the walker relative to the centre, as a fraction of viewport height (+ = below) */
	headOffsetY: number;
	franceZoomOffset: number;
};
export const FRAMING: Record<Format, Framing> = {
	landscape: {startZoom: 12.35, followZoom: 10.35, waypointZoomBoost: 0.55, arrivalZoom: 12.55, leadKm: 7, headOffsetY: 0.06, franceZoomOffset: 0},
	portrait: {startZoom: 12.05, followZoom: 10.05, waypointZoomBoost: 0.55, arrivalZoom: 12.25, leadKm: 10, headOffsetY: 0.1, franceZoomOffset: 0},
};

export const formatOf = (vp: Viewport): Format => (vp.width >= vp.height ? 'landscape' : 'portrait');

// ---------------------------------------------------------------------------
// Journey time-warp: km travelled as a function of time
// ---------------------------------------------------------------------------
const WAYPOINT_KM = (waypointsData as {km: number}[]).map((w) => w.km);
const TOTAL = ROUTE_TOTAL_KM_GPX;
const STEP = 0.05;
const warp = (() => {
	const n = Math.ceil(TOTAL / STEP) + 1;
	const T = new Float64Array(n);
	const density = (km: number) => {
		let w = 1;
		for (const wk of WAYPOINT_KM) w += PACING.waypointWeight * Math.exp(-(((km - wk) / PACING.waypointSigmaKm) ** 2));
		w += PACING.startWeight * Math.exp(-((km / PACING.startSigmaKm) ** 2));
		w += PACING.endWeight * Math.exp(-(((km - TOTAL) / PACING.endSigmaKm) ** 2));
		return w;
	};
	for (let i = 1; i < n; i++) T[i] = T[i - 1] + density((i - 0.5) * STEP) * STEP;
	const total = T[n - 1];
	for (let i = 0; i < n; i++) T[i] /= total;
	return T;
})();
const easeJourney = bezier(0.3, 0, 0.55, 1);

/** Kilometres travelled (GPX distance) at time t (seconds). */
export const journeyKm = (t: number) => {
	const u = easeJourney(progress(t, TIMELINE.journey));
	let lo = 0, hi = warp.length - 1;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		if (warp[mid] <= u) lo = mid; else hi = mid;
	}
	const span = warp[hi] - warp[lo];
	const f = span > 0 ? (u - warp[lo]) / span : 0;
	return Math.min(TOTAL, (lo + f) * STEP);
};

/** 0 → 1 weight: how close we are to a waypoint (used for zoom breathing). */
const waypointProximity = (km: number) => {
	let p = 0;
	for (const wk of WAYPOINT_KM) p = Math.max(p, Math.exp(-(((km - wk) / 7) ** 2)));
	return p;
};

// ---------------------------------------------------------------------------
// Key cameras
// ---------------------------------------------------------------------------
const FRANCE_BOUNDS = (() => {
	const pts: LonLat[] = [];
	const g = franceFeature.geometry as {type: string; coordinates: number[][][][] | number[][][]};
	const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as number[][][][];
	for (const poly of polys) for (const p of poly[0]) pts.push([p[0], p[1]]);
	return boundsOf(pts);
})();
const ROUTE_BOUNDS = boundsOf(ROUTE_COORDS);
const START = toMerc(ROUTE_COORDS[0]);
const END = toMerc(ROUTE_COORDS[ROUTE_COORDS.length - 1]);

export const franceCamera = (vp: Viewport): Camera => {
	const f = formatOf(vp);
	const cam = fitBounds(FRANCE_BOUNDS, vp, f === 'landscape' ? {top: 0.07, bottom: 0.07, left: 0.25, right: 0.25} : {top: 0.22, bottom: 0.22, left: 0.06, right: 0.06});
	return {...cam, zoom: cam.zoom + FRAMING[f].franceZoomOffset};
};

export const routeOverviewCamera = (vp: Viewport): Camera => {
	const f = formatOf(vp);
	return fitBounds(ROUTE_BOUNDS, vp, f === 'landscape' ? {top: 0.08, bottom: 0.08, left: 0.1, right: 0.62} : {top: 0.12, bottom: 0.4, left: 0.26, right: 0.26});
};

const centredOn = (m: {x: number; y: number}, zoom: number, vp: Viewport, offsetY: number): Camera => {
	// offsetY: fraction of viewport height the point sits below the centre
	const s = worldSize(zoom);
	return {x: m.x, y: m.y - (offsetY * vp.height) / s, zoom};
};

export const startCamera = (vp: Viewport, extraZoom = 0): Camera => centredOn(START, FRAMING[formatOf(vp)].startZoom + extraZoom, vp, 0.04);
export const arrivalCamera = (vp: Viewport, extraZoom = 0): Camera => centredOn(END, FRAMING[formatOf(vp)].arrivalZoom + extraZoom, vp, 0.02);

/** Camera that follows the walker along the smoothed rail. */
export const followCamera = (km: number, vp: Viewport): Camera => {
	const fr = FRAMING[formatOf(vp)];
	const zoom = fr.followZoom + fr.waypointZoomBoost * smooth(waypointProximity(km));
	const c = railAtKm(Math.min(TOTAL, km + fr.leadKm));
	return {x: c.x, y: c.y, zoom};
};

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------
export const lerpCamera = (a: Camera, b: Camera, k: number): Camera => {
	// Interpolate the centre in screen space at the destination scale so the motion feels linear on screen
	const zoom = a.zoom + (b.zoom - a.zoom) * k;
	return {x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, zoom};
};

/** van Wijk & Nuij "optimal" zoom-pan path (same as MapLibre flyTo). k in [0,1]. */
export const flyCamera = (a: Camera, b: Camera, k: number, vp: Viewport, rho = 1.35): Camera => {
	const w0 = Math.max(vp.width, vp.height);
	const scale = 2 ** (b.zoom - a.zoom);
	const w1 = w0 / scale;
	const s0 = worldSize(a.zoom);
	const dx = (b.x - a.x) * s0, dy = (b.y - a.y) * s0;
	const u1 = Math.hypot(dx, dy);
	const rho2 = rho * rho;
	if (u1 < 1e-6) {
		return {x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, zoom: a.zoom + (b.zoom - a.zoom) * k};
	}
	const r = (i: 0 | 1) => {
		const bb = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (i ? w1 : w0) * rho2 * u1);
		return Math.log(Math.sqrt(bb * bb + 1) - bb);
	};
	const r0 = r(0), r1 = r(1);
	const S = (r1 - r0) / rho;
	const s = k * S;
	const w = Math.cosh(r0) / Math.cosh(r0 + rho * s);
	const u = (w0 * ((Math.cosh(r0) * Math.tanh(r0 + rho * s) - Math.sinh(r0)) / rho2)) / u1;
	return {x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, zoom: a.zoom + Math.log2(1 / w)};
};

// ---------------------------------------------------------------------------
// The choreography
// ---------------------------------------------------------------------------
export const cameraAt = (frame: number, vp: Viewport): Camera => {
	const t = frame / FPS;
	const T = TIMELINE;

	const france = franceCamera(vp);
	// Slow push while holding on France
	const franceDrift = {...france, zoom: france.zoom + 0.12 * easeInOut(progress(t, [T.overview[0], T.flyToStart[0]]))};
	if (t < T.flyToStart[0]) return franceDrift;

	const startHoldEnd = T.journey[0];
	const start0 = startCamera(vp);
	if (t < T.flyToStart[1]) return flyCamera(franceDrift, start0, easeInOut(progress(t, T.flyToStart)), vp);

	// Gentle push on the start point
	const startPush = startCamera(vp, 0.22 * easeInOut(progress(t, [T.flyToStart[1], startHoldEnd + 4])));
	if (t < startHoldEnd) return startPush;

	// Journey: blend from the start push into the follow camera, then into the arrival camera.
	const km = journeyKm(t);
	const follow = followCamera(km, vp);
	const intoFollow = easeInOut(progress(t, [startHoldEnd, startHoldEnd + 7]));
	let cam = intoFollow < 1 ? lerpCamera(startPush, follow, intoFollow) : follow;
	if (intoFollow < 1) {
		// keep the zoom-out smooth in log space
		cam = {...cam, zoom: startPush.zoom + (follow.zoom - startPush.zoom) * intoFollow};
	}
	const arrivalBlend = easeInOut(progress(t, [T.journey[1] - 13, T.journey[1] + 1.5]));
	const arrival = arrivalCamera(vp, 0.3 * easeInOut(progress(t, [T.journey[1], T.pullBack[0]])));
	if (arrivalBlend > 0) cam = lerpCamera(cam, arrival, arrivalBlend);
	if (t < T.pullBack[0]) return cam;

	// Pull back to the whole route
	const overview = routeOverviewCamera(vp);
	const overviewDrift = {...overview, zoom: overview.zoom + 0.1 * easeInOut(progress(t, [T.pullBack[1], T.end]))};
	if (t < T.pullBack[1]) return flyCamera(arrival, overview, easeInOut(progress(t, T.pullBack)), vp);
	return overviewDrift;
};

export const JOURNEY_TOTAL_KM = TOTAL;
