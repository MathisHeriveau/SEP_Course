// Affiche haute définition : le parcours complet, toutes les communes traversées et leurs mairies.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COLORS, FONTS} from './config/theme';
import {INSTAGRAM_HANDLE, TEXTS} from './config/film';
import {POSTER} from './config/poster';
import {COMMUNE_EVENTS, DEPARTEMENT_COUNT, DISPLAY_TOTAL_KM, TRAVERSED_COUNT, displayKm, fmtKm} from './data';
import {posterCamera} from './geo/poster-camera';
import {GeoOverlay} from './map/GeoOverlay';
import {makeProjector} from './map/paths';
import {TileLayer} from './map/TileLayer';
import {useLayout} from './components/layout';
import {OPENFREEMAP_VERSION_LABEL} from './config/credits';

type Placed = {code: string; nom: string; km: number; mx: number; my: number; side: 1 | -1; ly: number; waypoint: boolean};

/** Greedy vertical relaxation of labels on each side so that none overlap. */
const layoutLabels = (items: Omit<Placed, 'ly'>[], minGap: number): Placed[] => {
	const out: Placed[] = [];
	for (const side of [1, -1] as const) {
		const list = items.filter((i) => i.side === side).sort((a, b) => a.my - b.my).map((i) => ({...i, ly: i.my}));
		// iterate: push down overlapping labels, then pull clusters back up around their mean
		for (let pass = 0; pass < 60; pass++) {
			let moved = false;
			for (let i = 1; i < list.length; i++) {
				const d = list[i].ly - list[i - 1].ly;
				if (d < minGap) {
					const push = (minGap - d) / 2;
					list[i].ly += push;
					list[i - 1].ly -= push;
					moved = true;
				}
			}
			if (!moved) break;
		}
		out.push(...list);
	}
	return out;
};

export const Poster: React.FC = () => {
	const {vp, unit, width, height} = useLayout();
	const cam = posterCamera(vp);
	const P = makeProjector(cam, vp);
	const u = unit; // 3600×4800 → unit = 3.33
	const font = 10.5 * u;
	const items = COMMUNE_EVENTS.filter((c) => c.statut === 'traversee').map((c) => ({
		code: c.code,
		nom: c.nom,
		km: c.mairieKm,
		mx: P.x(c.mairieMerc),
		my: P.y(c.mairieMerc),
		side: (c.labelSide ?? 1) as 1 | -1,
		waypoint: c.isWaypoint,
	}));
	const placed = layoutLabels(items, font * 1.32);
	const gap = 16 * u;

	return (
		<AbsoluteFill style={{backgroundColor: '#0b0b0b'}}>
			<TileLayer cam={cam} vp={vp} detailBoost={POSTER.detailBoost} />
			<GeoOverlay cam={cam} vp={vp} t={0} km={0} unit={u * 0.75} mode="poster" />
			<svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
				{placed.map((p) => {
					const lx = p.mx + p.side * gap;
					return Math.abs(p.ly - p.my) > 2 ? <polyline key={p.code} points={`${p.mx + p.side * 4 * u},${p.my} ${lx - p.side * 4 * u},${p.ly}`} fill="none" stroke={COLORS.offWhite} strokeOpacity={0.3} strokeWidth={0.6 * u} /> : null;
				})}
			</svg>
			{placed.map((p) => (
				<div
					key={p.code}
					style={{
						position: 'absolute',
						left: p.mx + p.side * gap,
						top: p.ly,
						translate: p.side === 1 ? '0 -50%' : '-100% -50%',
						whiteSpace: 'nowrap',
						fontFamily: FONTS.text,
						fontSize: p.waypoint ? font * 1.25 : font,
						fontWeight: p.waypoint ? 600 : 400,
						color: p.waypoint ? COLORS.offWhite : 'rgba(238,233,225,0.86)',
						textShadow: '0 0 6px rgba(0,0,0,1), 0 0 2px rgba(0,0,0,1)',
					}}
				>
					{p.nom}
					<span style={{fontSize: font * 0.7, color: COLORS.offWhiteFaint, marginLeft: 6 * u, fontWeight: 400}}>{fmtKm(displayKm(p.km))}</span>
				</div>
			))}

			{/* Voile de lisibilité derrière le bloc titre */}
			<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.5, background: 'linear-gradient(to right, rgba(8,8,8,0.88) 0%, rgba(8,8,8,0.7) 55%, rgba(8,8,8,0) 100%)'}} />

			{/* Bloc titre */}
			<div style={{position: 'absolute', left: 150 * u * 0.6, top: 150 * u * 0.6, width: width * 0.36, color: COLORS.offWhite}}>
				<div style={{fontFamily: FONTS.text, fontWeight: 600, fontSize: 9 * u, letterSpacing: '0.34em', textTransform: 'uppercase', color: COLORS.accent}}>De Noaillan à Cossé-le-Vivien</div>
				<div style={{fontFamily: FONTS.title, fontWeight: 300, fontSize: 40 * u, lineHeight: 1.04, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 18 * u}}>{TEXTS.title}</div>
				<div style={{fontFamily: FONTS.text, fontWeight: 400, fontSize: 13 * u, letterSpacing: '0.26em', textTransform: 'uppercase', color: COLORS.offWhiteDim, marginTop: 14 * u}}>{TEXTS.subtitle}</div>
				<div style={{width: 60 * u, height: 1 * u, backgroundColor: COLORS.accent, margin: `${26 * u}px 0`}} />
				{[
					[fmtKm(DISPLAY_TOTAL_KM), 'kilomètres'],
					[String(TRAVERSED_COUNT), 'communes traversées'],
					[String(DEPARTEMENT_COUNT), 'départements'],
				].map(([v, l]) => (
					<div key={l} style={{display: 'flex', alignItems: 'baseline', gap: 10 * u, marginBottom: 6 * u}}>
						<span style={{fontFamily: FONTS.title, fontWeight: 250, fontSize: 30 * u, minWidth: 66 * u, textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{v}</span>
						<span style={{fontFamily: FONTS.text, fontSize: 8.5 * u, letterSpacing: '0.24em', textTransform: 'uppercase', color: COLORS.offWhiteDim}}>{l}</span>
					</div>
				))}
				<div style={{fontFamily: FONTS.text, fontSize: 7.5 * u, color: COLORS.offWhiteDim, marginTop: 30 * u, lineHeight: 1.7, letterSpacing: '0.02em'}}>
					<Legend u={u} />
				</div>
				<div style={{fontFamily: FONTS.text, fontSize: 11 * u, color: COLORS.offWhiteDim, marginTop: 24 * u, letterSpacing: '0.04em'}}>{INSTAGRAM_HANDLE}</div>
			</div>

			{/* Sources */}
			<div style={{position: 'absolute', left: 90 * u, bottom: 60 * u, width: width * 0.4, fontFamily: FONTS.text, fontSize: 5.6 * u, lineHeight: 1.6, color: COLORS.offWhiteFaint}}>
				Tracé : GPX « Tracé détaillé Noaillan Cossé » (21 034 points). Limites communales : IGN ADMIN EXPRESS (Etalab, 2026).
				Mairies : IGN, recoupées avec OpenStreetMap, la BAN et l’Annuaire de l’administration. Fond : {OPENFREEMAP_VERSION_LABEL} ;
				estompage IGN (BD ALTI 25&nbsp;m). Km : distance de communication, proportionnelle au tracé GPX.
			</div>
		</AbsoluteFill>
	);
};

const Legend: React.FC<{u: number}> = ({u}) => (
	<div style={{display: 'grid', gridTemplateColumns: `${24 * u}px 1fr`, rowGap: 6 * u, alignItems: 'center'}}>
		<svg width={20 * u} height={6 * u}><line x1={0} y1={3 * u} x2={20 * u} y2={3 * u} stroke={COLORS.accent} strokeWidth={2 * u} strokeLinecap="round" /></svg>
		<span>Parcours (GPX)</span>
		<svg width={20 * u} height={10 * u}><circle cx={10 * u} cy={5 * u} r={2.6 * u} fill={COLORS.offWhite} stroke="#000" strokeWidth={0.8 * u} /></svg>
		<span>Mairie d’une commune traversée</span>
		<svg width={20 * u} height={10 * u}><circle cx={10 * u} cy={5 * u} r={3.4 * u} fill="#0b0b0b" stroke={COLORS.red} strokeWidth={1.2 * u} /><circle cx={10 * u} cy={5 * u} r={1.4 * u} fill={COLORS.offWhite} /></svg>
		<span>Ville repère du tracé</span>
		<svg width={20 * u} height={10 * u}><rect x={2 * u} y={1 * u} width={16 * u} height={8 * u} fill={COLORS.offWhite} fillOpacity={0.08} stroke={COLORS.offWhite} strokeOpacity={0.35} strokeWidth={0.6 * u} /></svg>
		<span>Territoire communal traversé</span>
	</div>
);
