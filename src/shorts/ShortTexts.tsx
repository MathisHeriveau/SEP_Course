// Textes des shorts : entrées variées (mot à mot, flou, atterrissage), un mot mis en valeur au plus par ligne.
import React from 'react';
import {COLORS, FONTS} from '../config/theme';
import {DISPLAY_TOTAL_KM, displayKm, fmtKm} from '../data';
import {easeOut} from '../geo/camera';
import {ROUTE_TOTAL_KM_GPX} from '../geo/route';
import {SAFE, SHORT_TYPE, UPPER_RIGHT, UPPER_ZONE_END} from './config';
import type {TextCue, TextLine} from './storyboards';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
const FRAME = 1 / 30;

const toneColor = (tone?: TextLine['tone']) => (tone === 'accent' ? COLORS.accent : tone === 'dim' ? COLORS.offWhiteDim : COLORS.offWhite);

/** « Pour la **SEP**. » → segments, le mot entre ** prend la couleur d'accent. */
const segments = (s: string) => s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => (p.startsWith('**') ? {text: p.slice(2, -2), accent: true} : {text: p, accent: false}));

const lineStyle = (l: TextLine, unit: number): React.CSSProperties => {
	const base: React.CSSProperties = {color: toneColor(l.tone), whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'};
	switch (l.size) {
		case 'display':
			return {...base, fontFamily: FONTS.title, fontWeight: l.weight ?? 300, fontSize: SHORT_TYPE.display * unit, lineHeight: 0.92, letterSpacing: '-0.035em', margin: `${8 * unit}px 0 ${4 * unit}px -${6 * unit}px`};
		case 'figure':
			return {...base, fontFamily: FONTS.title, fontWeight: l.weight ?? 250, fontSize: SHORT_TYPE.figure * unit, lineHeight: 1.0, letterSpacing: '-0.02em'};
		case 'title':
			return {...base, fontFamily: FONTS.text, fontWeight: l.weight ?? 400, fontSize: SHORT_TYPE.title * unit, lineHeight: 1.14, letterSpacing: '-0.012em'};
		case 'label':
			return {...base, fontFamily: FONTS.text, fontWeight: l.weight ?? 400, fontSize: SHORT_TYPE.label * unit, lineHeight: 1.5, letterSpacing: l.upper ? '0.22em' : '0.02em', textTransform: l.upper ? 'uppercase' : 'none'};
		default:
			return {...base, fontFamily: FONTS.text, fontSize: SHORT_TYPE.note * unit, lineHeight: 1.4};
	}
};

const Line: React.FC<{l: TextLine; cue: TextCue; t: number; unit: number; km: number | null}> = ({l, cue, t, unit, km}) => {
	// Le tout premier texte du film est déjà lisible à l'image 0 (accroche).
	const start = cue.start - (cue.start === 0 ? 0.35 : 0) + (l.delay ?? 0);
	const exit = 1 - ramp(t, cue.end - 0.22, cue.end);
	let text = l.t;
	if (l.live) {
		const v = km === null ? 0 : km >= ROUTE_TOTAL_KM_GPX - 1e-3 ? DISPLAY_TOTAL_KM : displayKm(km);
		text = text.replace('{km}', fmtKm(v));
	}
	const style = lineStyle(l, unit);
	const segs = segments(text);
	const enter = cue.enter ?? 'blur';

	const suffix = l.suffix ? (
		<span style={{fontFamily: FONTS.text, fontSize: SHORT_TYPE.label * unit, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: COLORS.offWhiteDim, marginLeft: 22 * unit, verticalAlign: '0.35em'}}>{l.suffix}</span>
	) : null;

	if (enter === 'words' && l.size !== 'display') {
		// mot à mot : flou 6 px → net, 2 images d'écart, sans déplacement
		let i = 0;
		return (
			<div style={style}>
				{segs.map((s, si) => (
					<span key={si} style={{color: s.accent ? COLORS.accent : undefined}}>
						{s.text.split(/(\s+)/).map((w, wi) => {
							if (/^\s+$/.test(w)) return w;
							const k = ramp(t, start + i * 2 * FRAME, start + i * 2 * FRAME + 5 * FRAME);
							i++;
							return (
								<span key={wi} style={{opacity: k * exit, filter: `blur(${(1 - k) * 6 * unit + (1 - exit) * 6 * unit}px)`}}>
									{w}
								</span>
							);
						})}
					</span>
				))}
				{suffix}
			</div>
		);
	}
	if (enter === 'land' || l.size === 'display') {
		// atterrissage : léger dézoom 1,05 → 1, flou → net ; posé, le chiffre ne bouge plus
		const k = easeOut(ramp(t, start, start + 0.38));
		return (
			<div style={{...style, opacity: Math.min(1, k * 1.4) * exit, scale: `${1.05 - 0.05 * k}`, transformOrigin: 'left center', filter: `blur(${(1 - k) * 8 * unit + (1 - exit) * 6 * unit}px)`}}>
				{segs.map((s, si) => <span key={si} style={{color: s.accent ? COLORS.accent : undefined}}>{s.text}</span>)}
				{suffix}
			</div>
		);
	}
	// flou de ligne entière
	const k = easeOut(ramp(t, start, start + 0.3));
	return (
		<div style={{...style, opacity: k * exit, filter: `blur(${(1 - k) * 8 * unit + (1 - exit) * 6 * unit}px)`}}>
			{segs.map((s, si) => <span key={si} style={{color: s.accent ? COLORS.accent : undefined}}>{s.text}</span>)}
			{suffix}
		</div>
	);
};

export const ShortTexts: React.FC<{cues: TextCue[]; t: number; unit: number; km: number | null}> = ({cues, t, unit, km}) => (
	<>
		{cues
			.filter((c) => t >= c.start - 0.4 && t < c.end)
			.map((c) => (
				<div key={c.id} style={{position: 'absolute', left: SAFE.left * unit, top: c.y * unit, right: (c.y < UPPER_ZONE_END ? UPPER_RIGHT : SAFE.right) * unit, textShadow: '0 0 22px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.6)'}}>
					{c.lines.map((l, i) => (
						<Line key={i} l={l} cue={c} t={t} unit={unit} km={km} />
					))}
				</div>
			))}
	</>
);
