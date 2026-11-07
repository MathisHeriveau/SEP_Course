// Style cartographique « documentaire » — fond sombre, sans aucun libellé (les noms sont posés par le film).
// Données :
//  - OpenStreetMap via OpenFreeMap (schéma OpenMapTiles) — © contributeurs OpenStreetMap, ODbL
//  - Estompage IGN (BD ALTI 25 m, Géoplateforme) — Licence Ouverte Etalab 2.0
//  - Natural Earth II shaded relief (domaine public) pour les vues très larges
export const PALETTE = {
	land: '#161616',
	water: '#090b0f',
	waterLine: '#223039',
	wood: '#111411',
	residential: '#1d1d1c',
	motorway: '#363431',
	major: '#2a2928',
	secondary: '#232322',
	minor: '#1d1d1d',
	path: '#1a1a1a',
	rail: '#242424',
	border: '#4a4a4a',
	building: '#1b1b1b',
};

const z = (...stops) => ['interpolate', ['exponential', 1.6], ['zoom'], ...stops];

/** Version figée du jeu OpenFreeMap (reproductibilité). Voir https://tiles.openfreemap.org/planet */
export const OPENFREEMAP_VERSION = '20261101_080013_pt';

export const buildStyle = () => ({
	version: 8,
	name: 'Un pas pour maman — documentaire',
	sources: {
		omt: {type: 'vector', tiles: [`https://tiles.openfreemap.org/planet/${OPENFREEMAP_VERSION}/{z}/{x}/{y}.pbf`], minzoom: 0, maxzoom: 14},
		ne2: {type: 'raster', tiles: ['https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 6},
		ign: {
			type: 'raster',
			tiles: ['https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW&STYLE=estompage_grayscale&TILEMATRIXSET=PM_0_15&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png'],
			tileSize: 256,
			minzoom: 5,
			maxzoom: 15,
		},
	},
	layers: [
		{id: 'background', type: 'background', paint: {'background-color': PALETTE.land}},
		{
			id: 'relief-ne2', type: 'raster', source: 'ne2', maxzoom: 7.5,
			paint: {'raster-saturation': -1, 'raster-brightness-min': 0.025, 'raster-brightness-max': 0.115, 'raster-contrast': 0.25, 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 5.5, 1, 7.5, 0], 'raster-fade-duration': 0},
		},
		{
			id: 'relief-ign', type: 'raster', source: 'ign', minzoom: 5.5,
			paint: {'raster-saturation': -1, 'raster-brightness-min': 0.03, 'raster-brightness-max': 0.094, 'raster-contrast': 0.5, 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 5.5, 0, 7, 1], 'raster-fade-duration': 0, 'raster-resampling': 'linear'},
		},
		{id: 'wood', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'forest']]], paint: {'fill-color': PALETTE.wood, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.25, 10, 0.75], 'fill-antialias': true}},
		{id: 'wetland', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wetland'], paint: {'fill-color': '#121517', 'fill-opacity': 0.5}},
		{id: 'residential', type: 'fill', source: 'omt', 'source-layer': 'landuse', minzoom: 7, filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood', 'commercial', 'industrial', 'retail']]], paint: {'fill-color': PALETTE.residential, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.35, 11, 0.85]}},
		{id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', filter: ['!=', ['get', 'intermittent'], 1], paint: {'fill-color': PALETTE.water, 'fill-antialias': true}},
		{id: 'water-edge', type: 'line', source: 'omt', 'source-layer': 'water', minzoom: 9, filter: ['!=', ['get', 'intermittent'], 1], paint: {'line-color': '#1c242b', 'line-width': z(9, 0.3, 14, 0.9), 'line-opacity': 0.9}},
		{id: 'river', type: 'line', source: 'omt', 'source-layer': 'waterway', filter: ['==', ['get', 'class'], 'river'], layout: {'line-cap': 'round', 'line-join': 'round'}, paint: {'line-color': PALETTE.waterLine, 'line-width': z(6, 0.5, 9, 0.9, 12, 1.8, 14, 3.2)}},
		{id: 'canal', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 9, filter: ['==', ['get', 'class'], 'canal'], layout: {'line-cap': 'round'}, paint: {'line-color': PALETTE.waterLine, 'line-width': z(9, 0.5, 14, 2)}},
		{id: 'stream', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 11, filter: ['in', ['get', 'class'], ['literal', ['stream', 'drain', 'ditch']]], layout: {'line-cap': 'round'}, paint: {'line-color': '#181c20', 'line-width': z(11, 0.35, 14, 1.0)}},
		{id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 13, paint: {'fill-color': PALETTE.building, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 0.9]}},
		{id: 'path', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12.5, filter: ['in', ['get', 'class'], ['literal', ['path', 'track']]], layout: {'line-cap': 'round'}, paint: {'line-color': PALETTE.path, 'line-width': z(12.5, 0.4, 14, 0.9)}},
		{id: 'minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 10.5, filter: ['in', ['get', 'class'], ['literal', ['minor', 'service']]], layout: {'line-cap': 'round', 'line-join': 'round'}, paint: {'line-color': PALETTE.minor, 'line-width': z(10.5, 0.3, 12, 0.6, 14, 1.8)}},
		{id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 9, filter: ['==', ['get', 'class'], 'rail'], paint: {'line-color': PALETTE.rail, 'line-width': z(9, 0.4, 14, 1.2), 'line-dasharray': [3, 3]}},
		{id: 'secondary', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 8.5, filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]], layout: {'line-cap': 'round', 'line-join': 'round'}, paint: {'line-color': PALETTE.secondary, 'line-width': z(8.5, 0.3, 11, 0.8, 14, 2.6)}},
		{id: 'major', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 6.5, filter: ['in', ['get', 'class'], ['literal', ['primary', 'trunk']]], layout: {'line-cap': 'round', 'line-join': 'round'}, paint: {'line-color': PALETTE.major, 'line-width': z(6.5, 0.35, 10, 0.9, 14, 3.2)}},
		{id: 'motorway', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 5.5, filter: ['==', ['get', 'class'], 'motorway'], layout: {'line-cap': 'round', 'line-join': 'round'}, paint: {'line-color': PALETTE.motorway, 'line-width': z(5.5, 0.4, 10, 1.2, 14, 3.8)}},
		{id: 'border', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], layout: {'line-join': 'round'}, paint: {'line-color': PALETTE.border, 'line-width': z(4, 0.6, 10, 1.4), 'line-dasharray': [4, 2]}},
	],
});
