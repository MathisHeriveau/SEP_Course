// Typed access to the generated data + derived timing (when does the walker reach each commune?).
import communesJson from './communes.json';
import contextJson from './context-cities.json';
import summaryJson from './summary.json';
import waypointsJson from './waypoints.json';
import {KM_COMMUNICATION, KM_DISPLAY_MODE, SHOW_BOUNDARY_COMMUNES, TIMELINE} from '../config/film';
import {journeyKm} from '../geo/camera';
import {type LonLat, type Merc, toMerc} from '../geo/mercator';
import {ROUTE_TOTAL_KM_GPX, mercAtKm} from '../geo/route';

export type Commune = {
	code: string;
	nom: string;
	departement: string;
	departementNom: string;
	statut: 'traversee' | 'limite';
	entreeKm: number;
	sortieKm: number;
	longueurM: number;
	mairie: LonLat;
	mairieKm: number;
	mairieDistanceTraceM: number;
	population: number | null;
	confiance: string;
	isWaypoint: boolean;
};

export type Waypoint = {gpxName: string; gpxComment: string | null; lon: number; lat: number; km: number; communeCode: string; communeNom: string; departement: string};
export type ContextCity = {code: string; nom: string; tier: number; lonlat: LonLat; onRoute: boolean};

export const ALL_COMMUNES = communesJson as Commune[];
export const WAYPOINTS = waypointsJson as Waypoint[];
export const SUMMARY = summaryJson;
export const CONTEXT_CITIES = (contextJson as ContextCity[]).filter((c) => !c.onRoute);

/** Communes shown in the film (traversed; optionally also those whose boundary is only followed). */
export const FILM_COMMUNES = ALL_COMMUNES.filter((c) => c.statut === 'traversee' || SHOW_BOUNDARY_COMMUNES);
export const TRAVERSED_COUNT = ALL_COMMUNES.filter((c) => c.statut === 'traversee').length;
export const DEPARTEMENT_COUNT = new Set(ALL_COMMUNES.filter((c) => c.statut === 'traversee').map((c) => c.departement)).size;

// ---------------------------------------------------------------------------
// Time at which the walker reaches a given km (inverse of journeyKm)
// ---------------------------------------------------------------------------
export const timeAtKm = (km: number) => {
	let lo: number = TIMELINE.journey[0], hi: number = TIMELINE.journey[1];
	if (km <= 0) return lo;
	for (let i = 0; i < 50; i++) {
		const mid = (lo + hi) / 2;
		if (journeyKm(mid) < km) lo = mid; else hi = mid;
	}
	return hi;
};

export type CommuneEvent = Commune & {
	mairieMerc: Merc;
	/** nearest point of the track to the town hall */
	anchorMerc: Merc;
	tMairie: number;
	tEntree: number;
	index: number;
	labelSide: 1 | -1;
};

export const COMMUNE_EVENTS: CommuneEvent[] = FILM_COMMUNES.map((c, index) => {
	const mairieMerc = toMerc(c.mairie);
	const anchorMerc = mercAtKm(c.mairieKm);
	// Label goes on the side of the town hall relative to the direction of travel (away from the line)
	const a = mercAtKm(Math.max(0, c.mairieKm - 1));
	const b = mercAtKm(Math.min(ROUTE_TOTAL_KM_GPX, c.mairieKm + 1));
	const cross = (b.x - a.x) * (mairieMerc.y - anchorMerc.y) - (b.y - a.y) * (mairieMerc.x - anchorMerc.x);
	const far = c.mairieDistanceTraceM > 250;
	// screen x grows east; route heads north → cross>0 means town hall east of the line
	const labelSide: 1 | -1 = far ? (cross > 0 ? 1 : -1) : index % 2 === 0 ? 1 : -1;
	return {...c, mairieMerc, anchorMerc, tMairie: timeAtKm(c.mairieKm), tEntree: timeAtKm(c.entreeKm), index, labelSide};
});

export const WAYPOINT_EVENTS = WAYPOINTS.map((w) => ({
	...w,
	merc: toMerc([w.lon, w.lat]),
	t: timeAtKm(w.km),
	commune: ALL_COMMUNES.find((c) => c.code === w.communeCode),
}));

/** Département crossings (first traversed commune of each new département). */
export const DEPARTEMENT_SEGMENTS = (() => {
	const out: {code: string; nom: string; fromKm: number; t: number}[] = [];
	for (const c of ALL_COMMUNES.filter((x) => x.statut === 'traversee')) {
		if (!out.length || out[out.length - 1].code !== c.departement) out.push({code: c.departement, nom: c.departementNom, fromKm: c.entreeKm, t: timeAtKm(c.entreeKm)});
	}
	return out;
})();

export const departementAtKm = (km: number) => {
	let cur = DEPARTEMENT_SEGMENTS[0];
	for (const s of DEPARTEMENT_SEGMENTS) if (km >= s.fromKm) cur = s;
	return cur;
};

/** Value shown by the on-screen counter for a GPX distance. */
export const displayKm = (gpxKm: number) => (KM_DISPLAY_MODE === 'communication' ? (gpxKm / ROUTE_TOTAL_KM_GPX) * KM_COMMUNICATION : gpxKm);
export const DISPLAY_TOTAL_KM = KM_DISPLAY_MODE === 'communication' ? KM_COMMUNICATION : Math.round(ROUTE_TOTAL_KM_GPX * 10) / 10;

export const fmtKm = (km: number) => Math.floor(km + 1e-6).toLocaleString('fr-FR');
export const fmtCoord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4).replace('.', ',')}° ${v >= 0 ? pos : neg}`;
