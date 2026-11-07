// Typographic cards: départ, villes repères, arrivée, bilan.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS, FONTS, TYPE} from '../config/theme';
import {TEXTS, TIMELINE} from '../config/film';
import {DEPARTEMENT_COUNT, DISPLAY_TOTAL_KM, TRAVERSED_COUNT, WAYPOINT_EVENTS, displayKm, fmtCoord, fmtKm} from '../data';
import {easeOut} from '../geo/camera';
import {ROUTE_COORDS} from '../geo/route';
import {envelope, ramp, useLayout} from './layout';

const shadow = '0 0 24px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.6)';

/** Staggered rise-in for successive lines of a card. */
const Line: React.FC<{t: number; at: number; children: React.ReactNode; style?: React.CSSProperties; unit: number}> = ({t, at, children, style, unit}) => {
	const k = easeOut(ramp(t, at, at + 0.9));
	return <div style={{opacity: k, translate: `0 ${(1 - k) * 14 * unit}px`, ...style}}>{children}</div>;
};

const Kicker: React.FC<{color: string; unit: number; children: React.ReactNode}> = ({color, unit, children}) => (
	<div style={{display: 'flex', alignItems: 'center', gap: 14 * unit, fontFamily: FONTS.text, fontWeight: 600, fontSize: TYPE.cardSmall * 0.85 * unit, letterSpacing: '0.32em', textTransform: 'uppercase', color}}>
		<div style={{width: 34 * unit, height: 1.5 * unit, backgroundColor: color}} />
		{children}
	</div>
);

const PlaceCard: React.FC<{t: number; window: readonly [number, number]; kicker: string; kickerColor: string; name: string; sub: string; extra?: React.ReactNode; big?: boolean}> = ({t, window, kicker, kickerColor, name, sub, extra, big}) => {
	const {unit, safe, portrait, height} = useLayout();
	const o = envelope(t, window, 0.6, 1.1);
	if (o <= 0) return null;
	const a = window[0];
	return (
		<div style={{position: 'absolute', left: safe.left, top: portrait ? height * 0.335 : height * 0.36, opacity: o, textShadow: shadow, maxWidth: portrait ? 900 * unit : 820 * unit}}>
			<Line t={t} at={a} unit={unit}>
				<Kicker color={kickerColor} unit={unit}>{kicker}</Kicker>
			</Line>
			<Line t={t} at={a + 0.18} unit={unit} style={{fontFamily: FONTS.title, fontWeight: 300, fontSize: (big ? TYPE.title * 1.18 : TYPE.card) * unit, color: COLORS.offWhite, marginTop: 18 * unit, lineHeight: 1.05, letterSpacing: '-0.01em'}}>
				{name}
			</Line>
			<Line t={t} at={a + 0.36} unit={unit} style={{fontFamily: FONTS.text, fontWeight: 400, fontSize: TYPE.cardSmall * 1.1 * unit, color: COLORS.offWhiteDim, marginTop: 12 * unit, letterSpacing: '0.04em'}}>
				{sub}
			</Line>
			{extra && (
				<Line t={t} at={a + 0.6} unit={unit} style={{marginTop: 22 * unit}}>
					{extra}
				</Line>
			)}
		</div>
	);
};

export const Cards: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, unit, portrait, width, height, safe} = useLayout();
	const t = frame / fps;
	const T = TIMELINE;
	const start = ROUTE_COORDS[0];
	const end = ROUTE_COORDS[ROUTE_COORDS.length - 1];
	const coordStyle: React.CSSProperties = {fontFamily: FONTS.text, fontSize: 14 * unit, color: COLORS.offWhiteFaint, letterSpacing: '0.14em', fontVariantNumeric: 'tabular-nums'};

	// Villes repères (waypoints du GPX)
	const wp = WAYPOINT_EVENTS.map((w) => (
		<PlaceCard
			key={w.gpxName}
			t={t}
			window={[w.t - 0.9, w.t + 3.4]}
			kicker={`km ${fmtKm(displayKm(w.km))}`}
			kickerColor={COLORS.red}
			name={w.communeNom}
			sub={w.commune?.departementNom ?? ''}
		/>
	));

	// Bilan final
	const statsO = envelope(t, T.statsCard, 1.0, 1.2);
	const stat = (value: string, label: string, at: number) => (
		<Line t={t} at={at} unit={unit} style={{display: 'flex', alignItems: 'baseline', gap: 18 * unit, marginBottom: 18 * unit}}>
			<span style={{fontFamily: FONTS.title, fontWeight: 250, fontSize: TYPE.title * 1.05 * unit, color: COLORS.offWhite, fontVariantNumeric: 'tabular-nums', minWidth: 150 * unit, textAlign: 'right'}}>{value}</span>
			<span style={{fontFamily: FONTS.text, fontWeight: 500, fontSize: TYPE.cardSmall * unit, color: COLORS.offWhiteDim, letterSpacing: '0.26em', textTransform: 'uppercase'}}>{label}</span>
		</Line>
	);

	// « 556 km » sur la vue France
	const ovO = envelope(t, T.overviewTitle, 1.0, 1.0);
	const overviewTitle = ovO > 0 && (
		<div style={{position: 'absolute', opacity: ovO, textShadow: shadow, ...(portrait ? {left: safe.left, bottom: safe.bottom + 40 * unit} : {left: width * 0.735, top: height * 0.38})}}>
			<Line t={t} at={T.overviewTitle[0]} unit={unit}>
				<Kicker color={COLORS.accent} unit={unit}>{TEXTS.overviewKicker}</Kicker>
			</Line>
			<Line t={t} at={T.overviewTitle[0] + 0.25} unit={unit} style={{fontFamily: FONTS.title, fontWeight: 250, fontSize: TYPE.hero * 1.25 * unit, color: COLORS.offWhite, lineHeight: 1, marginTop: 16 * unit, fontVariantNumeric: 'tabular-nums'}}>
				{fmtKm(DISPLAY_TOTAL_KM)}
				<span style={{fontSize: TYPE.hero * 0.42 * unit, marginLeft: 14 * unit, color: COLORS.offWhiteDim}}>km</span>
			</Line>
			<Line t={t} at={T.overviewTitle[0] + 0.5} unit={unit} style={{fontFamily: FONTS.text, fontSize: TYPE.cardSmall * 1.05 * unit, color: COLORS.offWhiteDim, marginTop: 14 * unit, letterSpacing: '0.03em'}}>
				{TEXTS.overviewSub}
			</Line>
		</div>
	);

	return (
		<>
			{overviewTitle}
			<PlaceCard
				t={t}
				window={T.departCard}
				kicker={TEXTS.departLabel}
				kickerColor={COLORS.accent}
				name="Noaillan"
				sub="Gironde"
				big
				extra={<div style={coordStyle}>{fmtCoord(start[1], 'N', 'S')} · {fmtCoord(start[0], 'E', 'O')}</div>}
			/>
			{wp}
			<PlaceCard
				t={t}
				window={T.arrivalCard}
				kicker={TEXTS.arrivalLabel}
				kickerColor={COLORS.red}
				name="Cossé-le-Vivien"
				sub="Mayenne"
				big
				extra={
					<div>
						<div style={{fontFamily: FONTS.title, fontWeight: 250, fontSize: TYPE.hero * 1.25 * unit, color: COLORS.offWhite, lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>
							{fmtKm(DISPLAY_TOTAL_KM)}
							<span style={{fontSize: TYPE.hero * 0.42 * unit, marginLeft: 14 * unit, color: COLORS.offWhiteDim}}>km</span>
						</div>
						<div style={{...coordStyle, marginTop: 16 * unit}}>{fmtCoord(end[1], 'N', 'S')} · {fmtCoord(end[0], 'E', 'O')}</div>
					</div>
				}
			/>
			{statsO > 0 && (
				<div style={{position: 'absolute', opacity: statsO, textShadow: shadow, ...(portrait ? {left: safe.left, bottom: safe.bottom} : {left: width * 0.53, top: height * 0.33})}}>
					{stat(fmtKm(DISPLAY_TOTAL_KM), 'kilomètres', T.statsCard[0])}
					{stat(String(TRAVERSED_COUNT), 'communes traversées', T.statsCard[0] + 0.5)}
					{stat(String(DEPARTEMENT_COUNT), 'départements', T.statsCard[0] + 1.0)}
				</div>
			)}
		</>
	);
};
