// Compteur kilométrique et carton de ville repère (positions fixes, une seule marge gauche).
import React from 'react';
import {COLORS, FONTS} from '../config/theme';
import {DISPLAY_TOTAL_KM, WAYPOINT_EVENTS, displayKm, fmtKm} from '../data';
import {easeOut} from '../geo/camera';
import {ROUTE_TOTAL_KM_GPX} from '../geo/route';
import {SAFE, SHORT_TYPE, UPPER_RIGHT, UPPER_ZONE_END} from './config';
import {shotTowns} from './camera';
import type {Shot, ShortSpec} from './storyboards';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
const TOTAL = ROUTE_TOTAL_KM_GPX;

/** Coupe à la main un nom trop long à un trait d'union proche du milieu (le trait d'union reste en fin de ligne). */
export const breakName = (name: string, font: number, maxWidth: number) => {
	if (name.length * font * 0.52 <= maxWidth) return [name];
	const idx = [...name].map((c, i) => (c === '-' ? i : -1)).filter((i) => i > 0);
	if (!idx.length) return [name];
	const mid = name.length / 2;
	const cut = idx.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
	return [name.slice(0, cut + 1), name.slice(cut + 1)];
};

export const TOWN_Y = 520;

export const ShortHud: React.FC<{spec: ShortSpec; shot: Shot; t: number; km: number | null; unit: number; fade?: number; only?: 'town'}> = ({spec, shot, t, km, unit, fade = 1, only}) => {
	// Le compteur apparaît au premier plan qui l'utilise, puis reste stable d'un plan à l'autre (coupes franches).
	const first = spec.shots.find((s) => s.counter);
	const flyDur = !first ? 0 : first.camera.type === 'fly' ? first.camera.dur : first.camera.type === 'journey' && first.camera.fly ? first.camera.fly.dur : 0;
	const counterIn = only ? 0 : shot.counter && first ? fade * ramp(t, first.start + (flyDur ? flyDur - 0.5 : 0), first.start + (flyDur || 0.5)) : 0;
	const arrived = km !== null && km >= TOTAL - 1e-3;
	const value = arrived ? DISPLAY_TOTAL_KM : displayKm(km ?? 0);

	// Carton de ville repère / départ / arrivée
	let town: {kicker: string; name: string; sub: string; at: number; color: string; until?: number} | null = null;
	if (shot.town === 'depart') {
		const at = shot.start + (shot.camera.type === 'fly' ? shot.camera.dur - 0.25 : 0.3);
		town = {kicker: 'Départ', name: 'Noaillan', sub: 'Gironde', at, color: COLORS.accent};
	} else if (shot.town === 'arrivee') {
		town = {kicker: 'Arrivée', name: 'Cossé-le-Vivien', sub: 'Mayenne', at: shot.start + 0.15, color: COLORS.red};
	} else if (shot.journey) {
		const towns = shotTowns(shot);
		for (let i = 0; i < towns.length; i++) {
			const tw = towns[i];
			const until = Math.min(tw.t + 1.7, (towns[i + 1]?.t ?? Infinity) - 0.5);
			if (t >= tw.t - 0.35 && t < until) {
				const w = WAYPOINT_EVENTS.find((x) => x.gpxName === tw.name);
				if (w) town = {kicker: w.commune?.departementNom ?? '', name: w.communeNom, sub: '', at: tw.t - 0.35, color: COLORS.red, until};
			}
		}
	} else if (shot.town && shot.walk) {
		const w = WAYPOINT_EVENTS.find((x) => x.gpxName === shot.town);
		if (w) {
			const dur = shot.end - shot.start - (shot.walk.delay ?? 0);
			const at = shot.start + (shot.walk.delay ?? 0) + ((w.km - shot.walk.from) / (shot.walk.to - shot.walk.from)) * dur;
			town = {kicker: w.commune?.departementNom ?? '', name: w.communeNom, sub: '', at, color: COLORS.red};
		}
	}
	const tk = town ? fade * easeOut(ramp(t, town.at, town.at + 0.35)) * (town.until !== undefined ? 1 - ramp(t, town.until - 0.25, town.until) : 1) : 0;

	return (
		<>
			{counterIn > 0 && (
				<div style={{position: 'absolute', left: SAFE.left * unit, top: SAFE.top * unit, opacity: counterIn, textShadow: '0 0 18px rgba(0,0,0,0.9)'}}>
					<div style={{fontFamily: FONTS.title, fontWeight: 250, fontSize: SHORT_TYPE.figure * unit, lineHeight: 1, color: arrived ? COLORS.accent : COLORS.offWhite, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em'}}>
						{fmtKm(value)}
						<span style={{fontFamily: FONTS.text, fontSize: SHORT_TYPE.label * unit, fontWeight: 500, color: COLORS.offWhiteDim, marginLeft: 14 * unit, letterSpacing: '0.04em'}}>km</span>
					</div>
					<div style={{marginTop: 16 * unit, width: 330 * unit, height: 3 * unit, backgroundColor: 'rgba(238,233,225,0.16)'}}>
						<div style={{width: `${((km ?? 0) / TOTAL) * 100}%`, height: '100%', backgroundColor: COLORS.accent}} />
					</div>
					<div style={{fontFamily: FONTS.text, fontSize: SHORT_TYPE.note * unit, color: COLORS.offWhiteDim, marginTop: 12 * unit, letterSpacing: '0.12em', textTransform: 'uppercase'}}>sur {fmtKm(DISPLAY_TOTAL_KM)}&#8239;km</div>
				</div>
			)}
			{town && tk > 0 && (
				<div style={{position: 'absolute', left: SAFE.left * unit, top: TOWN_Y * unit, opacity: tk, filter: `blur(${(1 - tk) * 6 * unit}px)`, textShadow: '0 0 22px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.7)'}}>
					<div style={{display: 'flex', alignItems: 'center', gap: 16 * unit, fontFamily: FONTS.text, fontWeight: 600, fontSize: SHORT_TYPE.note * unit, letterSpacing: '0.3em', textTransform: 'uppercase', color: town.color}}>
						<div style={{width: 38 * unit, height: 2 * unit, backgroundColor: town.color}} />
						{town.kicker}
					</div>
					<div style={{fontFamily: FONTS.title, fontWeight: 400, fontSize: SHORT_TYPE.title * 1.06 * unit, color: COLORS.offWhite, marginTop: 14 * unit, lineHeight: 1.05, letterSpacing: '-0.015em', maxWidth: (1080 - SAFE.left - SAFE.right) * unit}}>
						{breakName(town.name, SHORT_TYPE.title * 1.06, 1080 - SAFE.left - (TOWN_Y < UPPER_ZONE_END ? UPPER_RIGHT : SAFE.right)).map((part) => (
							<div key={part}>{part}</div>
						))}
					</div>
					{town.sub && <div style={{fontFamily: FONTS.text, fontSize: SHORT_TYPE.label * unit, color: COLORS.offWhiteDim, marginTop: 8 * unit}}>{town.sub}</div>}
				</div>
			)}
		</>
	);
};
