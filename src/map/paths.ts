// Build SVG path strings from mercator coordinates for the current camera,
// with viewport culling and screen-space simplification (keeps paths light at every zoom).
import {type Camera, type Merc, type Viewport, worldSize} from '../geo/mercator';

export type Projector = {
	s: number;
	ox: number;
	oy: number;
	x: (m: Merc) => number;
	y: (m: Merc) => number;
	vp: Viewport;
};

export const makeProjector = (cam: Camera, vp: Viewport): Projector => {
	const s = worldSize(cam.zoom);
	const ox = vp.width / 2 - cam.x * s;
	const oy = vp.height / 2 - cam.y * s;
	return {s, ox, oy, x: (m) => m.x * s + ox, y: (m) => m.y * s + oy, vp};
};

type Opts = {minDistPx?: number; marginPx?: number; closed?: boolean};

/** Polyline (or closed ring) → SVG path data. */
export const polylinePath = (pts: Merc[], P: Projector, opts: Opts = {}, upTo = pts.length, tail?: Merc) => {
	const {minDistPx = 0.6, marginPx = 120, closed = false} = opts;
	const W = P.vp.width + marginPx, H = P.vp.height + marginPx;
	const inside = (x: number, y: number) => x > -marginPx && x < W && y > -marginPx && y < H;
	let d = '';
	let lastX = NaN, lastY = NaN, pen = false, prevX = 0, prevY = 0, prevIn = false;
	const n = Math.min(upTo, pts.length);
	const count = n + (tail ? 1 : 0);
	const emit = (x: number, y: number, move: boolean) => {
		d += (move ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
		lastX = x;
		lastY = y;
	};
	for (let i = 0; i < count; i++) {
		const m = i < n ? pts[i] : (tail as Merc);
		const x = m.x * P.s + P.ox, y = m.y * P.s + P.oy;
		const isIn = inside(x, y);
		const isLast = i === count - 1;
		if (isIn || prevIn) {
			// the segment prev → current touches the viewport
			if (!pen) {
				if (i > 0) {
					emit(prevX, prevY, true);
					emit(x, y, false);
				} else {
					emit(x, y, true);
				}
				pen = true;
			} else if (isLast || !isIn || Math.hypot(x - lastX, y - lastY) >= minDistPx) {
				emit(x, y, false);
			}
		} else {
			pen = false;
		}
		prevX = x;
		prevY = y;
		prevIn = isIn;
	}
	if (closed && d) d += 'Z';
	return d;
};

export type MercPolygon = {rings: Merc[][]; bbox: {x0: number; y0: number; x1: number; y1: number}};

export const toMercPolygons = (geometry: {type: string; coordinates: unknown}, toMerc: (p: [number, number]) => Merc): MercPolygon[] => {
	const polys = (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as [number, number][][][];
	return polys.map((poly) => {
		const rings = poly.map((ring) => ring.map((p) => toMerc(p)));
		let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		for (const m of rings[0]) {
			if (m.x < x0) x0 = m.x;
			if (m.x > x1) x1 = m.x;
			if (m.y < y0) y0 = m.y;
			if (m.y > y1) y1 = m.y;
		}
		return {rings, bbox: {x0, y0, x1, y1}};
	});
};

/** Polygon set → SVG path (rings closed, culled when completely off-screen). */
export const polygonPath = (polys: MercPolygon[], P: Projector, minDistPx = 0.8) => {
	let d = '';
	for (const poly of polys) {
		const bx0 = poly.bbox.x0 * P.s + P.ox, bx1 = poly.bbox.x1 * P.s + P.ox;
		const by0 = poly.bbox.y0 * P.s + P.oy, by1 = poly.bbox.y1 * P.s + P.oy;
		if (bx1 < -50 || by1 < -50 || bx0 > P.vp.width + 50 || by0 > P.vp.height + 50) continue;
		if (bx1 - bx0 < 0.8 && by1 - by0 < 0.8) continue;
		for (const ring of poly.rings) {
			let lastX = NaN, lastY = NaN, first = true;
			for (let i = 0; i < ring.length; i++) {
				const x = ring[i].x * P.s + P.ox, y = ring[i].y * P.s + P.oy;
				if (first) {
					d += 'M' + x.toFixed(1) + ' ' + y.toFixed(1);
					first = false;
					lastX = x;
					lastY = y;
				} else if (Math.hypot(x - lastX, y - lastY) >= minDistPx) {
					d += 'L' + x.toFixed(1) + ' ' + y.toFixed(1);
					lastX = x;
					lastY = y;
				}
			}
			d += 'Z';
		}
	}
	return d;
};
