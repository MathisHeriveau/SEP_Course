import {useVideoConfig} from 'remotion';

export const useLayout = () => {
	const {width, height, fps} = useVideoConfig();
	const portrait = height > width;
	const unit = Math.min(width, height) / 1080;
	// Marges de sécurité (Instagram masque le haut et le bas en 9:16)
	const safe = portrait
		? {left: 72 * unit, right: 72 * unit, top: 250 * unit, bottom: 360 * unit}
		: {left: 104 * unit, right: 104 * unit, top: 84 * unit, bottom: 92 * unit};
	return {width, height, fps, portrait, unit, safe, vp: {width, height}};
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

/** Opacity envelope for an element living in [a, b] with fade in/out durations (seconds). */
export const envelope = (t: number, [a, b]: readonly [number, number], fadeIn = 0.8, fadeOut = 0.8) => {
	const i = ramp(t, a, a + fadeIn);
	const o = 1 - ramp(t, b - fadeOut, b);
	const e = Math.min(i, o);
	return e * e * (3 - 2 * e);
};
