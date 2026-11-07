// =============================================================================
// DIRECTION ARTISTIQUE — palette, typographie, tailles. Modifiable ici uniquement.
// =============================================================================

export const COLORS = {
	black: '#060606',
	anthracite: '#161616',
	offWhite: '#EEE9E1',
	offWhiteDim: 'rgba(238, 233, 225, 0.62)',
	offWhiteFaint: 'rgba(238, 233, 225, 0.32)',
	/** Couleur d'accent du parcours — l'orange est la couleur de sensibilisation à la SEP. */
	accent: '#F2913D',
	accentGlow: '#FF7A1A',
	/** Touche de rouge réservée aux villes repères et à l'arrivée. */
	red: '#E2493B',
	context: 'rgba(238, 233, 225, 0.42)',
};

export const FONTS = {
	title: '"Inter Tight", "Inter", sans-serif',
	text: '"Inter", sans-serif',
};

/**
 * Échelle typographique, exprimée pour une vidéo 1920×1080.
 * Elle est multipliée par `unit` (voir useLayout) pour les autres formats.
 */
export const TYPE = {
	hero: 76,
	title: 58,
	sentence: 44,
	card: 52,
	cardSmall: 20,
	label: 21,
	labelSmall: 15,
	counter: 64,
	hud: 17,
	credits: 19,
};
