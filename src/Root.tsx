import './components/fonts';
import React from 'react';
import {Composition, Still} from 'remotion';
import {DURATION_IN_FRAMES, FPS} from './config/film';
import {POSTER} from './config/poster';
import {ensureFonts} from './components/fonts';
import {Film} from './Film';
import {Poster} from './Poster';
import {SHORTS} from './shorts/storyboards';
import {ShortVideo} from './shorts/ShortVideo';
import {Thumbnail} from './shorts/Thumbnail';

ensureFonts();

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition id="Film-16x9" component={Film} durationInFrames={DURATION_IN_FRAMES} fps={FPS} width={1920} height={1080} />
			<Composition id="Film-9x16" component={Film} durationInFrames={DURATION_IN_FRAMES} fps={FPS} width={1080} height={1920} />
			<Still id="Carte-Parcours" component={Poster} width={POSTER.width} height={POSTER.height} />
			{/* Shorts réseaux sociaux (9:16) — compositions séparées du documentaire */}
			{Object.values(SHORTS).map((s) => (
				<Composition key={s.id} id={s.composition} component={ShortVideo} defaultProps={{id: s.id, muted: false}} durationInFrames={Math.round(s.durationSec * FPS)} fps={FPS} width={1080} height={1920} />
			))}
			<Still id="Short-Miniature" component={Thumbnail} width={1080} height={1920} />
		</>
	);
};
