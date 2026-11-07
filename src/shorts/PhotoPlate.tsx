// Photo personnelle (optionnelle) : n'apparaît que si un fichier authentique est déclaré dans config.ts (PHOTOS).
import React from 'react';
import {Img, staticFile} from 'remotion';
import {PHOTOS} from './config';
import type {Shot} from './storyboards';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const hasPhoto = (shot: Shot) => Boolean(shot.photo && PHOTOS[shot.photo]);

export const PhotoPlate: React.FC<{shot: Shot; t: number}> = ({shot, t}) => {
	if (!shot.photo) return null;
	const file = PHOTOS[shot.photo];
	if (!file) return null;
	const p = clamp01((t - shot.start) / (shot.end - shot.start));
	// Accroche : la photo occupe le plan puis s'efface pour laisser place au fil de lumière.
	const isHook = shot.photo === 'papa';
	const o = isHook ? 1 - clamp01((p - 0.62) / 0.3) : clamp01((t - shot.start - 0.3) / 1.2) * 0.85;
	return (
		<div style={{position: 'absolute', inset: 0, opacity: o, overflow: 'hidden'}}>
			<Img
				src={staticFile(`shorts/photos/${file}`)}
				style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', scale: `${1.08 - 0.06 * p}`, filter: 'saturate(0.72) contrast(1.05) brightness(0.62)'}}
			/>
			{/* dégradé : lisibilité du texte en haut, transition vers la carte en bas */}
			<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,6,6,0.82) 0%, rgba(6,6,6,0.25) 38%, rgba(6,6,6,0.15) 60%, rgba(6,6,6,0.85) 100%)'}} />
		</div>
	);
};
