// Exporte les instants (secondes) des événements visuels pour caler la bande-son sur l'image.
// Usage : npx tsx scripts/audio/export-events.ts
import {writeFileSync} from 'node:fs';
import {DURATION_IN_FRAMES, FPS, TIMELINE} from '../../src/config/film';
import {COMMUNE_EVENTS, DEPARTEMENT_SEGMENTS, WAYPOINT_EVENTS} from '../../src/data';

const out = {
	fps: FPS,
	durationSec: DURATION_IN_FRAMES / FPS,
	timeline: TIMELINE,
	communes: COMMUNE_EVENTS.filter((c) => c.statut === 'traversee').map((c) => ({t: +c.tMairie.toFixed(3), code: c.code, nom: c.nom, waypoint: c.isWaypoint})),
	waypoints: WAYPOINT_EVENTS.map((w) => ({t: +w.t.toFixed(3), nom: w.communeNom})),
	departements: DEPARTEMENT_SEGMENTS.map((d) => ({t: +d.t.toFixed(3), nom: d.nom})),
};
writeFileSync('data/generated/audio-events.json', JSON.stringify(out, null, 2));
console.log(`${out.communes.length} communes, ${out.waypoints.length} villes repères, ${out.departements.length} départements, durée ${out.durationSec} s`);
