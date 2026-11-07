// =============================================================================
// STORYBOARDS DES SHORTS — un plan = une ligne. Les timings sont en mesures (at(mesure, temps)),
// donc toujours synchrones avec la musique (75 BPM, mesure = 3,2 s).
// Textes : **mot** = mot mis en valeur (couleur d'accent).
// =============================================================================
import waypointsJson from '../data/waypoints.json';
import {DISPLAY_TOTAL_KM, displayKm} from '../data';
import {ROUTE_TOTAL_KM_GPX} from '../geo/route';
import {at, BAR, INSTAGRAM, MONTAGE_TOWNS} from './config';

const TOTAL = ROUTE_TOTAL_KM_GPX;
const wpKm = (gpxName: string) => {
	const w = (waypointsJson as {gpxName: string; km: number}[]).find((x) => x.gpxName === gpxName);
	if (!w) throw new Error(`Ville repère inconnue : ${gpxName}`);
	return w.km;
};
/** Distance restante telle qu'affichée par le compteur (cohérente avec lui). */
const remainingFrom = (gpxKm: number) => DISPLAY_TOTAL_KM - Math.floor(displayKm(gpxKm) + 1e-6);

// ----------------------------------------------------------------------------- types
/** dz : décalage de zoom (pour raccorder exactement un plan qui se termine par une poussée) */
export type CamSpec = {kind: 'route'; dz?: number} | {kind: 'france'; dz?: number} | {kind: 'end'; zoom: number} | {kind: 'walker'; zoom: number; headY?: number};
export type CameraMove =
	| {type: 'hold'; cam: CamSpec; push?: number}
	| {type: 'fly'; from: CamSpec; to: CamSpec; dur: number; push?: number}
	| {type: 'follow'; zoom: [number, number]; headY?: [number, number]; fly?: {from: CamSpec; dur: number}}
	/** Trajet continu : dézoome quand le marcheur accélère, rezoome à chaque ville. */
	| {type: 'journey'; zoomFast: number; zoomTown: number; zoomStart?: number; zoomEnd?: number; fly?: {from: CamSpec; dur: number}};

/** Point de passage d'un trajet accéléré : la vitesse y est minimale (sans arrêt). */
export type JourneyKey = {t: number; km: number; town?: string};

export type Shot = {
	id: string;
	start: number;
	end: number;
	camera: CameraMove;
	/** Position du marcheur (km GPX) pendant le plan */
	walk?: {from: number; to: number; ease?: 'linear' | 'out' | 'inOut'; delay?: number; dur?: number};
	/** Trajet accéléré entre villes repères (remplace `walk`) */
	journey?: {keys: JourneyKey[]; rest?: number};
	/** Ce qui est éclairé : jusqu'au marcheur, tout le tracé, ou une comète qui parcourt le tracé */
	line: 'walk' | 'full' | 'comet';
	walker?: boolean;
	ghost?: number;
	france?: number;
	departements?: boolean;
	endpoints?: boolean;
	town?: string | 'depart' | 'arrivee';
	communes?: number;
	counter?: boolean;
	arrival?: boolean;
	dim?: number;
	photo?: 'papa' | 'grandMere';
};

export type TextLine = {
	t: string;
	size: 'display' | 'figure' | 'title' | 'label' | 'note';
	tone?: 'ink' | 'dim' | 'accent';
	weight?: number;
	upper?: boolean;
	/** secondes après le début du bloc */
	delay?: number;
	/** texte plus petit sur la même ligne (ex. « 6 » + « départements ») */
	suffix?: string;
	/** chiffre animé : le compteur du plan remplace « {km} » */
	live?: boolean;
};
export type TextCue = {id: string; start: number; end: number; y: number; lines: TextLine[]; enter?: 'words' | 'blur' | 'land'; align?: 'left' | 'center'};

export type ShortSpec = {
	id: 'principal' | 's30' | 'teaser';
	composition: string;
	durationSec: number;
	shots: Shot[];
	texts: TextCue[];
	/** fichier musique (public/) */
	audio: string;
};

// ----------------------------------------------------------------------------- briques
/** Trajet continu : le marcheur ralentit à chaque ville (atteinte sur un temps de la musique) et accélère entre elles. */
const journeyShot = (start: number, end: number, startKm: number, towns: [string, number][], endKm: number, camera: CameraMove): Shot => ({
	id: 'voyage',
	start,
	end,
	camera,
	journey: {keys: [{t: start, km: startKm}, ...towns.map(([name, t]) => ({t, km: wpKm(name), town: name})), {t: end, km: endKm}]},
	line: 'walk',
	walker: true,
	ghost: 0.45,
	counter: true,
});

const HOOK_TOP = 330;
/** Première phrase : au centre de la zone libre au-dessus du fil de lumière. */
const HOOK_MID = 600;

// =============================================================================
// 1. SHORT PRINCIPAL — 57,6 s (18 mesures)
// =============================================================================
const CG = wpKm('Château-Gontier');
const principal: ShortSpec = {
	id: 'principal',
	composition: 'Short-Principal',
	durationSec: at(18),
	audio: 'audio/shorts/principal.wav',
	shots: [
		// ACTE 1 — L'accroche : le parcours entier, comme un fil de lumière parcouru d'un trait
		{id: 'accroche', start: 0, end: at(1), camera: {type: 'hold', cam: {kind: 'route'}, push: 0.12}, walk: {from: 0, to: TOTAL, ease: 'inOut', delay: 0.15, dur: 2.75}, line: 'comet', ghost: 0.55, photo: 'papa'},
		// ACTE 2 — La révélation : la France, le départ, l'arrivée
		{id: 'revelation', start: at(1), end: at(3), camera: {type: 'fly', from: {kind: 'route', dz: 0.12}, to: {kind: 'france'}, dur: 2.4, push: 0.08}, line: 'full', france: 1, departements: true, endpoints: true},
		// ACTE 3 — Le voyage
		{id: 'depart', start: at(3), end: at(4), camera: {type: 'fly', from: {kind: 'france', dz: 0.08}, to: {kind: 'walker', zoom: 12.1, headY: 0.6}, dur: 2.2}, walk: {from: 0, to: 2.0, delay: 2.0, ease: 'linear'}, line: 'walk', walker: true, ghost: 0.5, town: 'depart', counter: true},
		// Le voyage, d'un seul tenant : ralenti à chaque ville, accéléré entre elles
		journeyShot(at(4), at(9), 2.0, [[MONTAGE_TOWNS.principal[0], at(5)], [MONTAGE_TOWNS.principal[1], at(6)], [MONTAGE_TOWNS.principal[2], at(6, 3)], [MONTAGE_TOWNS.principal[3], at(7, 2)], [MONTAGE_TOWNS.principal[4], at(8, 1)]], CG + 6.75, {type: 'journey', zoomFast: 8.7, zoomTown: 10.9, zoomStart: 12.1, zoomEnd: 11.3}),
		// Recul : presque tout le chemin est fait
		{id: 'recul', start: at(9), end: at(10), camera: {type: 'fly', from: {kind: 'walker', zoom: 11.3, headY: 0.6}, to: {kind: 'route'}, dur: 2.0}, walk: {from: CG + 6.75, to: CG + 6.75}, line: 'walk', walker: true, ghost: 0.85, endpoints: true, counter: true},
		// ACTE 4 — Les derniers kilomètres, l'arrivée
		{id: 'approche', start: at(10), end: at(13), camera: {type: 'follow', zoom: [10.9, 12.45], headY: [0.6, 0.54], fly: {from: {kind: 'route'}, dur: 1.8}}, walk: {from: CG + 6.75, to: TOTAL, ease: 'out'}, line: 'walk', walker: true, ghost: 0.45, communes: 3, counter: true},
		{id: 'arrivee', start: at(13), end: at(14, 2), camera: {type: 'hold', cam: {kind: 'end', zoom: 12.45}, push: 0.22}, walk: {from: TOTAL, to: TOTAL}, line: 'walk', town: 'arrivee', counter: true, arrival: true},
		// ACTE 5 — Le message
		{id: 'message', start: at(14, 2), end: at(18), camera: {type: 'fly', from: {kind: 'end', zoom: 12.67}, to: {kind: 'route'}, dur: 2.0, push: 0.1}, line: 'full', dim: 0.6, photo: 'grandMere'},
	],
	texts: [
		{id: 'accroche-1', start: 0, end: at(0, 2.5), y: HOOK_MID, enter: 'words', lines: [
			{t: 'Elle vit avec', size: 'title', tone: 'dim', weight: 400},
			{t: 'la sclérose en plaques.', size: 'title', weight: 500},
		]},
		{id: 'accroche-2', start: at(0, 2.5), end: at(1, 3), y: HOOK_TOP, enter: 'words', lines: [
			{t: 'Son fils a décidé', size: 'title', weight: 400},
			{t: 'de marcher', size: 'title', weight: 400},
			{t: '556 KM', size: 'display', tone: 'accent', delay: 0.4},
			{t: 'pour elle.', size: 'title', weight: 600, delay: 1.2},
		]},
		{id: 'echelle', start: at(2), end: at(2, 3.7), y: HOOK_TOP, enter: 'land', lines: [
			{t: '6', size: 'figure', suffix: 'départements'},
			{t: '128', size: 'figure', suffix: 'communes traversées', delay: 0.8},
		]},
		{id: 'un-pas', start: at(3, 0.15), end: at(3, 2.3), y: 520, enter: 'blur', lines: [{t: 'Un pas après l’autre.', size: 'title', weight: 400}]},
		{id: 'reste', start: at(9, 1.5), end: at(10), y: 520, enter: 'words', lines: [{t: `Plus que ${remainingFrom(CG + 6.75)} km.`, size: 'title', weight: 500}]},
		{id: 'derniers', start: at(10, 0.5), end: at(11, 2), y: 520, enter: 'blur', lines: [{t: 'Les derniers', size: 'title', weight: 400}, {t: 'kilomètres.', size: 'title', weight: 400}]},
		{id: 'final-1', start: at(14, 3), end: at(16), y: 760, enter: 'blur', lines: [
			{t: '556 kilomètres.', size: 'title', weight: 400},
			{t: '**Chaque pas** compte.', size: 'title', weight: 500, delay: 0.8},
		]},
		{id: 'final-2', start: at(16), end: at(17), y: 760, enter: 'words', lines: [
			{t: 'Un pas pour maman.', size: 'title', weight: 500},
			{t: 'Pour la **SEP**.', size: 'title', weight: 500, delay: 0.8},
		]},
		{id: 'signature', start: at(17), end: at(18), y: 700, enter: 'blur', lines: [
			{t: 'Un pas pour maman', size: 'title', weight: 500},
			{t: '556 km pour la SEP', size: 'label', tone: 'dim', upper: true},
			{t: INSTAGRAM, size: 'label', weight: 600, delay: 0.5},
			{t: 'Partagez cette aventure.', size: 'label', tone: 'accent', weight: 500, delay: 1.0},
		]},
	],
};

// =============================================================================
// 2. SHORT 30 s — 30,4 s (9,5 mesures) : accroche encore plus directe, montage serré
// =============================================================================
const s30: ShortSpec = {
	id: 's30',
	composition: 'Short-30s',
	durationSec: at(9, 2),
	audio: 'audio/shorts/s30.wav',
	shots: [
		{id: 'accroche', start: 0, end: at(1), camera: {type: 'hold', cam: {kind: 'route'}, push: 0.12}, walk: {from: 0, to: TOTAL, ease: 'inOut', delay: 0.1, dur: 2.8}, line: 'comet', ghost: 0.55, photo: 'papa'},
		{id: 'revelation', start: at(1), end: at(2), camera: {type: 'fly', from: {kind: 'route', dz: 0.12}, to: {kind: 'france'}, dur: 1.9, push: 0.06}, line: 'full', france: 1, departements: true, endpoints: true},
		journeyShot(at(2), at(6), 0, [[MONTAGE_TOWNS.s30[0], at(3)], [MONTAGE_TOWNS.s30[1], at(3, 3)], [MONTAGE_TOWNS.s30[2], at(4, 2)], [MONTAGE_TOWNS.s30[3], at(5, 1)]], CG + 6.75, {type: 'journey', zoomFast: 8.8, zoomTown: 10.8, zoomEnd: 11.0, fly: {from: {kind: 'france', dz: 0.06}, dur: 1.4}}),
		{id: 'approche', start: at(6), end: at(7), camera: {type: 'follow', zoom: [11.0, 12.3], headY: [0.6, 0.54]}, walk: {from: CG + 6.75, to: TOTAL, ease: 'out'}, line: 'walk', walker: true, ghost: 0.45, communes: 2, counter: true},
		{id: 'arrivee', start: at(7), end: at(7, 3), camera: {type: 'hold', cam: {kind: 'end', zoom: 12.3}, push: 0.15}, walk: {from: TOTAL, to: TOTAL}, line: 'walk', town: 'arrivee', counter: true, arrival: true},
		{id: 'message', start: at(7, 3), end: at(9, 2), camera: {type: 'fly', from: {kind: 'end', zoom: 12.45}, to: {kind: 'route'}, dur: 1.8, push: 0.08}, line: 'full', dim: 0.6, photo: 'grandMere'},
	],
	texts: [
		{id: 'accroche-1', start: 0, end: at(0, 3), y: HOOK_TOP, enter: 'land', lines: [
			{t: '556 KM', size: 'display', tone: 'accent'},
			{t: 'à pied, pour sa maman.', size: 'title', weight: 500},
		]},
		{id: 'accroche-2', start: at(0, 3), end: at(1, 3), y: HOOK_MID, enter: 'words', lines: [
			{t: 'Elle vit avec', size: 'title', tone: 'dim', weight: 400},
			{t: 'la sclérose en plaques.', size: 'title', weight: 500},
		]},
		{id: 'final-1', start: at(7, 3), end: at(8, 2), y: 760, enter: 'blur', lines: [{t: '**Chaque pas** compte.', size: 'title', weight: 500}]},
		{id: 'signature', start: at(8, 2), end: at(9, 2), y: 700, enter: 'words', lines: [
			{t: 'Un pas pour maman.', size: 'title', weight: 500},
			{t: 'Pour la **SEP**.', size: 'title', weight: 500, delay: 0.5},
			{t: INSTAGRAM, size: 'label', weight: 600, delay: 1.1},
			{t: 'Partagez cette aventure.', size: 'label', tone: 'accent', weight: 500, delay: 1.5},
		]},
	],
};

// =============================================================================
// 3. TEASER 15 s — 15,2 s (4,75 mesures) : une seule idée, un seul trait de lumière
// =============================================================================
const teaser: ShortSpec = {
	id: 'teaser',
	composition: 'Teaser-15s',
	durationSec: at(4, 3),
	audio: 'audio/shorts/teaser.wav',
	shots: [
		{id: 'trait', start: 0, end: at(3), camera: {type: 'hold', cam: {kind: 'route'}, push: 0.2}, walk: {from: 0, to: TOTAL, ease: 'inOut', delay: at(0, 3), dur: at(3) - at(0, 3)}, line: 'walk', walker: true, ghost: 0.6, endpoints: true, photo: 'papa'},
		{id: 'arrivee', start: at(3), end: at(4, 3), camera: {type: 'hold', cam: {kind: 'route'}, push: 0.1}, walk: {from: TOTAL, to: TOTAL}, line: 'walk', arrival: true, dim: 0.55, photo: 'grandMere'},
	],
	texts: [
		{id: 'accroche-1', start: 0, end: at(0, 3), y: HOOK_MID, enter: 'words', lines: [
			{t: 'Elle vit avec', size: 'title', tone: 'dim', weight: 400},
			{t: 'la sclérose en plaques.', size: 'title', weight: 500},
		]},
		{id: 'compteur', start: at(0, 3), end: at(3, 1), y: HOOK_TOP, enter: 'words', lines: [
			{t: 'Son fils a décidé', size: 'title', weight: 400},
			{t: 'de marcher', size: 'title', weight: 400},
			{t: '{km} KM', size: 'display', tone: 'accent', live: true, delay: 0.3},
			{t: 'pour elle.', size: 'title', weight: 600, delay: 0.8},
		]},
		{id: 'final-1', start: at(3, 1), end: at(3, 3) + BAR * 0.25, y: 760, enter: 'blur', lines: [{t: '**Chaque pas** compte.', size: 'title', weight: 500}]},
		{id: 'signature', start: at(3, 3.25), end: at(4, 3), y: 700, enter: 'words', lines: [
			{t: 'Un pas pour maman.', size: 'title', weight: 500},
			{t: 'Pour la **SEP**.', size: 'title', weight: 500, delay: 0.4},
			{t: INSTAGRAM, size: 'label', weight: 600, delay: 0.9},
			{t: 'Partagez cette aventure.', size: 'label', tone: 'accent', weight: 500, delay: 1.2},
		]},
	],
};

export const SHORTS = {principal, s30, teaser};
export type ShortId = keyof typeof SHORTS;
