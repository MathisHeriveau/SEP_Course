// Vector overlay drawn with the exact same projection as the basemap tiles.
import React, {useMemo} from 'react';
import communesPolygons from '../data/communes-polygons.json';
import departements from '../data/departements.json';
import france from '../data/france.json';
import {COLORS} from '../config/theme';
import {TIMELINE} from '../config/film';
import {COMMUNE_EVENTS, CONTEXT_CITIES, WAYPOINT_EVENTS} from '../data';
import {smooth, easeOut} from '../geo/camera';
import {type Camera, type Merc, type Viewport, toMerc} from '../geo/mercator';
import {ROUTE_MERC, ROUTE_TOTAL_KM_GPX, mercAtKm, segmentAt} from '../geo/route';
import {type MercPolygon, makeProjector, polygonPath, polylinePath, toMercPolygons} from './paths';

// --- Static geometry, converted once --------------------------------------------------------
const FRANCE = toMercPolygons(france.geometry, toMerc);
const DEPS = (departements.features as {properties: {code: string; parcours: boolean}; geometry: {type: string; coordinates: unknown}}[]).map((f) => ({
	code: f.properties.code,
	parcours: f.properties.parcours,
	polys: toMercPolygons(f.geometry, toMerc),
}));
const DEPS_ALL = DEPS.flatMap((d) => d.polys);
const DEPS_ROUTE = DEPS.filter((d) => d.parcours).flatMap((d) => d.polys);
const COMMUNE_POLYS = new Map<string, MercPolygon[]>(
	(communesPolygons.features as {properties: {code: string}; geometry: {type: string; coordinates: unknown}}[]).map((f) => [f.properties.code, toMercPolygons(f.geometry, toMerc)]),
);
const CONTEXT = CONTEXT_CITIES.map((c) => ({...c, merc: toMerc(c.lonlat)}));
export const START_MERC = ROUTE_MERC[0];
export const END_MERC = ROUTE_MERC[ROUTE_MERC.length - 1];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
const easeInOutQuad = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

export type OverlayMode = 'film' | 'poster';

export type OverlayProps = {
	cam: Camera;
	vp: Viewport;
	/** time in seconds (film) */
	t: number;
	/** km walked (GPX distance) */
	km: number;
	unit: number;
	mode?: OverlayMode;
};

/** Visibility of context cities by tier and zoom. */
export const contextOpacity = (tier: number, zoom: number) => {
	if (tier === 1) return 1 - ramp(zoom, 6.6, 7.4);
	if (tier === 2) return ramp(zoom, 6.3, 6.9) * (1 - ramp(zoom, 10.6, 11.2));
	return ramp(zoom, 8.8, 9.4) * (1 - ramp(zoom, 11.8, 12.4));
};

export const GeoOverlay: React.FC<OverlayProps> = ({cam, vp, t, km, unit, mode = 'film'}) => {
	const P = useMemo(() => makeProjector(cam, vp), [cam, vp]);
	const T = TIMELINE;
	const poster = mode === 'poster';
	const z = cam.zoom;

	// ---------------------------------------------------------------- opacities
	const franceOpacity = poster ? 0.35 : 0.55 * (1 - ramp(z, 6.8, 8.6)) + 0.18 * ramp(z, 6.8, 8.6) * (1 - ramp(z, 8.6, 9.4));
	const depLineOpacity = poster ? 0.16 : 0.1 + 0.08 * ramp(z, 7, 9.5);
	// Teinte des départements du parcours : uniquement sur les vues larges
	const routeDepFill = poster ? 0.045 : ramp(t, T.ghostRoute[0], T.ghostRoute[1]) * 0.07 * (1 - ramp(z, 6.6, 8.2)) * (1 - 0.35 * ramp(t, T.pullBack[0], T.pullBack[1]));
	// Tracé prévu : se dessine sur la vue France, reste en filigrane pendant le parcours
	const ghostDraw = poster ? 0 : easeInOutQuad(ramp(t, T.ghostRoute[0], T.ghostRoute[1]));
	const ghostOpacity = poster ? 0 : (ghostDraw > 0 ? 1 : 0) * (0.75 - 0.45 * ramp(z, 6.5, 9.5)) * (1 - ramp(t, T.journey[1] - 2, T.journey[1]));

	// ---------------------------------------------------------------- route geometry
	const drawnKm = poster ? ROUTE_TOTAL_KM_GPX : km;
	const head = mercAtKm(drawnKm);
	const upTo = segmentAt(drawnKm) + 1;
	const routeD = drawnKm > 0.001 ? polylinePath(ROUTE_MERC, P, {minDistPx: 0.7}, upTo, head) : '';
	const ghostKm = ROUTE_TOTAL_KM_GPX * ghostDraw;
	const ghostD = ghostOpacity > 0 && ghostKm > 0.01 ? polylinePath(ROUTE_MERC, P, {minDistPx: 1.2}, segmentAt(ghostKm) + 1, mercAtKm(ghostKm)) : '';
	const ghostDash = z < 8 ? undefined : `${0.1 * unit} ${4.2 * unit}`;
	const lineW = (poster ? 4.2 : 3.1) * unit * (0.82 + 0.18 * ramp(z, 7, 10));

	// ---------------------------------------------------------------- communes (polygons lit when entered)
	const settledPolys: MercPolygon[] = [];
	const fresh: {code: string; age: number}[] = [];
	for (const c of COMMUNE_EVENTS) {
		const polys = COMMUNE_POLYS.get(c.code);
		if (!polys) continue;
		const age = poster ? 99 : t - c.tEntree;
		if (km < c.entreeKm - 1e-6 && !poster) continue;
		if (age > 3.5) settledPolys.push(...polys);
		else fresh.push({code: c.code, age});
	}
	const settledD = polygonPath(settledPolys, P, 1);

	// ---------------------------------------------------------------- markers
	const markerScale = clamp01(0.32 + 0.68 * ramp(z, 7, 10));
	const markers = COMMUNE_EVENTS.filter((c) => poster || t >= c.tMairie);

	const startVisible = poster ? 1 : ramp(t, T.overview[0] + 1.6, T.overview[0] + 2.6);
	const endVisible = poster ? 1 : ramp(t, T.overview[0] + 2.4, T.overview[0] + 3.4) * (1 - ramp(t, T.flyToStart[0], T.flyToStart[0] + 1.2)) + ramp(t, T.journey[1] - 0.6, T.journey[1] + 0.4);
	const walking = !poster && t >= T.flyToStart[1] - 1 && t <= T.pullBack[0] + 0.5;
	const pulse = (t * 0.62) % 1;

	const px = (m: Merc) => P.x(m);
	const py = (m: Merc) => P.y(m);

	return (
		<svg width={vp.width} height={vp.height} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
			<defs>
				<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation={5 * unit} />
				</filter>
				<filter id="softglow" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation={2.2 * unit} />
				</filter>
			</defs>

			{/* France & départements */}
			{routeDepFill > 0.001 && <path d={polygonPath(DEPS_ROUTE, P, 1.2)} fill={COLORS.accent} fillOpacity={routeDepFill} fillRule="evenodd" />}
			<path d={polygonPath(DEPS_ALL, P, 1.2)} fill="none" stroke={COLORS.offWhite} strokeOpacity={depLineOpacity} strokeWidth={0.9 * unit} strokeDasharray={`${3 * unit} ${3 * unit}`} />
			{franceOpacity > 0.01 && <path d={polygonPath(FRANCE, P, 1)} fill="none" stroke={COLORS.offWhite} strokeOpacity={franceOpacity} strokeWidth={1.3 * unit} strokeLinejoin="round" />}

			{/* Communes traversées */}
			{settledD && <path d={settledD} fill={COLORS.offWhite} fillOpacity={poster ? 0.045 : 0.028} stroke={COLORS.offWhite} strokeOpacity={poster ? 0.16 : 0.09} strokeWidth={0.8 * unit} fillRule="evenodd" />}
			{fresh.map(({code, age}) => {
				const k = ramp(age, 0, 0.7);
				const decay = 1 - smooth(ramp(age, 1.2, 3.5));
				return (
					<path
						key={code}
						d={polygonPath(COMMUNE_POLYS.get(code) ?? [], P, 1)}
						fill={COLORS.offWhite}
						fillOpacity={k * (0.028 + 0.045 * decay)}
						stroke={COLORS.offWhite}
						strokeOpacity={k * (0.09 + 0.22 * decay)}
						strokeWidth={(0.8 + 0.6 * decay) * unit}
						fillRule="evenodd"
					/>
				);
			})}

			{/* Tracé prévu (filigrane) */}
			{ghostD && <path d={ghostD} fill="none" stroke={z < 8 ? COLORS.accent : COLORS.offWhite} strokeOpacity={ghostOpacity} strokeWidth={(z < 8 ? 1.8 : 1.6) * unit} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ghostDash} />}

			{/* Liaisons tracé → mairie (mairies éloignées du tracé) */}
			{markers.map((c) => {
				if (c.mairieDistanceTraceM < 350) return null;
				const k = poster ? 1 : easeOut(ramp(t - c.tMairie, 0, 0.6));
				const ax = px(c.anchorMerc), ay = py(c.anchorMerc);
				const bx = px(c.mairieMerc), by = py(c.mairieMerc);
				return <line key={`l${c.code}`} x1={ax} y1={ay} x2={ax + (bx - ax) * k} y2={ay + (by - ay) * k} stroke={COLORS.offWhite} strokeOpacity={0.38} strokeWidth={1 * unit} strokeDasharray={`${2 * unit} ${3 * unit}`} />;
			})}

			{/* Tracé parcouru */}
			{routeD && (
				<>
					<path d={routeD} fill="none" stroke={COLORS.accentGlow} strokeOpacity={0.32} strokeWidth={lineW * 3.2} strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
					<path d={routeD} fill="none" stroke={COLORS.accent} strokeWidth={lineW} strokeLinecap="round" strokeLinejoin="round" />
				</>
			)}

			{/* Villes de contexte */}
			{!poster &&
				CONTEXT.map((c) => {
					const o = contextOpacity(c.tier, z) * ramp(t, T.overview[0] + 0.5, T.overview[0] + 2) * (1 - ramp(t, T.statsCard[0] - 0.8, T.statsCard[0] + 0.4));
					if (o <= 0.01) return null;
					return <circle key={c.code} cx={px(c.merc)} cy={py(c.merc)} r={2.6 * unit} fill="none" stroke={COLORS.offWhite} strokeOpacity={0.5 * o} strokeWidth={1.1 * unit} />;
				})}

			{/* Mairies */}
			{markers.map((c) => {
				const age = poster ? 9 : t - c.tMairie;
				const s = poster ? 1 : easeOut(ramp(age, 0, 0.45));
				const x = px(c.mairieMerc), y = py(c.mairieMerc);
				if (x < -40 || y < -40 || x > vp.width + 40 || y > vp.height + 40) return null;
				const r = (c.isWaypoint ? 5.6 : 4.0) * unit * markerScale;
				const ripple = ramp(age, 0, 1.1);
				return (
					<g key={`m${c.code}`}>
						{!poster && ripple < 1 && <circle cx={x} cy={y} r={r + 16 * unit * easeOut(ripple)} fill="none" stroke={c.isWaypoint ? COLORS.red : COLORS.offWhite} strokeOpacity={0.55 * (1 - ripple)} strokeWidth={1.2 * unit} />}
						{c.isWaypoint ? (
							<>
								<circle cx={x} cy={y} r={r * s} fill="#0b0b0b" stroke={COLORS.red} strokeWidth={2 * unit * markerScale} />
								<circle cx={x} cy={y} r={r * 0.42 * s} fill={COLORS.offWhite} />
							</>
						) : (
							<circle cx={x} cy={y} r={r * s} fill={COLORS.offWhite} fillOpacity={0.92} stroke="#0b0b0b" strokeWidth={1.3 * unit * markerScale} />
						)}
					</g>
				);
			})}

			{/* Départ / arrivée */}
			{startVisible > 0 && (
				<g opacity={startVisible}>
					<circle cx={px(START_MERC)} cy={py(START_MERC)} r={9 * unit} fill="none" stroke={COLORS.offWhite} strokeOpacity={0.7} strokeWidth={1.4 * unit} />
					<circle cx={px(START_MERC)} cy={py(START_MERC)} r={3.6 * unit} fill={COLORS.offWhite} />
				</g>
			)}
			{endVisible > 0 && (
				<g opacity={Math.min(1, endVisible)}>
					<circle cx={px(END_MERC)} cy={py(END_MERC)} r={9 * unit} fill="none" stroke={COLORS.red} strokeWidth={1.8 * unit} />
					<circle cx={px(END_MERC)} cy={py(END_MERC)} r={3.6 * unit} fill={COLORS.offWhite} />
				</g>
			)}

			{/* L'arrivée : une onde de lumière unique, puis une lueur qui demeure */}
			{!poster && t >= T.journey[1] - 0.1 && t < T.pullBack[1] && (() => {
				const a = t - T.journey[1];
				const w1 = easeOut(ramp(a, 0, 2.6));
				const w2 = easeOut(ramp(a, 0.5, 3.4));
				const glow = ramp(a, 0, 0.8) * (0.55 - 0.25 * ramp(a, 1.5, 5));
				const ex = px(END_MERC), ey = py(END_MERC);
				return (
					<g>
						<circle cx={ex} cy={ey} r={22 * unit} fill={COLORS.accentGlow} fillOpacity={glow} filter="url(#glow)" />
						{w1 < 1 && <circle cx={ex} cy={ey} r={(10 + 150 * w1) * unit} fill="none" stroke={COLORS.accent} strokeOpacity={0.7 * (1 - w1)} strokeWidth={1.6 * unit} />}
						{w2 < 1 && <circle cx={ex} cy={ey} r={(10 + 90 * w2) * unit} fill="none" stroke={COLORS.offWhite} strokeOpacity={0.45 * (1 - w2)} strokeWidth={1.1 * unit} />}
					</g>
				);
			})()}

			{/* Le marcheur */}
			{walking && t >= T.journey[0] - 0.2 && t < T.journey[1] + 0.2 && (
				<g>
					<circle cx={px(head)} cy={py(head)} r={(6 + 16 * pulse) * unit} fill="none" stroke={COLORS.accent} strokeOpacity={0.5 * (1 - pulse)} strokeWidth={1.4 * unit} />
					<circle cx={px(head)} cy={py(head)} r={9 * unit} fill={COLORS.accentGlow} fillOpacity={0.35} filter="url(#softglow)" />
					<circle cx={px(head)} cy={py(head)} r={4.6 * unit} fill="#FFF7EC" />
				</g>
			)}
		</svg>
	);
};

export const WAYPOINT_MERCS = WAYPOINT_EVENTS.map((w) => w.merc);
