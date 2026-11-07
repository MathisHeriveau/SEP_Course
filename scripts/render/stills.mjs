// Contrôle qualité : rend des images fixes à des instants donnés (secondes) pour inspection.
// Usage : node scripts/render/stills.mjs Film-16x9 out/qc 5 20 27 ...
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

const [comp = 'Film-16x9', outDir = 'out/qc', ...secs] = process.argv.slice(2);
mkdirSync(outDir, {recursive: true});
const t0 = Date.now();
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), webpackOverride: (c) => c, publicDir: path.resolve('public')});
const browser = await openBrowser('chrome', {chromiumOptions: {gl: 'angle'}});
const composition = await selectComposition({serveUrl, id: comp, puppeteerInstance: browser});
console.log(`bundle ${((Date.now() - t0) / 1000).toFixed(1)} s — ${composition.width}×${composition.height}`);
const list = secs.length ? secs.map(Number) : [0];
for (const s of list) {
	const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
	const file = `${outDir}/${comp}-${String(s).replace('.', '_')}s.png`;
	const t1 = Date.now();
	await renderStill({composition, serveUrl, frame, output: file, puppeteerInstance: browser, imageFormat: 'png', timeoutInMilliseconds: 120000});
	console.log(`${file} (${((Date.now() - t1) / 1000).toFixed(1)} s)`);
}
await browser.close({silent: true});
