// Étape 6 — Livrables de données dans dist/ : parcours.geojson, communes-mairies.csv, communes-proches.csv
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {round} from './lib/geo.mjs';

mkdirSync('dist', {recursive: true});
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const track = read('data/generated/track.geojson');
const gpx = read('data/generated/gpx-analysis.json');
const raw = read('data/generated/communes-raw.json');
const mairies = read('data/generated/mairies.json');
const cadastre = read('data/generated/cadastre-check.json');
const waypoints = read('src/data/waypoints.json');
const communesFilm = read('src/data/communes.json');
const KM_COMM = 556;
const totalGpx = gpx.B.lengthKm.vincentyWgs84;
const kmComm = (km) => round((km / totalGpx) * KM_COMM, 1);

// ---------------------------------------------------------------------------
// parcours.geojson
// ---------------------------------------------------------------------------
const line = track.features[0];
const coords = line.geometry.coordinates;
const features = [
	{
		type: 'Feature',
		properties: {
			type: 'parcours',
			nom: 'Un pas pour maman — 556 km pour la SEP',
			source: 'Tracé détaillé Noaillan Cossé.gpx (Garmin Connect, 2026-10-21)',
			points: coords.length,
			ordre_conserve: true,
			longueur_gpx_km_wgs84: totalGpx,
			longueur_gpx_km_haversine: gpx.B.lengthKm.haversine,
			distance_communication_km: KM_COMM,
			altitude: 'mètres, telle que fournie par le GPX',
			identique_a: `Projet SEP Noaillan Cossé.gpx (écart max ${gpx.comparison.deviationOfAfromB_m.max} m)`,
		},
		geometry: {type: 'LineString', coordinates: coords.map((c) => [round(c[0], 7), round(c[1], 7), c[2] == null ? null : round(c[2], 2)])},
	},
	{type: 'Feature', properties: {type: 'depart', nom: 'Départ', commune: 'Noaillan', departement: 'Gironde (33)', km_gpx: 0}, geometry: {type: 'Point', coordinates: coords[0].slice(0, 2)}},
	{type: 'Feature', properties: {type: 'arrivee', nom: 'Arrivée', commune: 'Cossé-le-Vivien', departement: 'Mayenne (53)', km_gpx: totalGpx, km_communication: KM_COMM}, geometry: {type: 'Point', coordinates: coords.at(-1).slice(0, 2)}},
	...waypoints.map((w, i) => ({
		type: 'Feature',
		properties: {type: 'waypoint_gpx', ordre: i + 1, nom_gpx: w.gpxName, commentaire_gpx: w.gpxComment, commune: w.communeNom, code_insee: w.communeCode, km_gpx: w.km, km_communication: kmComm(w.km)},
		geometry: {type: 'Point', coordinates: [w.lon, w.lat]},
	})),
	...mairies.communes.map((m, i) => ({
		type: 'Feature',
		properties: {type: 'mairie', ordre: i + 1, code_insee: m.code, commune: m.nom, departement: m.departement, statut: m.statut === 'traversee' ? 'traversée' : 'limite longée', km_gpx_plus_proche: m.kmPlusProcheMairie, distance_trace_m: m.mairieDistanceTraceM, source: m.mairieSource, confiance: m.confiance},
		geometry: {type: 'Point', coordinates: [m.mairie.lon, m.mairie.lat]},
	})),
];
writeFileSync('dist/parcours.geojson', JSON.stringify({type: 'FeatureCollection', name: 'parcours-un-pas-pour-maman', crs: {type: 'name', properties: {name: 'urn:ogc:def:crs:OGC:1.3:CRS84'}}, features}));

// ---------------------------------------------------------------------------
// communes-mairies.csv (UTF-8 avec BOM, séparateur « ; » pour Excel en français)
// ---------------------------------------------------------------------------
const csvCell = (v) => {
	if (v === null || v === undefined) return '';
	const s = String(v);
	return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows) => '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
const depNom = {'33': 'Gironde', '17': 'Charente-Maritime', '85': 'Vendée', '79': 'Deux-Sèvres', '49': 'Maine-et-Loire', '53': 'Mayenne'};

const header = [
	'ordre', 'code_insee', 'commune', 'departement', 'statut', 'ville_repere_gpx',
	'km_entree_gpx', 'km_sortie_gpx', 'km_mairie_gpx', 'km_mairie_communication_556',
	'longueur_dans_commune_m', 'passages', 'penetration_max_m', 'penetration_max_cadastre_m',
	'mairie_latitude', 'mairie_longitude', 'mairie_adresse', 'mairie_distance_trace_m', 'mairie_dans_commune',
	'source_coordonnees', 'confiance', 'confirmations', 'ecart_ign_osm_m', 'ecart_ign_ban_m', 'ecart_ign_annuaire_m', 'remarques',
	'population_insee', 'fiche_annuaire',
];
const rows = [header];
mairies.communes.forEach((m, i) => {
	const rawC = raw.communes.find((c) => c.code === m.code);
	const cad = cadastre.results.find((r) => r.code === m.code);
	const film = communesFilm.find((c) => c.code === m.code);
	const wp = waypoints.find((w) => w.communeCode === m.code);
	const notes = m.note.split(' | ');
	const remarks = [];
	if (m.statut !== 'traversee') remarks.push('le tracé suit la limite communale sans y pénétrer franchement (≤ 25 m, confirmé par le cadastre)');
	remarks.push(...notes.filter((n) => !n.startsWith('confirmée')));
	if (m.mairiesSecondaires.length) remarks.push(`autres mairies (déléguées) : ${m.mairiesSecondaires.map((x) => x.replace(/^Mairie déléguée - /, '')).join(', ')}`);
	rows.push([
		i + 1, m.code, m.nom, `${depNom[m.departement]} (${m.departement})`, m.statut === 'traversee' ? 'traversée' : 'limite longée', wp ? wp.gpxName : '',
		m.entreeKm, m.sortieKm, m.kmPlusProcheMairie, kmComm(m.kmPlusProcheMairie),
		m.longueurDansCommuneM, m.passages, rawC.maxDepthCapped ? '≥300' : rawC.maxDepthM, cad ? cad.cadastre.maxDepthM : '',
		m.mairie.lat, m.mairie.lon, m.adresse, m.mairieDistanceTraceM, m.mairieDansCommune ? 'oui' : 'non',
		m.mairieSource, m.confiance, notes.filter((n) => n.startsWith('confirmée')).join('').replace('confirmée ', ''),
		m.ecartsM.ign_osm, m.ecartsM.ign_ban, m.ecartsM.ign_annuaire, remarks.join(' ; '),
		film?.population ?? '', m.annuaireUrl ?? '',
	]);
});
writeFileSync('dist/communes-mairies.csv', toCsv(rows));

// Communes proches (≤ 1 km) non pénétrées par le tracé
const near = [['code_insee', 'commune', 'departement', 'distance_min_limite_communale_m', 'au_km_gpx']];
for (const c of raw.communesProchesNonTraversees) near.push([c.code, c.nom, `${depNom[c.departement] ?? ''} (${c.departement})`, c.minDistanceM, c.atKm]);
writeFileSync('dist/communes-proches-non-traversees.csv', toCsv(near));

// Communes déléguées / associées traversées (information complémentaire)
const del = [['code_insee', 'commune_deleguee_ou_associee', 'type', 'km_entree_gpx', 'km_sortie_gpx', 'longueur_m']];
for (const c of raw.communesDelegueesOuAssociees) del.push([c.code, c.nom, c.type, c.entryKm, c.exitKm, c.insideLengthM]);
writeFileSync('dist/communes-deleguees-traversees.csv', toCsv(del));

console.log(`parcours.geojson : ${features.length} entités — communes-mairies.csv : ${rows.length - 1} lignes — proches : ${near.length - 1} — déléguées : ${del.length - 1}`);
