// Photos personnelles : n'apparaissent que si un fichier authentique est déclaré dans config.ts (PHOTOS).
import React from 'react';
import {Img, staticFile} from 'remotion';
import {PHOTO_BAND, PHOTO_LAYOUT, PHOTOS} from './config';
import type {ShortSpec} from './storyboards';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const PhotoLayer: React.FC<{spec: ShortSpec; t: number; unit: number}> = ({spec, t, unit}) => (
	<>
		{(spec.photos ?? []).map((ph) => {
			const file = PHOTOS[ph.who];
			if (!file || t < ph.start - 0.05 || t > ph.end) return null;
			// une photo présente dès la première image n'a pas de fondu d'entrée
			const fadeIn = ph.start <= 0 ? 1 : clamp01((t - ph.start) / 0.3);
			const fadeOut = 1 - clamp01((t - (ph.end - 0.6)) / 0.6);
			const o = Math.min(fadeIn, fadeOut);
			const p = clamp01((t - ph.start) / (ph.end - ph.start));
			const img = (
				<Img
					src={staticFile(`shorts/photos/${file}`)}
					style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', scale: `${1.0 + 0.06 * p}`, filter: 'saturate(0.92) contrast(1.04) brightness(0.92)'}}
				/>
			);
			if (PHOTO_LAYOUT[ph.who] === 'band') {
				const fade = 'linear-gradient(to bottom, transparent 0%, black 16%, black 90%, transparent 100%)';
				return (
					<div key={ph.who} style={{position: 'absolute', left: 0, right: 0, top: PHOTO_BAND.top * unit, height: PHOTO_BAND.height * unit, overflow: 'hidden', opacity: o, maskImage: fade, WebkitMaskImage: fade}}>
						{img}
					</div>
				);
			}
			return (
				<div key={ph.who} style={{position: 'absolute', inset: 0, opacity: o * 0.85, overflow: 'hidden'}}>
					{img}
					<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,6,6,0.82) 0%, rgba(6,6,6,0.25) 38%, rgba(6,6,6,0.15) 60%, rgba(6,6,6,0.85) 100%)'}} />
				</div>
			);
		})}
	</>
);
