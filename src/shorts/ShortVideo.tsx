// Composition des shorts (9:16). Un seul composant pour les trois montages : le storyboard fait la différence.
import React from 'react';
import {Audio} from '@remotion/media';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../config/theme';
import {PostFx} from '../components/PostFx';
import {shotAt, shotCamera, walkKmAt} from './camera';
import {PhotoPlate} from './PhotoPlate';
import {ShortHud} from './ShortHud';
import {ShortMap} from './ShortMap';
import {ShortTexts} from './ShortTexts';
import {SHORTS, type ShortId} from './storyboards';

export const ShortVideo: React.FC<{id: ShortId; muted?: boolean}> = ({id, muted}) => {
	const frame = useCurrentFrame();
	const {fps, width, height, durationInFrames} = useVideoConfig();
	const spec = SHORTS[id];
	const t = frame / fps;
	const vp = {width, height};
	const unit = width / 1080;
	const shot = shotAt(spec, t);
	const prevShot = spec.shots[spec.shots.indexOf(shot) - 1];
	const km = walkKmAt(shot, t);
	const cam = shotCamera(shot, t, vp);
	// vitesse du fond de carte (px par image) → léger flou de mouvement quand le marcheur file
	const prevT = Math.max(shot.start, t - 1 / fps);
	const camPrev = shotCamera(shot, prevT, vp);
	const pxPerFrame = Math.hypot(cam.x - camPrev.x, cam.y - camPrev.y) * 512 * 2 ** cam.zoom;
	const speedBlur = Math.max(0, Math.min(2.6, (pxPerFrame - 7) / 7));
	// Fin : léger fondu au noir sur les 8 dernières images (bouclage propre sur les plateformes)
	const endFade = Math.max(0, Math.min(1, (durationInFrames - 1 - frame) / 8));

	return (
		<AbsoluteFill style={{backgroundColor: COLORS.black}}>
			<AbsoluteFill style={{opacity: endFade}}>
				<ShortMap shot={shot} t={t} km={km} cam={cam} vp={vp} unit={unit} speedBlur={speedBlur} />
				<PhotoPlate shot={shot} t={t} />
				<ShortHud spec={spec} shot={shot} t={t} km={km} unit={unit} />
				{/* fin du plan précédent : compteur et carton s'effacent au lieu de disparaître d'un coup */}
				{prevShot && t - shot.start < 0.4 && (
					<ShortHud spec={spec} shot={prevShot} t={prevShot.end - 1e-3} km={walkKmAt(prevShot, prevShot.end - 1e-3)} unit={unit} fade={1 - (t - shot.start) / 0.4} only={shot.counter ? 'town' : undefined} />
				)}
				<ShortTexts cues={spec.texts} t={t} unit={unit} km={km} />
			</AbsoluteFill>
			<PostFx grain={0.028} />
			{!muted && <Audio src={staticFile(spec.audio)} />}
		</AbsoluteFill>
	);
};
