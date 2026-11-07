// Carte des shorts : réutilise le fond de carte, la projection et les données du documentaire.
import React, {useMemo} from 'react';
import communesPolygons from '../data/communes-polygons.json';
import departements from '../data/departements.json';
import france from '../data/france.json';
import {COLORS, FONTS} from '../config/theme';
import {COMMUNE_EVENTS, WAYPOINT_EVENTS} from '../data';
import {easeOut} from '../geo/camera';
import {type Camera, type Merc, type Viewport, toMerc} from '../geo/mercator';
import {ROUTE_MERC, ROUTE_TOTAL_KM_GPX, mercAtKm, segmentAt} from '../geo/route';
import {type MercPolygon, makeProjector, polygonPath, polylinePath, toMercPolygons} from '../map/paths';
import {TileLayer} from '../map/TileLayer';
import {MAP_BRIGHTNESS, SAFE, SHORT_TYPE} from './config';
import type {Shot} from './storyboards';
import {shotTowns} from './camera';

const TOTAL = ROUTE_TOTAL_KM_GPX;
const FRANCE = toMercPolygons(france.geometry, toMerc);
const DEPS = (departements.features as {properties: {parcours: boolean}; geometry: {type: string; coordinates: unknown}}[]).map((f) => ({parcours: f.properties.parcours, polys: toMercPolygons(f.geometry, toMerc)}));
const DEPS_ALL = DEPS.flatMap((d) => d.polys);
const DEPS_ROUTE = DEPS.filter((d) => d.parcours).flatMap((d) => d.polys);
const COMMUNE_POLYS = new Map<string, MercPolygon[]>((communesPolygons.features as {properties: {code: string}; geometry: {type: string; coordinates: unknown}}[]).map((f) => [f.properties.code, toMercPolygons(f.geometry, toMerc)]));
const TRAVERSED = COMMUNE_EVENTS.filter((c) => c.statut === 'traversee');
const START = ROUTE_MERC[0];
const END = ROUTE_MERC[ROUTE_MERC.length - 1];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

/** Communes nommées discrètement pendant un plan de marche (hors ville repère), réparties le long du plan. */
export const communesForShot = (shot: Shot, max: number) => {
	if (!shot.walk || !max) return [];
	const {from, to} = shot.walk;
	const featured = WAYPOINT_EVENTS.find((w) => w.gpxName === shot.town)?.communeCode;
	const cands = TRAVERSED.filter((c) => c.mairieKm > from + 0.3 && c.mairieKm < to - 0.3 && c.code !== featured && c.mairieDistanceTraceM < 2500);
	if (cands.length <= max) return cands;
	const out: typeof cands = [];
	for (let i = 0; i < max; i++) out.push(cands[Math.round(((i + 0.5) / max) * (cands.length - 1))]);
	return [...new Set(out)];
};

export type ShortMapProps = {shot: Shot; t: number; km: number | null; cam: Camera; vp: Viewport; unit: number; /** flou de vitesse (px) */ speedBlur?: number};

export const ShortMap: React.FC<ShortMapProps> = ({shot, t, km, cam, vp, unit, speedBlur = 0}) => {
	const P = useMemo(() => makeProjector(cam, vp), [cam, vp]);
	const local = t - shot.start;
	const px = (m: Merc) => P.x(m);
	const py = (m: Merc) => P.y(m);
	const z = cam.zoom;

	// --- tracé éclairé
	const litKm = shot.line === 'full' ? TOTAL : Math.max(0, km ?? 0);
	const lit = litKm > 0.01 ? polylinePath(ROUTE_MERC, P, {minDistPx: 0.7}, segmentAt(litKm) + 1, mercAtKm(litKm)) : '';
	const ghost = shot.ghost ? polylinePath(ROUTE_MERC, P, {minDistPx: 1.2}) : '';
	const lineW = (z < 9 ? 3.4 : 4.2) * unit;

	// --- territoires et mairies déjà traversés
	const passed = shot.line === 'comet' ? [] : TRAVERSED.filter((c) => shot.line === 'full' || (km ?? 0) >= c.entreeKm);
	const settled: MercPolygon[] = [];
	for (const c of passed) settled.push(...(COMMUNE_POLYS.get(c.code) ?? []));
	const dots = shot.line === 'comet' ? [] : TRAVERSED.filter((c) => shot.line === 'full' || (km ?? 0) >= c.mairieKm);
	const dotR = (z < 9 ? 2.0 : 3.6) * unit;

	// --- ville repère du plan
	const wp = WAYPOINT_EVENTS.find((w) => w.gpxName === shot.town);
	const wpReached = wp && km !== null && km >= wp.km;
	const wpAge = wp && shot.walk ? local - (((wp.km - shot.walk.from) / (shot.walk.to - shot.walk.from)) * (shot.end - shot.start - (shot.walk.delay ?? 0)) + (shot.walk.delay ?? 0)) : 0;

	const franceO = (shot.france ?? 0) * ramp(local, 0.3, 1.4);
	const depO = shot.departements ? ramp(local, 0.8, 2.0) : 0;
	const endpointsO = shot.endpoints ? ramp(local, shot.id === 'revelation' ? 1.0 : 0.4, shot.id === 'revelation' ? 1.8 : 1.0) : 0;
	const cometOn = shot.line === 'comet' && km !== null && km < TOTAL - 0.01 && km > 0;
	const cometDone = shot.line === 'comet' && km !== null && km >= TOTAL - 0.01;
	const pulse = (t * 0.7) % 1;

	// --- noms de communes (petits) le long du plan
	const named = communesForShot(shot, shot.communes ?? 0).filter((c) => (km ?? 0) >= c.mairieKm);
	const labelFont = SHORT_TYPE.label * 0.92 * unit;

	return (
		<>
			<div style={{position: 'absolute', inset: 0, filter: `brightness(${MAP_BRIGHTNESS}) contrast(1.06)${speedBlur > 0.05 ? ` blur(${speedBlur.toFixed(2)}px)` : ''}`}}>
				<TileLayer cam={cam} vp={vp} />
			</div>
			<svg width={vp.width} height={vp.height} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
				<defs>
					<filter id="sglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={6 * unit} /></filter>
					<filter id="sglow2" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={14 * unit} /></filter>
				</defs>
				{depO > 0 && <path d={polygonPath(DEPS_ROUTE, P, 1.2)} fill={COLORS.accent} fillOpacity={0.07 * depO} fillRule="evenodd" />}
				{depO > 0 && <path d={polygonPath(DEPS_ALL, P, 1.2)} fill="none" stroke={COLORS.offWhite} strokeOpacity={0.12 * depO} strokeWidth={0.9 * unit} strokeDasharray={`${3 * unit} ${3 * unit}`} />}
				{franceO > 0 && <path d={polygonPath(FRANCE, P, 1)} fill="none" stroke={COLORS.offWhite} strokeOpacity={0.55 * franceO} strokeWidth={1.4 * unit} strokeLinejoin="round" />}
				{settled.length > 0 && <path d={polygonPath(settled, P, 1)} fill={COLORS.offWhite} fillOpacity={0.03} stroke={COLORS.offWhite} strokeOpacity={0.09} strokeWidth={0.8 * unit} fillRule="evenodd" />}
				{ghost && shot.line === 'comet' && <path d={ghost} fill="none" stroke={COLORS.accent} strokeOpacity={0.32} strokeWidth={2.4 * unit} strokeLinecap="round" strokeLinejoin="round" />}
				{ghost && shot.line !== 'comet' && <path d={ghost} fill="none" stroke={COLORS.offWhite} strokeOpacity={shot.ghost} strokeWidth={2.2 * unit} strokeLinecap="round" strokeDasharray={`${0.1 * unit} ${5 * unit}`} />}
				{lit && (
					<>
						<path d={lit} fill="none" stroke={COLORS.accentGlow} strokeOpacity={0.35} strokeWidth={lineW * 3.2} strokeLinecap="round" strokeLinejoin="round" filter="url(#sglow)" />
						<path d={lit} fill="none" stroke={COLORS.accent} strokeWidth={lineW} strokeLinecap="round" strokeLinejoin="round" />
					</>
				)}
				{dots.map((c) => {
					const m = c.mairieMerc;
					const x = px(m), y = py(m);
					if (x < -20 || y < -20 || x > vp.width + 20 || y > vp.height + 20) return null;
					return <circle key={c.code} cx={x} cy={y} r={dotR} fill={COLORS.offWhite} fillOpacity={0.88} stroke="#0b0b0b" strokeWidth={1.2 * unit} />;
				})}
				{wp && wpReached && (
					<g>
						{wpAge < 1.2 && <circle cx={px(wp.merc)} cy={py(wp.merc)} r={(8 + 30 * easeOut(ramp(wpAge, 0, 1.2))) * unit} fill="none" stroke={COLORS.red} strokeOpacity={0.7 * (1 - ramp(wpAge, 0, 1.2))} strokeWidth={1.6 * unit} />}
						<circle cx={px(wp.merc)} cy={py(wp.merc)} r={8 * unit * easeOut(ramp(wpAge, 0, 0.3))} fill="#0b0b0b" stroke={COLORS.red} strokeWidth={2.6 * unit} />
						<circle cx={px(wp.merc)} cy={py(wp.merc)} r={3.4 * unit} fill={COLORS.offWhite} />
					</g>
				)}
				{shotTowns(shot).map((tw) => {
					const w = WAYPOINT_EVENTS.find((x) => x.gpxName === tw.name);
					if (!w || (km ?? 0) < tw.km - 1e-6) return null;
					const age = t - tw.t;
					const x = px(w.merc), y = py(w.merc);
					return (
						<g key={tw.name}>
							{age >= 0 && age < 1.2 && <circle cx={x} cy={y} r={(8 + 30 * easeOut(ramp(age, 0, 1.2))) * unit} fill="none" stroke={COLORS.red} strokeOpacity={0.7 * (1 - ramp(age, 0, 1.2))} strokeWidth={1.6 * unit} />}
							<circle cx={x} cy={y} r={8 * unit * easeOut(ramp(age, -0.35, 0))} fill="#0b0b0b" stroke={COLORS.red} strokeWidth={2.6 * unit} />
							<circle cx={x} cy={y} r={3.4 * unit} fill={COLORS.offWhite} />
						</g>
					);
				})}
				{endpointsO > 0 && (
					<g opacity={endpointsO}>
						<circle cx={px(START)} cy={py(START)} r={9 * unit} fill="none" stroke={COLORS.offWhite} strokeOpacity={0.8} strokeWidth={1.6 * unit} />
						<circle cx={px(START)} cy={py(START)} r={3.8 * unit} fill={COLORS.offWhite} />
						<circle cx={px(END)} cy={py(END)} r={9 * unit} fill="none" stroke={COLORS.red} strokeWidth={2 * unit} />
						<circle cx={px(END)} cy={py(END)} r={3.8 * unit} fill={COLORS.offWhite} />
					</g>
				)}
				{cometOn && km !== null && (
					<g>
						<circle cx={px(mercAtKm(km))} cy={py(mercAtKm(km))} r={26 * unit} fill={COLORS.accentGlow} fillOpacity={0.55} filter="url(#sglow2)" />
						<circle cx={px(mercAtKm(km))} cy={py(mercAtKm(km))} r={5.5 * unit} fill="#FFF7EC" />
					</g>
				)}
				{cometDone && local < 4 && (() => {
					// la comète touche l'arrivée : un éclat bref
					const doneAt = (shot.walk?.delay ?? 0) + (shot.walk?.dur ?? 0);
					const a = local - doneAt;
					if (a < 0) return null;
					const w = easeOut(ramp(a, 0, 1.4));
					return (
						<g>
							<circle cx={px(END)} cy={py(END)} r={20 * unit} fill={COLORS.accentGlow} fillOpacity={0.5 * (1 - ramp(a, 0.2, 1.6))} filter="url(#sglow2)" />
							{w < 1 && <circle cx={px(END)} cy={py(END)} r={(8 + 60 * w) * unit} fill="none" stroke={COLORS.accent} strokeOpacity={0.7 * (1 - w)} strokeWidth={1.8 * unit} />}
							<circle cx={px(END)} cy={py(END)} r={4.5 * unit} fill="#FFF7EC" />
						</g>
					);
				})()}
				{shot.walker && km !== null && (
					<g>
						<circle cx={px(mercAtKm(km))} cy={py(mercAtKm(km))} r={(7 + 18 * pulse) * unit} fill="none" stroke={COLORS.accent} strokeOpacity={0.5 * (1 - pulse)} strokeWidth={1.6 * unit} />
						<circle cx={px(mercAtKm(km))} cy={py(mercAtKm(km))} r={11 * unit} fill={COLORS.accentGlow} fillOpacity={0.4} filter="url(#sglow)" />
						<circle cx={px(mercAtKm(km))} cy={py(mercAtKm(km))} r={5.6 * unit} fill="#FFF7EC" />
					</g>
				)}
				{shot.arrival && (() => {
					const a = local;
					const w1 = easeOut(ramp(a, 0, 2.4));
					const w2 = easeOut(ramp(a, 0.45, 3.0));
					return (
						<g>
							<circle cx={px(END)} cy={py(END)} r={26 * unit} fill={COLORS.accentGlow} fillOpacity={0.55 - 0.25 * ramp(a, 1.2, 4)} filter="url(#sglow2)" />
							{w1 < 1 && <circle cx={px(END)} cy={py(END)} r={(10 + 190 * w1) * unit} fill="none" stroke={COLORS.accent} strokeOpacity={0.75 * (1 - w1)} strokeWidth={2 * unit} />}
							{w2 < 1 && <circle cx={px(END)} cy={py(END)} r={(10 + 110 * w2) * unit} fill="none" stroke={COLORS.offWhite} strokeOpacity={0.5 * (1 - w2)} strokeWidth={1.3 * unit} />}
							<circle cx={px(END)} cy={py(END)} r={9 * unit} fill="none" stroke={COLORS.red} strokeWidth={2.2 * unit} />
							<circle cx={px(END)} cy={py(END)} r={4.6 * unit} fill="#FFF7EC" />
						</g>
					);
				})()}
			</svg>

			{/* Libellés : départ / arrivée, communes */}
			<div style={{position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: FONTS.text, color: COLORS.offWhite}}>
				{endpointsO > 0 &&
					[
						{m: START, name: 'Noaillan'},
						{m: END, name: 'Cossé-le-Vivien'},
					].map(({m, name}) => (
						<EdgeLabel key={name} x={px(m)} y={py(m)} name={name} font={labelFont} weight={500} opacity={endpointsO} vpWidth={vp.width} unit={unit} />
					))}
				{named.map((c) => {
					const age = (km ?? 0) >= c.mairieKm ? 1 : 0;
					if (!age) return null;
					const mx = px(c.mairieMerc), my = py(c.mairieMerc);
					if (mx < SAFE.left * unit || mx > vp.width - SAFE.right * unit || my < 0 || my > vp.height - SAFE.bottom * unit) return null;
					return <EdgeLabel key={c.code} x={px(c.mairieMerc)} y={py(c.mairieMerc)} name={c.nom} font={labelFont * 0.86} weight={400} opacity={0.9} vpWidth={vp.width} unit={unit} preferRight={c.labelSide === 1} />;
				})}
			</div>
			{shot.dim ? <div style={{position: 'absolute', inset: 0, backgroundColor: '#050505', opacity: shot.dim * ramp(local, 0, 0.8)}} /> : null}
		</>
	);
};

/** Libellé ancré à un point, qui bascule de côté plutôt que de sortir de la zone sûre. */
const EdgeLabel: React.FC<{x: number; y: number; name: string; font: number; weight: number; opacity: number; vpWidth: number; unit: number; preferRight?: boolean}> = ({x, y, name, font, weight, opacity, vpWidth, unit, preferRight}) => {
	const w = name.length * font * 0.55;
	const gap = 18 * unit;
	let right = preferRight ?? false;
	if (right && x + gap + w > vpWidth - SAFE.right * unit) right = false;
	if (!right && x - gap - w < SAFE.left * unit) right = true;
	return (
		<div style={{position: 'absolute', left: x, top: y, opacity, translate: right ? `${gap}px -50%` : `calc(-100% - ${gap}px) -50%`, fontSize: font, fontWeight: weight, whiteSpace: 'nowrap', textShadow: '0 0 12px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)', letterSpacing: '0.01em'}}>
			{name}
		</div>
	);
};
