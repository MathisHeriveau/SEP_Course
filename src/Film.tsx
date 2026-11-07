// « Un pas pour maman — 556 km pour la SEP »
// The same component renders the 16:9 film and the 9:16 Instagram version; layout adapts to the frame.
import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {TIMELINE} from './config/film';
import {COLORS} from './config/theme';
import {Cards} from './components/Cards';
import {Credits} from './components/Credits';
import {Hud} from './components/Hud';
import {PostFx} from './components/PostFx';
import {FinalMessage, Prologue, TitleCard} from './components/TextScenes';
import {Soundtrack} from './audio/Soundtrack';
import {MapStage} from './map/MapStage';

export const Film: React.FC = () => {
	const {fps} = useVideoConfig();
	const T = TIMELINE;
	const s = (sec: number) => Math.round(sec * fps);
	return (
		<AbsoluteFill style={{backgroundColor: COLORS.black}}>
			{/* Séquence 1 — L'émotion */}
			<Sequence name="Prologue" durationInFrames={s(T.title[0])}>
				<Prologue />
			</Sequence>

			{/* Séquences 2 à 5 — une seule carte continue */}
			<Sequence name="Carte" from={s(T.mapIn[0])} durationInFrames={s(T.end - T.mapIn[0])} layout="none">
				<Sequence from={-s(T.mapIn[0])} layout="none">
					<MapStage />
					<Hud />
					<Cards />
					<Credits />
				</Sequence>
			</Sequence>

			<Sequence name="Titre" from={0} durationInFrames={s(T.title[1] + 0.5)} layout="none">
				<TitleCard window={T.title} />
			</Sequence>

			<Sequence name="Message final" from={0} durationInFrames={s(T.end)} layout="none">
				<FinalMessage />
				<TitleCard window={T.titleEnd} withHandle />
			</Sequence>

			<PostFx />
			<Soundtrack />
		</AbsoluteFill>
	);
};
