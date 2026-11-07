// Prologue, titre, message final, titre de fin.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLORS, FONTS, TYPE} from '../config/theme';
import {INSTAGRAM_HANDLE, TEXTS, TIMELINE} from '../config/film';
import {easeOut} from '../geo/camera';
import {MAP_ATTRIBUTION} from '../config/credits';
import {envelope, ramp, useLayout} from './layout';

const center: React.CSSProperties = {justifyContent: 'center', alignItems: 'center', textAlign: 'center'};

/** A sentence that rises softly and settles; letter-spacing relaxes as it appears. */
const Sentence: React.FC<{t: number; window: readonly [number, number]; size: number; weight?: number; delay?: number; children: React.ReactNode; font?: string; tracking?: [number, number]; color?: string}> = ({t, window, size, weight = 300, delay = 0, children, font = FONTS.text, tracking = [0.06, 0.01], color = COLORS.offWhite}) => {
	const {unit} = useLayout();
	const a = window[0] + delay;
	const k = easeOut(ramp(t, a, a + 1.6));
	const o = envelope(t, [a, window[1]], 1.3, 1.1);
	return (
		<div style={{fontFamily: font, fontWeight: weight, fontSize: size * unit, color, opacity: o, translate: `0 ${(1 - k) * 10 * unit}px`, letterSpacing: `${tracking[0] + (tracking[1] - tracking[0]) * k}em`, filter: `blur(${(1 - k) * 4 * unit}px)`, lineHeight: 1.3}}>
			{children}
		</div>
	);
};

export const Prologue: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, unit, portrait} = useLayout();
	const t = frame / fps;
	const T = TIMELINE;
	const maxW = portrait ? 860 * unit : 1400 * unit;
	return (
		<AbsoluteFill style={center}>
			{t < T.line1[1] && (
				<div style={{maxWidth: maxW}}>
					<Sentence t={t} window={T.line1} size={portrait ? 50 : TYPE.sentence}>
						{TEXTS.line1}
					</Sentence>
				</div>
			)}
			{t >= T.line2a[0] && t < T.line2a[1] && (
				<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 * unit}}>
					<Sentence t={t} window={T.line2a} size={TYPE.hero} font={FONTS.title} weight={250} tracking={[0.08, 0.02]}>
						{TEXTS.line2a}
					</Sentence>
					<div style={{display: 'flex', flexDirection: portrait ? 'column' : 'row', gap: portrait ? 8 * unit : 26 * unit}}>
						{TEXTS.line2b.map((w, i) => (
							<Sentence key={w} t={t} window={T.line2b} size={portrait ? 40 : 34} delay={i * 0.75} color={COLORS.offWhiteDim}>
								{w}
							</Sentence>
						))}
					</div>
				</div>
			)}
		</AbsoluteFill>
	);
};

export const TitleCard: React.FC<{window: readonly [number, number]; withHandle?: boolean}> = ({window, withHandle}) => {
	const frame = useCurrentFrame();
	const {fps, unit, portrait} = useLayout();
	const t = frame / fps;
	const o = envelope(t, window, 1.6, 1.6);
	if (o <= 0) return null;
	const k = easeOut(ramp(t, window[0], window[0] + 2.4));
	const line = easeOut(ramp(t, window[0] + 0.6, window[0] + 2.2));
	return (
		<AbsoluteFill style={{...center, opacity: o}}>
			<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
				<div style={{fontFamily: FONTS.title, fontWeight: 300, fontSize: (portrait ? 64 : TYPE.hero) * unit, color: COLORS.offWhite, textTransform: 'uppercase', letterSpacing: `${0.42 - 0.12 * k}em`, marginRight: `-${0.42 - 0.12 * k}em`, lineHeight: 1.1, textAlign: 'center', maxWidth: portrait ? 900 * unit : undefined}}>
					{TEXTS.title}
				</div>
				<div style={{width: 120 * unit * line, height: 1.5 * unit, backgroundColor: COLORS.accent, margin: `${34 * unit}px 0`}} />
				<div style={{fontFamily: FONTS.text, fontWeight: 400, fontSize: 24 * unit, color: COLORS.offWhiteDim, letterSpacing: '0.3em', marginRight: '-0.3em', textTransform: 'uppercase', opacity: ramp(t, window[0] + 0.9, window[0] + 2.2)}}>
					{TEXTS.subtitle}
				</div>
				{withHandle && (
					<div style={{position: 'absolute', bottom: (portrait ? 300 : 54) * unit, left: 0, right: 0, textAlign: 'center', fontFamily: FONTS.text, fontSize: 12.5 * unit, color: COLORS.offWhiteFaint, letterSpacing: '0.08em', opacity: ramp(t, window[0] + 2.2, window[0] + 3.4), padding: `0 ${60 * unit}px`}}>
						Cartographie : {MAP_ATTRIBUTION} · Musique originale
					</div>
				)}
				{withHandle && (
					<div style={{marginTop: 70 * unit, fontFamily: FONTS.text, fontWeight: 400, fontSize: 21 * unit, color: COLORS.offWhiteDim, letterSpacing: '0.06em', opacity: ramp(t, window[0] + 1.8, window[0] + 3.0)}}>
						{INSTAGRAM_HANDLE}
					</div>
				)}
			</div>
		</AbsoluteFill>
	);
};

export const FinalMessage: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, unit, portrait} = useLayout();
	const t = frame / fps;
	const T = TIMELINE;
	if (t < T.finalText[0] || t > T.finalText[1]) return null;
	return (
		<AbsoluteFill style={{...center, flexDirection: 'column', gap: 18 * unit}}>
			{TEXTS.finalLines.map((l, i) => (
				<Sentence key={l} t={t} window={T.finalText} delay={i * 1.9} size={i === 0 ? (portrait ? 62 : 64) : portrait ? 44 : 42} font={i === 0 ? FONTS.title : FONTS.text} weight={i === 0 ? 250 : 300} color={i === 2 ? COLORS.offWhite : i === 1 ? COLORS.offWhiteDim : COLORS.offWhite}>
					{l}
				</Sentence>
			))}
		</AbsoluteFill>
	);
};
