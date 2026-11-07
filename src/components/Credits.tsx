// Générique : le « mur » des communes traversées, dans l'ordre du parcours.
// Les noms apparaissent en cascade (ordre du parcours), puis restent ensemble à l'écran.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS, FONTS, TYPE} from '../config/theme';
import {TEXTS, TIMELINE} from '../config/film';
import {COMMUNE_EVENTS, TRAVERSED_COUNT} from '../data';
import {easeOut} from '../geo/camera';
import {envelope, ramp, useLayout} from './layout';

export const CREDIT_NAMES = COMMUNE_EVENTS.filter((c) => c.statut === 'traversee');
/** Seconds after credits start when the i-th name appears (also used for the sound design). */
export const creditAppearTime = (i: number) => TIMELINE.credits[0] + 0.9 + (i / CREDIT_NAMES.length) * 5.2;

export const Credits: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, unit, portrait, width, height, safe} = useLayout();
	const t = frame / fps;
	const T = TIMELINE;
	const o = envelope(t, T.credits, 0.8, 1.2);
	if (o <= 0) return null;

	const cols = portrait ? 3 : 4;
	const perCol = Math.ceil(CREDIT_NAMES.length / cols);
	const font = (portrait ? 17 : 15.5) * unit;
	const rowH = font * 1.62;
	const left = portrait ? safe.left : width * 0.44;
	const right = portrait ? safe.right : safe.right;
	const colW = (width - left - right) / cols;
	const top = portrait ? safe.top + 20 * unit : (height - perCol * rowH) / 2 + 18 * unit;

	return (
		<div style={{position: 'absolute', left, top, opacity: o}}>
			<div style={{fontFamily: FONTS.text, fontWeight: 600, fontSize: TYPE.cardSmall * 0.8 * unit, letterSpacing: '0.32em', textTransform: 'uppercase', color: COLORS.accent, marginBottom: 22 * unit, opacity: easeOut(ramp(t, T.credits[0], T.credits[0] + 0.8))}}>
				{TEXTS.creditsTitle}
				<span style={{color: COLORS.offWhiteFaint, marginLeft: 14 * unit}}>{TRAVERSED_COUNT}</span>
			</div>
			<div style={{display: 'flex'}}>
				{Array.from({length: cols}, (_, ci) => (
					<div key={ci} style={{width: colW}}>
						{CREDIT_NAMES.slice(ci * perCol, (ci + 1) * perCol).map((c, ri) => {
							const i = ci * perCol + ri;
							const k = easeOut(ramp(t, creditAppearTime(i), creditAppearTime(i) + 0.7));
							return (
								<div key={c.code} style={{height: rowH, display: 'flex', alignItems: 'baseline', gap: 8 * unit, whiteSpace: 'nowrap', opacity: k, translate: `0 ${(1 - k) * 6 * unit}px`}}>
									<span style={{fontFamily: FONTS.text, fontSize: font, color: c.isWaypoint ? COLORS.offWhite : 'rgba(238,233,225,0.8)', fontWeight: c.isWaypoint ? 600 : 400}}>{c.nom}</span>
									<span style={{fontFamily: FONTS.text, fontSize: font * 0.62, color: COLORS.offWhiteFaint, letterSpacing: '0.1em'}}>{c.departement}</span>
								</div>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
};
