// Basemap compositor: draws pre-rendered 512 px tiles for the current camera.
// Two levels are stacked (lo underneath, hi cross-faded on top) so level changes never pop.
// Each level lives in a single transformed container → sub-pixel smooth motion, no seams.
import React from 'react';
import {Img, staticFile} from 'remotion';
import manifest from '../data/tiles-manifest.json';
import {lodFor} from '../geo/lod';
import {type Camera, TILE_SIZE, type Viewport, visibleTiles, worldSize} from '../geo/mercator';

const AVAILABLE = new Set(manifest as string[]);

const TileLevel: React.FC<{cam: Camera; vp: Viewport; level: number; opacity: number}> = ({cam, vp, level, opacity}) => {
	const tiles = visibleTiles(cam, vp, level, 8).filter((t) => AVAILABLE.has(`${t.z}/${t.x}/${t.y}`));
	if (!tiles.length || opacity <= 0) return null;
	const n = 2 ** level;
	const x0 = Math.min(...tiles.map((t) => t.x));
	const y0 = Math.min(...tiles.map((t) => t.y));
	const s = worldSize(cam.zoom);
	const scale = 2 ** (cam.zoom - level);
	const tx = (x0 / n - cam.x) * s + vp.width / 2;
	const ty = (y0 / n - cam.y) * s + vp.height / 2;
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				transformOrigin: '0 0',
				transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
				opacity,
			}}
		>
			{tiles.map((t) => (
				<Img
					key={`${t.z}/${t.x}/${t.y}`}
					src={staticFile(`tiles/${t.z}/${t.x}/${t.y}.jpg`)}
					style={{
						position: 'absolute',
						left: (t.x - x0) * TILE_SIZE,
						top: (t.y - y0) * TILE_SIZE,
						// 1 px overlap hides hairline seams between neighbours
						width: TILE_SIZE + 1,
						height: TILE_SIZE + 1,
					}}
				/>
			))}
		</div>
	);
};

export const TileLayer: React.FC<{cam: Camera; vp: Viewport; detailBoost?: number}> = ({cam, vp, detailBoost = 0}) => {
	const {hi, lo, alphaHi} = lodFor(cam.zoom + detailBoost);
	return (
		<>
			<TileLevel cam={cam} vp={vp} level={lo} opacity={1} />
			<TileLevel cam={cam} vp={vp} level={hi} opacity={alphaHi} />
		</>
	);
};
