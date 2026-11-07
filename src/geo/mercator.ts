// Web Mercator helpers shared by the film and the tile scripts.
// Conventions: lon/lat in degrees, [lon, lat] order (GeoJSON). "Merc" coordinates are
// normalised to [0, 1] (x eastwards, y southwards), independent of zoom.
// Zoom follows MapLibre semantics: at zoom z the world is TILE_SIZE * 2^z pixels wide.

export const TILE_SIZE = 512;

export type LonLat = [number, number];
export type Merc = {x: number; y: number};

const MAX_LAT = 85.0511287798;

export const toMerc = ([lon, lat]: LonLat): Merc => {
	const φ = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
	return {
		x: (lon + 180) / 360,
		y: 0.5 - Math.log(Math.tan(Math.PI / 4 + φ / 2)) / (2 * Math.PI),
	};
};

export const fromMerc = ({x, y}: Merc): LonLat => {
	const lon = x * 360 - 180;
	const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
	return [lon, lat];
};

export const worldSize = (zoom: number) => TILE_SIZE * 2 ** zoom;

export type Camera = {
	/** Centre in normalised mercator coordinates */
	x: number;
	y: number;
	zoom: number;
};

export type Viewport = {width: number; height: number};

/** Screen position (px) of a mercator point for a camera/viewport. */
export const project = (m: Merc, cam: Camera, vp: Viewport): [number, number] => {
	const s = worldSize(cam.zoom);
	return [(m.x - cam.x) * s + vp.width / 2, (m.y - cam.y) * s + vp.height / 2];
};

/** Metres per screen pixel at a latitude for a zoom level. */
export const metresPerPixel = (lat: number, zoom: number) =>
	(40075016.686 * Math.cos((lat * Math.PI) / 180)) / worldSize(zoom);

export type MercBounds = {x0: number; y0: number; x1: number; y1: number};

export const boundsOf = (pts: LonLat[]): MercBounds => {
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (const p of pts) {
		const m = toMerc(p);
		if (m.x < x0) x0 = m.x;
		if (m.x > x1) x1 = m.x;
		if (m.y < y0) y0 = m.y;
		if (m.y > y1) y1 = m.y;
	}
	return {x0, y0, x1, y1};
};

/**
 * Camera that fits mercator bounds inside the viewport.
 * padding is a fraction of the viewport on each side (top, right, bottom, left).
 */
export const fitBounds = (
	b: MercBounds,
	vp: Viewport,
	padding: {top: number; right: number; bottom: number; left: number} = {top: 0.1, right: 0.1, bottom: 0.1, left: 0.1},
): Camera => {
	const availW = vp.width * (1 - padding.left - padding.right);
	const availH = vp.height * (1 - padding.top - padding.bottom);
	const bw = Math.max(1e-9, b.x1 - b.x0);
	const bh = Math.max(1e-9, b.y1 - b.y0);
	const s = Math.min(availW / bw, availH / bh);
	const zoom = Math.log2(s / TILE_SIZE);
	// Offset the centre so that the bounds sit in the padded area
	const cxPx = (padding.left - padding.right) * vp.width * 0.5;
	const cyPx = (padding.top - padding.bottom) * vp.height * 0.5;
	return {
		x: (b.x0 + b.x1) / 2 - cxPx / s,
		y: (b.y0 + b.y1) / 2 - cyPx / s,
		zoom,
	};
};

/** Tiles (standard XYZ quadtree) visible for a camera at a given level of detail. */
export const visibleTiles = (cam: Camera, vp: Viewport, level: number, marginPx = 0) => {
	const s = worldSize(cam.zoom);
	const n = 2 ** level;
	const halfW = (vp.width / 2 + marginPx) / s;
	const halfH = (vp.height / 2 + marginPx) / s;
	const x0 = Math.max(0, Math.floor((cam.x - halfW) * n));
	const x1 = Math.min(n - 1, Math.floor((cam.x + halfW) * n));
	const y0 = Math.max(0, Math.floor((cam.y - halfH) * n));
	const y1 = Math.min(n - 1, Math.floor((cam.y + halfH) * n));
	const tiles: {z: number; x: number; y: number}[] = [];
	for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) tiles.push({z: level, x, y});
	return tiles;
};
