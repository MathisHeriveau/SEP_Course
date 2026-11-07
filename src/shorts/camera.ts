// Évaluation des plans des shorts : caméra, position du marcheur. Fonctions pures (film + script de tuiles).
import franceFeature from '../data/france.json';
import {bezier, easeInOut, flyCamera} from '../geo/camera';
import {type Camera, type LonLat, type Viewport, boundsOf, fitBounds, toMerc, worldSize} from '../geo/mercator';
import {ROUTE_COORDS, ROUTE_TOTAL_KM_GPX, railAtKm} from '../geo/route';
import type {CamSpec, JourneyKey, Shot, ShortSpec} from './storyboards';

const ROUTE_BOUNDS = boundsOf(ROUTE_COORDS);
const FRANCE_BOUNDS = (() => {
	const pts: LonLat[] = [];
	const g = franceFeature.geometry as {type: string; coordinates: unknown};
	const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as number[][][][];
	for (const poly of polys) for (const p of poly[0]) pts.push([p[0], p[1]]);
	return boundsOf(pts);
})();
const END = toMerc(ROUTE_COORDS[ROUTE_COORDS.length - 1]);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeOutWalk = bezier(0.28, 0.42, 0.38, 1); // arrivée : la marche ralentit sans s'arrêter net
const ease = {linear: (x: number) => x, out: easeOutWalk, inOut: easeInOut};

/** Cadrages propres au 9:16 : le texte occupe le haut, l'image le bas. */
export const ROUTE_PAD = {top: 0.47, bottom: 0.13, left: 0.3, right: 0.3};
export const FRANCE_PAD = {top: 0.43, bottom: 0.1, left: 0.05, right: 0.05};

/**
 * Trajet accéléré : entre deux points de passage, g(x) = x − (1 − r)·sin(2πx)/2π.
 * La vitesse vaut r × la moyenne aux villes (ralenti, jamais d'arrêt) et culmine à mi-chemin.
 */
const journeyKm = (keys: JourneyKey[], t: number, rest = 0.12) => {
	if (t <= keys[0].t) return keys[0].km;
	for (let i = 0; i < keys.length - 1; i++) {
		const a = keys[i], b = keys[i + 1];
		if (t <= b.t) {
			const x = (t - a.t) / (b.t - a.t);
			const g = x - ((1 - rest) * Math.sin(2 * Math.PI * x)) / (2 * Math.PI);
			return a.km + (b.km - a.km) * g;
		}
	}
	return keys[keys.length - 1].km;
};

/** Villes repères d'un plan, avec l'instant où le marcheur les atteint. */
export const shotTowns = (shot: Shot): {name: string; km: number; t: number}[] => {
	if (shot.journey) return shot.journey.keys.filter((k) => k.town).map((k) => ({name: k.town as string, km: k.km, t: k.t}));
	return [];
};

/** Kilomètre GPX du marcheur à l'instant t (secondes) dans un plan. */
export const walkKmAt = (shot: Shot, t: number): number | null => {
	if (shot.journey) return journeyKm(shot.journey.keys, t, shot.journey.rest);
	const w = shot.walk;
	if (!w) return null;
	const delay = w.delay ?? 0;
	const dur = w.dur ?? shot.end - shot.start - delay;
	const p = clamp01((t - shot.start - delay) / dur);
	return w.from + (w.to - w.from) * ease[w.ease ?? 'linear'](p);
};

const camOf = (spec: CamSpec, vp: Viewport, km: number): Camera => {
	switch (spec.kind) {
		case 'route': {
			const c = fitBounds(ROUTE_BOUNDS, vp, ROUTE_PAD);
			return {...c, zoom: c.zoom + (spec.dz ?? 0)};
		}
		case 'france': {
			const c = fitBounds(FRANCE_BOUNDS, vp, FRANCE_PAD);
			return {...c, zoom: c.zoom + (spec.dz ?? 0)};
		}
		case 'end': {
			const s = worldSize(spec.zoom);
			return {x: END.x, y: END.y - (0.04 * vp.height) / s, zoom: spec.zoom};
		}
		case 'walker': {
			const c = railAtKm(Math.min(ROUTE_TOTAL_KM_GPX, km), 2.5);
			const s = worldSize(spec.zoom);
			return {x: c.x, y: c.y - (((spec.headY ?? 0.6) - 0.5) * vp.height) / s, zoom: spec.zoom};
		}
	}
};

export const shotCamera = (shot: Shot, t: number, vp: Viewport): Camera => {
	const p = clamp01((t - shot.start) / (shot.end - shot.start));
	const km = walkKmAt(shot, t) ?? 0;
	const c = shot.camera;
	if (c.type === 'hold') {
		const cam = camOf(c.cam, vp, km);
		return {...cam, zoom: cam.zoom + (c.push ?? 0) * easeInOut(p)};
	}
	if (c.type === 'fly') {
		const k = clamp01((t - shot.start) / c.dur);
		const to = camOf(c.to, vp, km);
		const after = clamp01((t - shot.start - c.dur) / Math.max(0.01, shot.end - shot.start - c.dur));
		if (k >= 1) return {...to, zoom: to.zoom + (c.push ?? 0) * easeInOut(after)};
		return flyCamera(camOf(c.from, vp, km), to, easeInOut(k), vp);
	}
	if (c.type === 'journey') {
		// zoom : large quand on file, rapproché à chaque ville
		let prox = 0;
		for (const tw of shotTowns(shot)) prox = Math.max(prox, Math.exp(-(((t - tw.t) / 0.62) ** 2)));
		let z = c.zoomFast + (c.zoomTown - c.zoomFast) * prox;
		const ws = c.zoomStart !== undefined ? easeInOut(clamp01((t - shot.start) / 1.5)) : 1;
		if (c.zoomStart !== undefined) z = c.zoomStart + (z - c.zoomStart) * ws;
		const we = c.zoomEnd !== undefined ? easeInOut(clamp01((shot.end - t) / 1.5)) : 1;
		if (c.zoomEnd !== undefined) z = c.zoomEnd + (z - c.zoomEnd) * we;
		const follow = camOf({kind: 'walker', zoom: z, headY: 0.6}, vp, km);
		if (c.fly && t - shot.start < c.fly.dur) return flyCamera(camOf(c.fly.from, vp, km), follow, easeInOut(clamp01((t - shot.start) / c.fly.dur)), vp);
		return follow;
	}
	// follow
	const z = c.zoom[0] + (c.zoom[1] - c.zoom[0]) * easeInOut(p);
	const hy = c.headY ? c.headY[0] + (c.headY[1] - c.headY[0]) * easeInOut(p) : 0.6;
	const follow = camOf({kind: 'walker', zoom: z, headY: hy}, vp, km);
	if (c.fly && t - shot.start < c.fly.dur) return flyCamera(camOf(c.fly.from, vp, km), follow, easeInOut(clamp01((t - shot.start) / c.fly.dur)), vp);
	return follow;
};

/** Cadrage libre du parcours entier (miniature). */
export const routeCamera = (vp: Viewport, pad: {top: number; bottom: number; left: number; right: number}) => fitBounds(ROUTE_BOUNDS, vp, pad);

export const shotAt = (spec: ShortSpec, t: number): Shot => {
	for (const s of spec.shots) if (t >= s.start && t < s.end) return s;
	return spec.shots[spec.shots.length - 1];
};
