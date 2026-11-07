// Étape 4 — Mairies des communes du parcours, recoupées entre 4 sources :
//   1. Annuaire de l'administration (DILA / service-public.fr) — source officielle principale (adresse + GPS)
//   2. Etalab « mairies.geojson » (contours-administratifs latest) — dérivé officiel
//   3. Base Adresse Nationale (BAN) — géocodage de l'adresse officielle de l'Annuaire
//   4. OpenStreetMap (amenity=townhall) — complément, situé dans le polygone communal
// Règle de choix :
//   - Annuaire confirmé (≤ 75 m) par OSM ou BAN → coordonnée Annuaire, confiance « élevée »
//   - Annuaire contredit, mais OSM et BAN concordants (≤ 75 m) → coordonnée OSM, confiance « moyenne », anomalie notée
//   - Sinon → meilleure source disponible, confiance « à vérifier »
// Rien n'est inventé : toute coordonnée provient d'une source nommée.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {cumulative, nearestOnLine, round, vincenty} from './lib/geo.mjs';

const UA = 'un-pas-pour-maman-carto/1.0 (documentary route map)';
const AGREE_M = 75;
mkdirSync('cache/annuaire', {recursive: true});
mkdirSync('cache/ban', {recursive: true});
mkdirSync('cache/osm', {recursive: true});

const raw = JSON.parse(readFileSync('data/generated/communes-raw.json', 'utf8'));
const cadastre = JSON.parse(readFileSync('data/generated/cadastre-check.json', 'utf8'));
const trackFc = JSON.parse(readFileSync('data/generated/track.geojson', 'utf8'));
const track = trackFc.features[0].geometry.coordinates.map((c) => [c[0], c[1]]);
const cum = cumulative(track, vincenty);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (url, cacheFile, opts = {}) => {
	if (cacheFile && existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'));
	for (let attempt = 0; attempt < 4; attempt++) {
		const res = await fetch(url, {headers: {'User-Agent': UA, Accept: 'application/json'}, ...opts});
		if (res.ok) {
			const j = await res.json();
			if (cacheFile) writeFileSync(cacheFile, JSON.stringify(j));
			return j;
		}
		await sleep(1500 * (attempt + 1));
	}
	throw new Error(`Échec ${url}`);
};

// --- Polygones communaux (pour vérifier que chaque mairie est dans sa commune) ---
const codes = new Set(raw.communes.map((c) => c.code));
const polysByCode = new Map();
{
	const fc = JSON.parse(readFileSync('cache/official/communes-5m.geojson', 'utf8'));
	for (const f of fc.features) if (codes.has(f.properties.code)) polysByCode.set(f.properties.code, f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
}
const inRing = (x, y, ring) => {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
};
const inCommune = (code, p) => (polysByCode.get(code) ?? []).some((poly) => inRing(p[0], p[1], poly[0]) && !poly.slice(1).some((h) => inRing(p[0], p[1], h)));

// --- Source 2 : Etalab mairies ---
const etalab = new Map();
for (const f of JSON.parse(readFileSync('cache/official/mairies.geojson', 'utf8')).features) {
	if (f.properties.type === 'mairie' && codes.has(f.properties.commune)) etalab.set(f.properties.commune, f.geometry.coordinates);
}

// --- Source 4 : OSM townhalls dans l'emprise ---
const osmFile = 'cache/osm/townhalls.json';
const osm = await getJson('https://overpass-api.de/api/interpreter', osmFile, {
	method: 'POST',
	headers: {'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded'},
	body: 'data=' + encodeURIComponent('[out:json][timeout:120];nwr["amenity"="townhall"](44.40,-1.10,48.05,-0.15);out center tags;'),
});
const townhalls = osm.elements.map((e) => ({
	id: `${e.type}/${e.id}`,
	lon: e.lon ?? e.center?.lon,
	lat: e.lat ?? e.center?.lat,
	tags: e.tags ?? {},
})).filter((t) => t.lon != null);
console.log(`OSM townhalls dans l'emprise : ${townhalls.length} (base OSM ${osm.osm3s?.timestamp_osm_base})`);

const isSecondary = (name = '') => /d[ée]l[ée]gu[ée]e|annexe|associ[ée]e|ancienne/i.test(name);

// --- Traitement par commune ---
const statusOf = (c) => {
	const chk = cadastre.results.find((r) => r.code === c.code);
	const depthAE = c.maxDepthCapped ? 300 : c.maxDepthM;
	if (depthAE >= 25 && (!chk || chk.cadastre.maxDepthM >= 25)) return 'traversee';
	return 'limite';
};

const out = [];
for (const c of raw.communes) {
	// Source 1 : Annuaire DILA
	const q = `code_insee_commune="${c.code}" and pivot like "mairie"`;
	const ann = await getJson(`https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records?where=${encodeURIComponent(q)}&limit=20`, `cache/annuaire/${c.code}.json`);
	const recs = (ann.results ?? []).map((r) => {
		const a = JSON.parse(r.adresse ?? '[]').find((x) => x.type_adresse === 'Adresse') ?? JSON.parse(r.adresse ?? '[]')[0] ?? {};
		return {nom: r.nom, id: r.id, pivot: r.ancien_code_pivot, url: r.url_service_public, numero_voie: a.numero_voie ?? '', complement: [a.complement1, a.complement2].filter(Boolean).join(', '), code_postal: a.code_postal ?? '', nom_commune: a.nom_commune ?? '', lon: a.longitude ? Number(a.longitude) : null, lat: a.latitude ? Number(a.latitude) : null};
	});
	const main = recs.find((r) => !isSecondary(r.nom) && /-01$/.test(r.pivot ?? '')) ?? recs.find((r) => !isSecondary(r.nom)) ?? recs[0] ?? null;
	const secondaries = recs.filter((r) => r !== main);

	// Source 3 : BAN — géocodage de l'adresse officielle
	let ban = null;
	if (main?.numero_voie) {
		const qq = `${main.numero_voie} ${main.code_postal} ${main.nom_commune}`.trim();
		const j = await getJson(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(qq)}&citycode=${c.code}&limit=1`, `cache/ban/${c.code}.json`);
		const f = j.features?.[0];
		if (f) ban = {lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], score: round(f.properties.score, 3), type: f.properties.type, label: f.properties.label};
	}

	// Source 4 : OSM — mairies situées dans le polygone de la commune
	const inPoly = townhalls.filter((t) => inCommune(c.code, [t.lon, t.lat]));
	const ref = main?.lon != null ? [main.lon, main.lat] : etalab.get(c.code);
	const rank = (t) => (isSecondary(t.tags.name) ? 1e6 : 0) + (t.tags['townhall:type'] && t.tags['townhall:type'] !== 'city' ? 1e5 : 0) + (ref ? vincenty(ref, [t.lon, t.lat]) : 0);
	const osmMain = [...inPoly].sort((a, b) => rank(a) - rank(b))[0] ?? null;

	// IGN = point « mairie » ADMIN EXPRESS (publié par Etalab). BAN retenue si géocodage au numéro,
	// ou à la voie avec un score ≥ 0,8 (ex. « Place de la Mairie »).
	const banOk = ban && ((ban.type === 'housenumber' && ban.score >= 0.5) || (ban.type === 'street' && ban.score >= 0.8));
	const P = {
		ign: etalab.get(c.code) ?? null,
		annuaire: main?.lon != null ? [main.lon, main.lat] : null,
		ban: banOk ? [ban.lon, ban.lat] : null,
		osm: osmMain ? [osmMain.lon, osmMain.lat] : null,
	};
	const d = (a, b) => (a && b ? round(vincenty(a, b), 1) : null);
	const dist = {ign_osm: d(P.ign, P.osm), ign_ban: d(P.ign, P.ban), ign_annuaire: d(P.ign, P.annuaire), osm_ban: d(P.osm, P.ban), annuaire_osm: d(P.annuaire, P.osm)};

	let chosen, source, confidence;
	const notes = [];
	const ok = (x) => x != null && x <= AGREE_M;
	const labels = {osm: 'OSM', ban: 'BAN', annuaire: 'Annuaire DILA'};
	if (P.ign) {
		chosen = P.ign; source = 'IGN ADMIN EXPRESS (via Etalab)';
		const conf = ['osm', 'ban', 'annuaire'].filter((k) => ok(dist[`ign_${k}`]));
		const near250 = ['osm', 'ban', 'annuaire'].filter((k) => dist[`ign_${k}`] != null && dist[`ign_${k}`] <= 250);
		if (conf.length) { confidence = 'élevée'; notes.push(`confirmée ${conf.map((k) => labels[k]).join(' + ')}`); }
		else if (near250.length) { confidence = 'moyenne'; notes.push(`écart ${near250.map((k) => `${labels[k]} ${dist[`ign_${k}`]} m`).join(', ')}`); }
		else { confidence = 'à vérifier'; notes.push(`aucune source à < 250 m du point IGN : ${JSON.stringify(dist)}`); }
	} else if (P.osm && (ok(dist.osm_ban) || ok(dist.annuaire_osm))) {
		chosen = P.osm; source = 'OpenStreetMap'; confidence = 'moyenne'; notes.push('pas de point IGN ; OSM confirmé');
	} else {
		chosen = P.annuaire ?? P.osm; source = P.annuaire ? 'Annuaire service-public (DILA)' : 'OpenStreetMap'; confidence = 'à vérifier';
		notes.push(`pas de point IGN ; sources : ${JSON.stringify(dist)}`);
	}
	if (dist.ign_annuaire != null && dist.ign_annuaire > 250) notes.push(`coordonnée GPS de l'Annuaire DILA erronée (à ${Math.round(dist.ign_annuaire)} m)`);
	let note = notes.join(' | ');
	const inside = chosen ? inCommune(c.code, chosen) : false;
	if (!inside) { confidence = 'à vérifier'; note += ' | mairie hors du polygone communal'; }
	const near = chosen ? nearestOnLine(chosen, track, cum) : null;

	out.push({
		code: c.code, nom: c.nom, departement: c.departement,
		statut: statusOf(c),
		entreeKm: c.entryKm, sortieKm: c.exitKm, longueurDansCommuneM: c.insideLengthM, passages: c.passages, profondeurMaxM: c.maxDepthCapped ? '≥300' : c.maxDepthM,
		mairie: chosen ? {lon: round(chosen[0], 7), lat: round(chosen[1], 7)} : null,
		mairieSource: source, confiance: confidence, note,
		mairieDansCommune: inside,
		mairieDistanceTraceM: near ? Math.round(near.d) : null,
		kmPlusProcheMairie: near ? round(near.km, 3) : null,
		adresse: main ? [main.numero_voie, main.complement, `${main.code_postal} ${main.nom_commune}`].filter(Boolean).join(', ') : null,
		annuaireNom: main?.nom ?? null, annuaireUrl: main?.url ?? null,
		mairiesSecondaires: secondaries.map((s) => s.nom),
		sources: {ign: P.ign, annuaire: P.annuaire, ban: ban ? {...ban} : null, osm: osmMain ? {id: osmMain.id, name: osmMain.tags.name ?? null, lon: osmMain.lon, lat: osmMain.lat} : null},
		ecartsM: dist,
	});
	process.stdout.write(`${c.code} ${c.nom.padEnd(30)} ${confidence.padEnd(10)} ${note}\n`);
}

writeFileSync('data/generated/mairies.json', JSON.stringify({generatedAt: new Date().toISOString(), agreementThresholdM: AGREE_M, osmTimestamp: osm.osm3s?.timestamp_osm_base, communes: out}, null, 2));
const by = (k) => out.reduce((m, x) => ((m[x[k]] = (m[x[k]] ?? 0) + 1), m), {});
console.log('\nConfiance :', by('confiance'), '\nStatut :', by('statut'));
