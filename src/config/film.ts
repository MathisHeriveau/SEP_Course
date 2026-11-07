// =============================================================================
// CHRONOLOGIE ET TEXTES DU FILM — modifiable sans toucher au reste du code.
// Toutes les durées sont en secondes. Les textes sont en français, typographie soignée
// (espaces insécables fines   avant « km » et dans les nombres).
// =============================================================================

export const FPS = 30;

/** Distance de communication du projet (affichée à l'écran). */
export const KM_COMMUNICATION = 556;

/**
 * Mode d'affichage du compteur kilométrique :
 *  - 'communication' : le compteur progresse proportionnellement le long du tracé GPX
 *     et atteint exactement 556 km à l'arrivée (valeur de communication du projet).
 *  - 'gpx' : le compteur affiche la distance mesurée sur le GPX (≈ 561,3 km à l'arrivée).
 * ⚠ Choix à valider par la famille (voir README).
 */
export const KM_DISPLAY_MODE: 'communication' | 'gpx' = 'communication';

/** Afficher aussi les 13 communes dont le tracé ne fait que longer la limite. */
export const SHOW_BOUNDARY_COMMUNES = false;

export const INSTAGRAM_HANDLE = '@unpaspourmaman.556kmspourlasep';

export const TIMELINE = {
	// --- Séquence 1 — L'émotion
	line1: [1.6, 7.4] as const,
	line2a: [8.0, 14.6] as const, // « 556 kilomètres. »
	line2b: [9.6, 14.6] as const, // « Un défi. Une famille. Une cause. »
	title: [15.2, 21.6] as const,

	// --- Séquence 2 — Le départ
	mapIn: [19.6, 23.0] as const, // fondu d'apparition de la carte
	overview: [19.6, 26.5] as const, // vue France
	ghostRoute: [21.4, 24.6] as const, // le tracé complet se dessine en filigrane
	overviewTitle: [22.4, 27.4] as const, // « 556 km » sur la vue France
	flyToStart: [26.5, 34.0] as const,
	departCard: [32.6, 41.0] as const,

	// --- Séquences 3 et 4 — Le parcours et l'arrivée
	journey: [40.0, 136.0] as const, // km 0 → arrivée
	arrivalCard: [136.0, 147.0] as const,

	// --- Séquence 5 — Le message final
	pullBack: [146.0, 153.5] as const,
	statsCard: [152.0, 160.5] as const,
	credits: [160.0, 171.5] as const,
	finalText: [171.0, 182.5] as const,
	titleEnd: [182.0, 189.5] as const,
	end: 190.0,
};

export const DURATION_IN_FRAMES = Math.round(TIMELINE.end * FPS);

export const TEXTS = {
	line1: 'Certaines histoires méritent qu’on aille plus loin.',
	line2a: '556 kilomètres.',
	line2b: ['Un défi.', 'Une famille.', 'Une cause.'],
	title: 'Un pas pour maman',
	subtitle: '556 km pour la SEP',
	departLabel: 'Départ',
	arrivalLabel: 'Arrivée',
	finalLines: ['556 kilomètres.', 'Chaque pas compte.', 'Chaque pas est pour elle.'],
	creditsTitle: 'Les communes du parcours',
	overviewKicker: 'Le parcours',
	overviewSub: 'De Noaillan à Cossé-le-Vivien',
};

/** Ralentissements de la progression (zones où la caméra « respire »). */
export const PACING = {
	waypointWeight: 2.4, // temps supplémentaire autour de chaque ville repère
	waypointSigmaKm: 4.5,
	startWeight: 5,
	startSigmaKm: 5,
	endWeight: 5.5,
	endSigmaKm: 9,
};
