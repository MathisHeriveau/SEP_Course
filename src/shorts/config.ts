// =============================================================================
// SHORTS — RÉGLAGES CENTRALISÉS (textes, photos, tempo, typographie, son)
// Les storyboards (plans, coupes, timings) sont dans ./storyboards.ts
// Le documentaire original n'utilise aucun de ces fichiers.
// =============================================================================

/** Tempo de la musique (identique au documentaire) : tous les timings sont calés sur la mesure. */
export const BPM = 75;
export const BEAT = 60 / BPM; // 0,8 s
export const BAR = 4 * BEAT; // 3,2 s
/** Instant (secondes) de la mesure `bar`, temps `beat` (la musique démarre à 0 s, sans silence). */
export const at = (bar: number, beat = 0) => (bar * 4 + beat) * BEAT;

/**
 * PHOTOS PERSONNELLES (optionnelles) — déposer les fichiers dans public/shorts/photos/
 * puis indiquer leur nom ici (ex. 'papa.jpg'). Laisser null tant qu'aucune photo authentique n'est fournie.
 *  - papa : apparaît derrière l'accroche (idéalement de dos, en marche, sur une route).
 *  - grandMere : apparaît sur « Un pas pour maman. » (portrait, ou mère et fils ensemble).
 * Aucune image n'est générée ni inventée : sans photo, le short reste entièrement cartographique.
 */
export const PHOTOS: {papa: string | null; grandMere: string | null} = {
	papa: null,
	grandMere: null,
};

/** Villes repères (waypoints du GPX) retenues pour le montage — noms exacts du GPX. */
export const MONTAGE_TOWNS = {
	principal: ['Saintes', 'Fontenay-le-C', 'Mauléon', 'Chalonnes', 'Château-Gontier'],
	s30: ['Saintes', 'Fontenay-le-C', 'Chalonnes', 'Château-Gontier'],
};

export const INSTAGRAM = '@unpaspourmaman.556kmspourlasep';

/** Typographie 9:16 (px pour 1080 × 1920) — cinq tailles, pas une de plus. */
export const SHORT_TYPE = {
	display: 232, // « 556 KM »
	figure: 120, // compteur
	title: 80, // phrases (lignes coupées à la main, 2 lignes max)
	label: 36, // noms de lieux secondaires, sous-titres
	note: 28, // mentions (plancher de lisibilité mobile)
};

/** Zones de sécurité TikTok / Reels / Shorts (px, 1080 × 1920). */
export const SAFE = {left: 80, right: 170, top: 300, bottom: 470};
/** Au-dessus de cette hauteur, pas de boutons d'interface à droite : la marge droite peut se réduire. */
export const UPPER_ZONE_END = 860;
export const UPPER_RIGHT = 80;
/** Éclaircissement du fond de carte pour la lecture sur téléphone (1 = identique au documentaire). */
export const MAP_BRIGHTNESS = 1.45;

export const SOUND = {
	/** -14 LUFS : niveau de référence des plateformes sociales */
	targetLufs: -14,
	footsteps: true,
	footstepsGain: 0.5,
	sfxGain: 1.0,
};
