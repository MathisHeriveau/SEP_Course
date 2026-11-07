// Deterministic label placement for commune names during the journey.
// Computed once per format at the follow zoom: each label picks the first candidate position
// (side × vertical offset) that does not collide with labels shown at the same time or with markers.
import {FRAMING, type Format} from '../geo/camera';
import {worldSize} from '../geo/mercator';
import {COMMUNE_EVENTS} from './index';

export type LabelPlacement = {side: 1 | -1; dy: number; hidden: boolean};

const LABEL_LIFE = 4.2; // seconds a label stays on screen
const FONT = 21; // px at unit = 1 (see TYPE.label)
const GAP = 13;
const H = 44;

const textWidth = (s: string) => s.length * FONT * 0.56 + 6;

type Box = {x0: number; y0: number; x1: number; y1: number};
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

const cache = new Map<Format, Map<string, LabelPlacement>>();

export const labelPlacements = (format: Format) => {
	const hit = cache.get(format);
	if (hit) return hit;
	const scale = worldSize(FRAMING[format].followZoom);
	const placed: {code: string; t: number; box: Box}[] = [];
	const out = new Map<string, LabelPlacement>();
	const events = [...COMMUNE_EVENTS].sort((a, b) => a.tMairie - b.tMairie);
	for (const e of events) {
		const px = e.mairieMerc.x * scale, py = e.mairieMerc.y * scale;
		const w = textWidth(e.nom);
		const candidates: [1 | -1, number][] = [];
		for (const dy of [0, -0.62, 0.62, -1.25, 1.25]) for (const side of [e.labelSide, (-e.labelSide) as 1 | -1]) candidates.push([side, dy * H]);
		// obstacles: labels alive at the same time + markers already on screen
		const live = placed.filter((p) => Math.abs(p.t - e.tMairie) < LABEL_LIFE);
		const markers = events.filter((o) => o !== e && o.tMairie <= e.tMairie + LABEL_LIFE).map((o) => {
			const mx = o.mairieMerc.x * scale, my = o.mairieMerc.y * scale;
			return {x0: mx - 7, y0: my - 7, x1: mx + 7, y1: my + 7};
		});
		let best: {side: 1 | -1; dy: number; cost: number; box: Box} | null = null;
		for (const [side, dy] of candidates) {
			const box: Box = side === 1 ? {x0: px + GAP, x1: px + GAP + w, y0: py + dy - H / 2, y1: py + dy + H / 2} : {x0: px - GAP - w, x1: px - GAP, y0: py + dy - H / 2, y1: py + dy + H / 2};
			let cost = 0;
			for (const l of live) cost += overlap(box, l.box) * 4;
			for (const m of markers) cost += overlap(box, m);
			cost += Math.abs(dy) * 0.5; // prefer no offset
			if (!best || cost < best.cost) best = {side, dy, cost, box};
			if (cost < 1 && dy === 0) break;
		}
		if (!best) continue;
		const collides = live.some((l) => overlap(best.box, l.box) > 0.18 * (best.box.x1 - best.box.x0) * H);
		out.set(e.code, {side: best.side, dy: best.dy, hidden: collides});
		if (!collides) placed.push({code: e.code, t: e.tMairie, box: best.box});
	}
	cache.set(format, out);
	return out;
};
