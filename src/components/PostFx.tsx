// Finishing: vignette + fine film grain (pre-generated textures, deterministic per frame).
import React from 'react';
import {AbsoluteFill, Img, random, staticFile, useCurrentFrame} from 'remotion';
import {useLayout} from './layout';

export const PostFx: React.FC<{grain?: number}> = ({grain = 0.035}) => {
	const frame = useCurrentFrame();
	const {width, height, unit} = useLayout();
	// le grain change toutes les 2 images (cadence « pellicule », plus économe à l'encodage)
	const g = Math.floor(frame / 2);
	const i = g % 6;
	const ox = Math.floor(random(`gx${g}`) * 512);
	const oy = Math.floor(random(`gy${g}`) * 512);
	const tile = 512 * Math.max(1, unit * 0.9);
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<AbsoluteFill style={{background: `radial-gradient(ellipse ${width > height ? '78% 82%' : '92% 70%'} at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)`}} />
			<AbsoluteFill style={{overflow: 'hidden', mixBlendMode: 'overlay', opacity: grain * 4}}>
				<div style={{position: 'absolute', left: -ox, top: -oy, width: width + 1024, height: height + 1024, backgroundImage: `url(${staticFile(`fx/grain-${i}.png`)})`, backgroundSize: `${tile}px ${tile}px`}} />
			</AbsoluteFill>
			<Img src={staticFile(`fx/grain-${i}.png`)} style={{display: 'none'}} />
		</AbsoluteFill>
	);
};
