// Level-of-detail policy for the pre-rendered basemap tiles.
// For a camera zoom z we draw tiles of level hi = ceil(z) (scale 0.5–1 → always downsampled, crisp)
// over tiles of level lo = hi − 1, cross-fading so that switching level never pops.
export const MIN_TILE_Z = 4;
export const MAX_TILE_Z = 14;

const smoothstep = (a: number, b: number, x: number) => {
	const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

export const lodFor = (zoom: number) => {
	const hi = Math.max(MIN_TILE_Z + 1, Math.min(MAX_TILE_Z, Math.ceil(zoom - 1e-6)));
	const lo = hi - 1;
	const f = zoom - lo; // (0, 1] when within range
	const alphaHi = hi === MAX_TILE_Z && zoom > MAX_TILE_Z ? 1 : smoothstep(0.0, 0.45, f);
	return {hi, lo, alphaHi};
};
