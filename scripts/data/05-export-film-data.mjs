// Étape 5 — Export des données consommées par le film (src/data/*.json) et des livrables (dist/).
// Aucune donnée n'est créée ici : on ne fait que filtrer, simplifier pour l'affichage et reformater.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import * as turf from '@turf/turf';
import {cumulative, round, vincenty} from './lib/geo.mjs';

mkdirSync('src/data', {recursive: true});
mkdirSync('dist', {recursive: true});
mkdirSync('cache/geoapi', {recursive: true});
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const UA = 'un-pas-pour-maman-carto/1.0';

const trackFc = read('data/generated/track.geojson');
const line = trackFc.features[0];
const coords3 = line.geometry.coordinates;
const coords = coords3.map((c) => [c[0], c[1]]);
const cum = cumulative(coords, vincenty);
const totalKm = cum.at(-1) / 1000;
const raw = read('data/generated/communes-raw.json');
const mairies = read('data/generated/mairies.json').communes;
const gpx = read('data/generated/gpx-analysis.json');

// --- Populations INSEE (API Découpage administratif) — uniquement pour la hiérarchie typographique
const deps = [...new Set(mairies.map((m) => m.departement))];
const pop = new Map();
for (const d of deps) {
	const file = `cache/geoapi/communes-${d}.json`;
	if (!existsSync(file)) {
		const res = await fetch(`https://geo.api.gouv.fr/departements/${d}/communes?fields=code,nom,population,codesPostaux`, {headers: {'User-Agent': UA}});
		writeFileSync(file, JSON.stringify(await res.json()));
	}
	for (const c of read(file)) pop.set(c.code, {population: c.population ?? null, codesPostaux: c.codesPostaux ?? []});
}
const depNames = {'33': 'Gironde', '17': 'Charente-Maritime', '85': 'Vendée', '79': 'Deux-Sèvres', '49': 'Maine-et-Loire', '53': 'Mayenne'};

// --- Tracé pour le film : tous les points, ordre conservé, 6 décimales (~0,1 m)
writeFileSync('src/data/route.json', JSON.stringify({
	source: 'assets/data/Tracé détaillé Noaillan Cossé.gpx',
	points: coords.length,
	totalKmGpx: round(totalKm, 3),
	coords: coords.map((c) => [round(c[0], 6), round(c[1], 6)]),
	cumKm: Array.from(cum, (m) => round(m / 1000, 4)),
}));

// --- Waypoints, rattachés à la commune officielle qui les contient
const communeAtKm = (km) => raw.communes.find((c) => c.runs.some((r) => km >= r.fromKm && km <= r.toKm));
const waypoints = gpx.waypointsB.map((w) => {
	const c = communeAtKm(w.kmOnTrack);
	return {gpxName: w.name, gpxComment: w.cmt, lon: w.lon, lat: w.lat, km: w.kmOnTrack, communeCode: c?.code ?? null, communeNom: c?.nom ?? null, departement: c?.departement ?? null};
});
writeFileSync('src/data/waypoints.json', JSON.stringify(waypoints, null, 2));

// --- Communes (traversées + limites) avec mairies
const communes = mairies.map((m) => ({
	code: m.code,
	nom: m.nom,
	departement: m.departement,
	departementNom: depNames[m.departement] ?? m.departement,
	statut: m.statut,
	entreeKm: m.entreeKm,
	sortieKm: m.sortieKm,
	longueurM: m.longueurDansCommuneM,
	mairie: [m.mairie.lon, m.mairie.lat],
	mairieKm: m.kmPlusProcheMairie,
	mairieDistanceTraceM: m.mairieDistanceTraceM,
	population: pop.get(m.code)?.population ?? null,
	confiance: m.confiance,
	isWaypoint: waypoints.some((w) => w.communeCode === m.code),
}));
writeFileSync('src/data/communes.json', JSON.stringify(communes, null, 2));

// --- Polygones des communes du parcours (simplifiés ~15 m pour l'affichage uniquement)
const codes = new Set(communes.map((c) => c.code));
const polys = [];
for (const f of read('cache/official/communes-5m.geojson').features) {
	if (!codes.has(f.properties.code)) continue;
	const s = turf.simplify(f, {tolerance: 0.00015, highQuality: true});
	s.geometry.coordinates = JSON.parse(JSON.stringify(s.geometry.coordinates, (k, v) => (typeof v === 'number' ? round(v, 5) : v)));
	polys.push({type: 'Feature', properties: {code: f.properties.code, nom: f.properties.nom}, geometry: s.geometry});
}
writeFileSync('src/data/communes-polygons.json', JSON.stringify({type: 'FeatureCollection', features: polys}));

// --- Départements de métropole (100 m) — pour l'habillage
const depFc = read('cache/official/departements-100m.geojson');
// Métropole uniquement : codes à 2 caractères (01–95, 2A, 2B). Les DOM/COM ont 3 caractères.
const metro = depFc.features.filter((f) => f.properties.code.length === 2);
const depOut = metro.map((f) => {
	const s = turf.simplify(f, {tolerance: 0.0008, highQuality: false});
	s.geometry.coordinates = JSON.parse(JSON.stringify(s.geometry.coordinates, (k, v) => (typeof v === 'number' ? round(v, 4) : v)));
	return {type: 'Feature', properties: {code: f.properties.code, nom: f.properties.nom, parcours: Boolean(depNames[f.properties.code])}, geometry: s.geometry};
});
writeFileSync('src/data/departements.json', JSON.stringify({type: 'FeatureCollection', features: depOut}));

// --- Contour de la France métropolitaine (union des régions)
const regFc = read('cache/official/regions-100m.geojson');
const METRO_REGIONS = ['11', '24', '27', '28', '32', '44', '52', '53', '75', '76', '84', '93', '94'];
const regMetro = regFc.features.filter((f) => METRO_REGIONS.includes(f.properties.code));
if (regMetro.length !== 13) throw new Error('13 régions métropolitaines attendues');
let france = regMetro[0];
for (const f of regMetro.slice(1)) france = turf.union(turf.featureCollection([france, f]));
france = turf.simplify(france, {tolerance: 0.002, highQuality: false});
france.geometry.coordinates = JSON.parse(JSON.stringify(france.geometry.coordinates, (k, v) => (typeof v === 'number' ? round(v, 4) : v)));
writeFileSync('src/data/france.json', JSON.stringify({type: 'Feature', properties: {nom: 'France métropolitaine'}, geometry: france.geometry}));

// --- Villes de contexte (position de la mairie, IGN) — repères géographiques, distincts du parcours
// [nom exact, département, niveau d'affichage 1 = vue France, 2 = vue régionale, 3 = vue rapprochée]
const context = [
	['Paris', '75', 1], ['Bordeaux', '33', 1], ['Nantes', '44', 1], ['Rennes', '35', 2], ['Toulouse', '31', 1], ['Lyon', '69', 1],
	['La Rochelle', '17', 2], ['Niort', '79', 2], ['Poitiers', '86', 2], ['Laval', '53', 2], ['Le Mans', '72', 2], ['Tours', '37', 2],
	['Cholet', '49', 3], ['Angoulême', '16', 2], ['La Roche-sur-Yon', '85', 2], ['Rochefort', '17', 3], ['Royan', '17', 3], ['Libourne', '33', 3], ['Langon', '33', 3], ['Bressuire', '79', 3],
];
const mairiesAll = read('cache/official/mairies.geojson').features;
const ctx = context.map(([nom, dep, tier]) => {
	const found = mairiesAll.filter((x) => x.properties.nom === nom && x.properties.type === 'mairie' && x.properties.commune.startsWith(dep));
	if (found.length !== 1) throw new Error(`mairie ambiguë ou introuvable : ${nom} (${dep}) → ${found.length}`);
	const f = found[0];
	return {code: f.properties.commune, nom, tier, lonlat: f.geometry.coordinates, onRoute: codes.has(f.properties.commune)};
});
writeFileSync('src/data/context-cities.json', JSON.stringify(ctx, null, 2));

// --- Résumé
const trav = communes.filter((c) => c.statut === 'traversee');
const summary = {
	totalKmGpx: round(totalKm, 3),
	totalKmGpxHaversine: gpx.B.lengthKm.haversine,
	totalKmCommunication: 556,
	communesTraversees: trav.length,
	communesLimite: communes.length - trav.length,
	departements: [...new Set(trav.map((c) => c.departement))].map((d) => ({code: d, nom: depNames[d]})),
	start: {lonlat: coords[0], commune: communes[0].nom},
	end: {lonlat: coords.at(-1), commune: communes.at(-1).nom},
};
writeFileSync('src/data/summary.json', JSON.stringify(summary, null, 2));
console.log(summary);
console.log('Waypoints :', waypoints.map((w) => `${w.gpxName} → ${w.communeNom} (km ${w.km})`).join(' | '));
