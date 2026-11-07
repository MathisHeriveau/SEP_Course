// HTML labels anchored to geographic positions (crisp typography, French text).
import React from 'react';
import {COLORS, FONTS, TYPE} from '../config/theme';
import {TIMELINE} from '../config/film';
import {COMMUNE_EVENTS, CONTEXT_CITIES, displayKm, fmtKm} from '../data';
import {easeOut, formatOf} from '../geo/camera';
import {labelPlacements} from '../data/labels';
import {type Camera, type Merc, type Viewport, toMerc} from '../geo/mercator';
import {contextOpacity, END_MERC, START_MERC} from './GeoOverlay';
import {makeProjector} from './paths';

const CONTEXT = CONTEXT_CITIES.map((c) => ({...c, merc: toMerc(c.lonlat)}));
const OCEAN = toMerc([-4.6, 45.75]);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

const shadow = '0 0 10px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';

const Anchored: React.FC<{x: number; y: number; side: 1 | -1; gap: number; opacity: number; dy?: number; children: React.ReactNode}> = ({x, y, side, gap, opacity, dy = 0, children}) => (
	<div
		style={{
			position: 'absolute',
			left: x,
			top: y,
			opacity,
			translate: side === 1 ? `${gap}px calc(-50% + ${dy}px)` : `calc(-100% - ${gap}px) calc(-50% + ${dy}px)`,
			textAlign: side === 1 ? 'left' : 'right',
			whiteSpace: 'nowrap',
			textShadow: shadow,
		}}
	>
		{children}
	</div>
);

export const MapLabels: React.FC<{cam: Camera; vp: Viewport; t: number; unit: number}> = ({cam, vp, t, unit}) => {
	const P = makeProjector(cam, vp);
	const T = TIMELINE;
	const z = cam.zoom;
	const pos = (m: Merc) => ({x: P.x(m), y: P.y(m)});

	const overviewIn = ramp(t, T.overview[0] + 0.6, T.overview[0] + 2.2);
	const oceanOpacity = overviewIn * (1 - ramp(z, 7.2, 8.2)) * 0.5;
	const startLabel = ramp(t, T.overview[0] + 1.8, T.overview[0] + 2.8) * (1 - ramp(t, T.flyToStart[0], T.flyToStart[0] + 1));
	const endLabel = ramp(t, T.overview[0] + 2.6, T.overview[0] + 3.6) * (1 - ramp(t, T.flyToStart[0], T.flyToStart[0] + 1));

	// Les villes de contexte s'effacent quand le bilan et le générique occupent l'écran
	const contextGlobal = overviewIn * (1 - ramp(t, T.statsCard[0] - 0.8, T.statsCard[0] + 0.4));
	const edgeFade = (x: number, y: number, w: number) => ramp(x, 20 * unit, 60 * unit) * ramp(vp.width - (x + w), 20 * unit, 60 * unit) * ramp(y, 30 * unit, 70 * unit) * ramp(vp.height - y, 30 * unit, 70 * unit);
	const placements = labelPlacements(formatOf(vp));

	const smallCaps: React.CSSProperties = {fontFamily: FONTS.text, fontSize: 13 * unit, letterSpacing: '0.2em', textTransform: 'uppercase', color: COLORS.context, fontWeight: 500};

	return (
		<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
			{/* Océan */}
			{oceanOpacity > 0.01 && (
				<div style={{position: 'absolute', left: Math.max(pos(OCEAN).x, 190 * unit), top: pos(OCEAN).y, translate: '-50% -50%', opacity: oceanOpacity, fontFamily: FONTS.text, fontStyle: 'italic', fontWeight: 300, fontSize: 17 * unit, letterSpacing: '0.42em', color: COLORS.offWhite, textAlign: 'center', lineHeight: 1.6, textTransform: 'uppercase'}}>
					Océan
					<br />
					Atlantique
				</div>
			)}

			{/* Villes de contexte */}
			{CONTEXT.map((c) => {
				const p = pos(c.merc);
				const o = contextOpacity(c.tier, z) * contextGlobal * edgeFade(p.x, p.y, (c.nom.length * 13 * 0.62 + 30) * unit);
				if (o <= 0.01) return null;
				return (
					<Anchored key={c.code} x={p.x} y={p.y} side={1} gap={8 * unit} opacity={o}>
						<span style={smallCaps}>{c.nom}</span>
					</Anchored>
				);
			})}

			{/* Départ & arrivée sur la vue France */}
			{startLabel > 0.01 && (
				<Anchored x={pos(START_MERC).x} y={pos(START_MERC).y} side={-1} gap={18 * unit} opacity={startLabel}>
					<span style={{fontFamily: FONTS.text, fontSize: 22 * unit, fontWeight: 500, color: COLORS.offWhite}}>Noaillan</span>
				</Anchored>
			)}
			{endLabel > 0.01 && (
				<Anchored x={pos(END_MERC).x} y={pos(END_MERC).y} side={-1} gap={18 * unit} opacity={endLabel}>
					<span style={{fontFamily: FONTS.text, fontSize: 22 * unit, fontWeight: 500, color: COLORS.offWhite}}>Cossé-le-Vivien</span>
				</Anchored>
			)}

			{/* Communes traversées — le nom apparaît au passage, puis s'efface */}
			{COMMUNE_EVENTS.map((c) => {
				const age = t - c.tMairie;
				if (age < 0 || age > 4.2) return null;
				if (c.isWaypoint) return null; // les villes repères ont leur propre carton
				if (t > T.journey[1] - 1.5) return null; // l'arrivée a son propre carton
				const o = easeOut(ramp(age, 0.05, 0.45)) * (1 - ramp(age, 3.3, 4.2));
				const p = pos(c.mairieMerc);
				if (p.x < -200 || p.x > vp.width + 200 || p.y < -60 || p.y > vp.height + 60) return null;
				const pl0 = placements.get(c.code) ?? {side: c.labelSide, dy: 0, hidden: false};
				if (pl0.hidden) return null;
				// un nom qui sortirait du cadre bascule de l'autre côté de son marqueur
				const w = (c.nom.length * TYPE.label * 0.56 + 13) * unit;
				const margin = 24 * unit;
				const side: 1 | -1 = pl0.side === -1 && p.x - w < margin ? 1 : pl0.side === 1 && p.x + w > vp.width - margin ? -1 : pl0.side;
				const pl = {...pl0, side};
				const slide = (1 - easeOut(ramp(age, 0.05, 0.6))) * 8 * unit * pl.side;
				return (
					<Anchored key={c.code} x={p.x + slide} y={p.y} side={pl.side} dy={pl.dy * unit} gap={13 * unit} opacity={o}>
						<div style={{fontFamily: FONTS.text, fontSize: TYPE.label * unit, fontWeight: 500, color: COLORS.offWhite, letterSpacing: '0.01em', lineHeight: 1.15}}>{c.nom}</div>
						<div style={{fontFamily: FONTS.text, fontSize: TYPE.labelSmall * unit, fontWeight: 400, color: COLORS.offWhiteDim, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.06em', marginTop: 2 * unit}}>
							km {fmtKm(displayKm(c.mairieKm))}
						</div>
					</Anchored>
				);
			})}
		</div>
	);
};

