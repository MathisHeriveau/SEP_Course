// Persistent journey information: département, km counter, communes counter, mini-map of France.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import france from '../data/france.json';
import {COLORS, FONTS, TYPE} from '../config/theme';
import {TIMELINE} from '../config/film';
import {COMMUNE_EVENTS, DISPLAY_TOTAL_KM, departementAtKm, displayKm, fmtKm} from '../data';
import {journeyKm} from '../geo/camera';
import {fitBounds, toMerc} from '../geo/mercator';
import {ROUTE_MERC, ROUTE_TOTAL_KM_GPX, mercAtKm, segmentAt} from '../geo/route';
import {makeProjector, polygonPath, polylinePath, toMercPolygons} from '../map/paths';
import {envelope, ramp, useLayout} from './layout';

const FRANCE = toMercPolygons(france.geometry, toMerc);
const FRANCE_BOUNDS = (() => {
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (const p of FRANCE) for (const m of p.rings[0]) {
		x0 = Math.min(x0, m.x); x1 = Math.max(x1, m.x); y0 = Math.min(y0, m.y); y1 = Math.max(y1, m.y);
	}
	return {x0, y0, x1, y1};
})();

const MiniMap: React.FC<{size: number; km: number; unit: number}> = ({size, km, unit}) => {
	const vp = {width: size, height: size};
	const cam = fitBounds(FRANCE_BOUNDS, vp, {top: 0.04, bottom: 0.04, left: 0.04, right: 0.04});
	const P = makeProjector(cam, vp);
	const head = mercAtKm(km);
	return (
		<svg width={size} height={size} style={{overflow: 'visible'}}>
			<path d={polygonPath(FRANCE, P, 0.8)} fill="rgba(238,233,225,0.035)" stroke={COLORS.offWhite} strokeOpacity={0.4} strokeWidth={1 * unit} strokeLinejoin="round" />
			<path d={polylinePath(ROUTE_MERC, P, {minDistPx: 0.6})} fill="none" stroke={COLORS.offWhite} strokeOpacity={0.25} strokeWidth={1.4 * unit} strokeLinecap="round" />
			{km > 0.01 && <path d={polylinePath(ROUTE_MERC, P, {minDistPx: 0.6}, segmentAt(km) + 1, head)} fill="none" stroke={COLORS.accent} strokeWidth={2 * unit} strokeLinecap="round" />}
			<circle cx={P.x(head)} cy={P.y(head)} r={3.2 * unit} fill="#FFF7EC" />
		</svg>
	);
};

export const Hud: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, unit, safe, portrait} = useLayout();
	const t = frame / fps;
	const T = TIMELINE;
	const visible = envelope(t, [T.journey[0] - 0.4, T.arrivalCard[0] + 1.6], 1.4, 1.3);
	if (visible <= 0) return null;
	const km = journeyKm(t);
	const shown = t >= T.journey[1] ? DISPLAY_TOTAL_KM : displayKm(km);
	const communes = COMMUNE_EVENTS.filter((c) => c.statut === 'traversee' && km >= c.entreeKm).length;
	const dep = departementAtKm(km);
	const depChange = ramp(t, dep.t, dep.t + 0.9);

	const smallCaps: React.CSSProperties = {fontFamily: FONTS.text, fontSize: TYPE.hud * unit, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 500};
	const miniSize = (portrait ? 200 : 210) * unit;

	return (
		<div style={{position: 'absolute', inset: 0, opacity: visible}}>
			{/* Département courant */}
			<div style={{position: 'absolute', left: safe.left, top: safe.top, display: 'flex', alignItems: 'center', gap: 14 * unit}}>
				<div style={{width: 28 * unit, height: 1.5 * unit, backgroundColor: COLORS.accent}} />
				<div style={{...smallCaps, color: COLORS.offWhite, opacity: depChange, translate: `0 ${(1 - depChange) * 6 * unit}px`, textShadow: '0 0 12px rgba(0,0,0,0.9)'}}>
					{dep.nom}
					<span style={{color: COLORS.offWhiteFaint, marginLeft: 12 * unit}}>{dep.code}</span>
				</div>
			</div>

			{/* Mini-carte */}
			<div style={{position: 'absolute', right: safe.right, top: safe.top - 8 * unit, width: miniSize, height: miniSize}}>
				<MiniMap size={miniSize} km={km} unit={unit} />
			</div>

			{/* Compteur (en bas en 16:9 ; en haut en 9:16, à l'écart de la traîne du parcours) */}
			<div style={{position: 'absolute', left: safe.left, ...(portrait ? {top: safe.top + 52 * unit} : {bottom: safe.bottom}), textShadow: '0 0 18px rgba(0,0,0,0.85)'}}>
				<div style={{fontFamily: FONTS.title, fontWeight: 250, fontSize: TYPE.counter * unit, color: COLORS.offWhite, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.01em'}}>
					{fmtKm(shown)}
					<span style={{fontSize: TYPE.counter * 0.42 * unit, fontWeight: 400, marginLeft: 10 * unit, color: COLORS.offWhiteDim, letterSpacing: '0.04em'}}>km</span>
				</div>
				<div style={{...smallCaps, fontSize: (TYPE.hud - 2) * unit, color: COLORS.offWhiteDim, marginTop: 14 * unit, letterSpacing: '0.18em'}}>
					sur {fmtKm(DISPLAY_TOTAL_KM)}&#8239;km
					<span style={{margin: `0 ${10 * unit}px`, color: COLORS.offWhiteFaint}}>·</span>
					<span style={{fontVariantNumeric: 'tabular-nums'}}>{communes}</span> {communes > 1 ? 'communes traversées' : 'commune traversée'}
				</div>
				<div style={{marginTop: 14 * unit, width: (portrait ? 420 : 380) * unit, height: 2 * unit, backgroundColor: 'rgba(238,233,225,0.14)'}}>
					<div style={{width: `${(km / ROUTE_TOTAL_KM_GPX) * 100}%`, height: '100%', backgroundColor: COLORS.accent}} />
				</div>
			</div>
		</div>
	);
};
