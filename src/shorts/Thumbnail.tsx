// Miniature verticale : le fil de lumière du parcours + « 556 KM » très lisible.
// Composition pensée pour le recadrage 3:4 des grilles de profil (zone utile y ≈ 240–1680).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COLORS, FONTS} from '../config/theme';
import {PostFx} from '../components/PostFx';
import {routeCamera} from './camera';
import {INSTAGRAM, SHORT_TYPE} from './config';
import {ShortMap} from './ShortMap';
import type {Shot} from './storyboards';

const SHOT: Shot = {id: 'miniature', start: 0, end: 1, camera: {type: 'hold', cam: {kind: 'route'}}, line: 'full', endpoints: false};

export const Thumbnail: React.FC = () => {
	const vp = {width: 1080, height: 1920};
	const unit = 1;
	const cam = routeCamera(vp, {top: 0.13, bottom: 0.12, left: 0.6, right: 0.1});
	return (
		<AbsoluteFill style={{backgroundColor: COLORS.black}}>
			<ShortMap shot={SHOT} t={5} km={null} cam={cam} vp={vp} unit={unit} />
			<div style={{position: 'absolute', left: 80, top: 300, right: 120, textShadow: '0 0 26px rgba(0,0,0,0.9)'}}>
				<div style={{fontFamily: FONTS.text, fontSize: SHORT_TYPE.label, color: COLORS.offWhiteDim, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 500}}>Pour sa maman</div>
				<div style={{fontFamily: FONTS.title, fontWeight: 300, fontSize: 330, lineHeight: 0.9, letterSpacing: '-0.04em', color: COLORS.accent, marginLeft: -10, marginTop: 10}}>556</div>
				<div style={{fontFamily: FONTS.title, fontWeight: 300, fontSize: 150, lineHeight: 0.95, letterSpacing: '-0.03em', color: COLORS.accent, marginTop: -6}}>KM</div>
				<div style={{fontFamily: FONTS.text, fontWeight: 500, fontSize: SHORT_TYPE.title, color: COLORS.offWhite, marginTop: 36, lineHeight: 1.14}}>
					à pied,
					<br />
					pour la SEP.
				</div>
			</div>
			{/* Signature : dans la zone utile du recadrage 3:4 des grilles de profil */}
			<div style={{position: 'absolute', left: 80, bottom: 380, textShadow: '0 0 18px rgba(0,0,0,0.9)'}}>
				<div style={{fontFamily: FONTS.text, fontSize: SHORT_TYPE.label, color: COLORS.offWhite, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 500}}>Un pas pour maman</div>
				<div style={{fontFamily: FONTS.text, fontSize: SHORT_TYPE.label, color: COLORS.offWhite, fontWeight: 600, marginTop: 14, letterSpacing: '0.01em'}}>{INSTAGRAM}</div>
			</div>
			<PostFx grain={0.02} />
		</AbsoluteFill>
	);
};
