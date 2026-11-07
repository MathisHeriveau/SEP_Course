// Liste exacte des tuiles de fond de carte nécessaires : on rejoue la caméra du film
// image par image (16:9 et 9:16) + l'affiche haute définition, et on collecte les tuiles visibles.
// Usage : npx tsx scripts/map/tile-list.ts
import {mkdirSync, writeFileSync} from 'node:fs';
import {DURATION_IN_FRAMES} from '../../src/config/film';
import {cameraAt} from '../../src/geo/camera';
import {lodFor} from '../../src/geo/lod';
import {type Viewport, visibleTiles} from '../../src/geo/mercator';
import {POSTER} from '../../src/config/poster';
import {posterCamera} from '../../src/geo/poster-camera';
import {SHORTS} from '../../src/shorts/storyboards';
import {shotAt, shotCamera} from '../../src/shorts/camera';

const formats: {name: string; vp: Viewport}[] = [
	{name: '16:9', vp: {width: 1920, height: 1080}},
	{name: '9:16', vp: {width: 1080, height: 1920}},
];

const set = new Set<string>();
const perZoom: Record<number, number> = {};
const add = (z: number, x: number, y: number) => {
	const k = `${z}/${x}/${y}`;
	if (!set.has(k)) {
		set.add(k);
		perZoom[z] = (perZoom[z] ?? 0) + 1;
	}
};

for (const {name, vp} of formats) {
	let minZ = 99, maxZ = 0;
	for (let f = 0; f < DURATION_IN_FRAMES; f++) {
		const cam = cameraAt(f, vp);
		minZ = Math.min(minZ, cam.zoom);
		maxZ = Math.max(maxZ, cam.zoom);
		const {hi, lo, alphaHi} = lodFor(cam.zoom);
		for (const t of visibleTiles(cam, vp, lo, 96)) add(t.z, t.x, t.y);
		if (alphaHi > 0) for (const t of visibleTiles(cam, vp, hi, 96)) add(t.z, t.x, t.y);
	}
	console.log(`${name}: zoom caméra ${minZ.toFixed(2)} → ${maxZ.toFixed(2)}`);
}

// Shorts 9:16 (dist/shorts)
for (const spec of Object.values(SHORTS)) {
	const vp = {width: 1080, height: 1920};
	let minZ = 99, maxZ = 0;
	const frames = Math.round(spec.durationSec * 30);
	for (let f = 0; f < frames; f++) {
		const t = f / 30;
		const cam = shotCamera(shotAt(spec, t), t, vp);
		minZ = Math.min(minZ, cam.zoom);
		maxZ = Math.max(maxZ, cam.zoom);
		const {hi, lo, alphaHi} = lodFor(cam.zoom);
		for (const tl of visibleTiles(cam, vp, lo, 96)) add(tl.z, tl.x, tl.y);
		if (alphaHi > 0) for (const tl of visibleTiles(cam, vp, hi, 96)) add(tl.z, tl.x, tl.y);
	}
	console.log(`short ${spec.id}: zoom caméra ${minZ.toFixed(2)} → ${maxZ.toFixed(2)}`);
}

// Affiche (carte-parcours.png)
{
	const vp = {width: POSTER.width, height: POSTER.height};
	const cam = posterCamera(vp);
	const {hi, lo} = lodFor(cam.zoom + POSTER.detailBoost);
	for (const t of visibleTiles(cam, vp, hi, 64)) add(t.z, t.x, t.y);
	for (const t of visibleTiles(cam, vp, lo, 64)) add(t.z, t.x, t.y);
	console.log(`affiche : zoom ${cam.zoom.toFixed(2)} (niveau de tuiles ${hi})`);
}

mkdirSync('data/generated', {recursive: true});
writeFileSync('data/generated/tiles-needed.json', JSON.stringify([...set].sort()));
console.log(`Tuiles nécessaires : ${set.size}`, perZoom);
