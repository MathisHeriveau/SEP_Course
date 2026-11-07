// Exporte, pour chaque short, les instants (s) des événements visuels → data/generated/shorts-events.json
// La bande-son (compose_shorts.py) s'y cale : coupes, vols de caméra, accélérations, communes, villes, arrivée.
// Usage : npx tsx scripts/audio/export-short-events.ts
import {writeFileSync} from 'node:fs';
import {COMMUNE_EVENTS, WAYPOINT_EVENTS} from '../../src/data';
import {shotTowns, walkKmAt} from '../../src/shorts/camera';
import {SHORTS} from '../../src/shorts/storyboards';

const TRAVERSED = COMMUNE_EVENTS.filter((c) => c.statut === 'traversee');
const out: Record<string, unknown> = {};
for (const spec of Object.values(SHORTS)) {
	const towns: {t: number; nom: string}[] = [];
	const segments: {t0: number; t1: number; kmPerSec: number}[] = [];
	const ticks: number[] = [];
	for (const s of spec.shots) {
		if (s.town === 'depart' && s.camera.type === 'fly') towns.push({t: s.start + s.camera.dur - 0.25, nom: 'Départ'});
		for (const tw of shotTowns(s)) towns.push({t: tw.t, nom: WAYPOINT_EVENTS.find((w) => w.gpxName === tw.name)?.communeNom ?? tw.name});
		if (s.journey) {
			const k = s.journey.keys;
			for (let i = 0; i < k.length - 1; i++) segments.push({t0: k[i].t, t1: k[i + 1].t, kmPerSec: (k[i + 1].km - k[i].km) / (k[i + 1].t - k[i].t)});
		}
		// entrée dans chaque commune traversée pendant la marche (hors comète de l'accroche)
		if (s.line === 'walk' && s.walker) {
			let prev = walkKmAt(s, s.start) ?? 0;
			for (let t = s.start + 1 / 120; t <= s.end; t += 1 / 120) {
				const km = walkKmAt(s, t) ?? prev;
				for (const c of TRAVERSED) if (c.entreeKm > prev && c.entreeKm <= km) ticks.push(+t.toFixed(3));
				prev = km;
			}
		}
	}
	out[spec.id] = {
		durationSec: spec.durationSec,
		cuts: spec.shots.map((s) => ({t: s.start, id: s.id})),
		flies: spec.shots.filter((s) => s.camera.type === 'fly' || ((s.camera.type === 'journey' || s.camera.type === 'follow') && s.camera.fly)).map((s) => ({t0: s.start, t1: s.start + (s.camera.type === 'fly' ? s.camera.dur : (s.camera.type === 'journey' || s.camera.type === 'follow') && s.camera.fly ? s.camera.fly.dur : 0), id: s.id})),
		comet: spec.shots.filter((s) => s.line === 'comet' && s.walk).map((s) => ({t0: s.start + (s.walk?.delay ?? 0), t1: s.start + (s.walk?.delay ?? 0) + (s.walk?.dur ?? 0)})),
		displayHits: spec.texts.flatMap((c) => c.lines.filter((l) => l.size === 'display' || l.size === 'figure').map((l) => ({t: c.start + (l.delay ?? 0), text: l.t}))),
		towns,
		segments,
		communeTicks: ticks,
		arrival: spec.shots.find((s) => s.arrival)?.start ?? null,
		texts: spec.texts.map((c) => ({t: c.start, id: c.id})),
	};
}
writeFileSync('data/generated/shorts-events.json', JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(out)) {
	const e = v as {towns: {t: number}[]; arrival: number; durationSec: number; segments: unknown[]; communeTicks: number[]};
	console.log(`${k}: ${e.durationSec.toFixed(1)} s — villes ${e.towns.map((x) => x.t.toFixed(2)).join(', ')} — accélérations ${e.segments.length} — communes ${e.communeTicks.length} — arrivée ${e.arrival}`);
}
