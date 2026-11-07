// Rendu vidéo d'une composition (ou d'un extrait) en MP4 H.264.
// Usage : node scripts/render/film.mjs <Composition> <sortie.mp4> [--from=sec] [--to=sec] [--concurrency=n] [--crf=n] [--muted]
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const [id, out] = args.filter((a) => !a.startsWith('--'));
const opt = (k, d) => {
	const a = args.find((x) => x.startsWith(`--${k}=`));
	return a ? a.split('=')[1] : d;
};
const flag = (k) => args.includes(`--${k}`);
if (!id || !out) {
	console.error('Usage : node scripts/render/film.mjs <Composition> <sortie.mp4> [--from=s] [--to=s]');
	process.exit(1);
}
mkdirSync(path.dirname(out), {recursive: true});

const t0 = Date.now();
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
const composition = await selectComposition({serveUrl, id});
const fps = composition.fps;
const from = Math.round(Number(opt('from', 0)) * fps);
const to = Math.min(composition.durationInFrames - 1, Math.round(Number(opt('to', composition.durationInFrames / fps)) * fps) - 1);
console.log(`${id} ${composition.width}×${composition.height} — images ${from}→${to}`);

let last = 0;
await renderMedia({
	composition,
	serveUrl,
	codec: 'h264',
	outputLocation: out,
	frameRange: [from, to],
	concurrency: Number(opt('concurrency', 8)),
	crf: Number(opt('crf', 16)),
	pixelFormat: 'yuv420p',
	x264Preset: opt('preset', 'slow'),
	audioCodec: 'aac',
	audioBitrate: '320k',
	muted: flag('muted'),
	colorSpace: 'bt709',
	imageFormat: 'jpeg',
	jpegQuality: 95,
	chromiumOptions: {gl: 'angle'},
	timeoutInMilliseconds: 120000,
	onProgress: ({progress}) => {
		const p = Math.floor(progress * 20);
		if (p !== last) {
			last = p;
			process.stdout.write(`  ${Math.round(progress * 100)} % — ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
		}
	},
});
console.log(`→ ${out} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
