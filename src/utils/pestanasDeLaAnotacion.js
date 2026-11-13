/**
 * Las pestañas de las tres anotaciones, en un solo sitio: las pantallas las pintan y la
 * anotación en curso (`anotacionEnCurso`) solo acepta guardar estas. Si una pantalla
 * añade o renombra una pestaña aquí, se puede guardar sin tocar nada más.
 */

/** Partido de torneo (`ScoringPage`). */
export const PESTANAS_DEL_PARTIDO = ['input', 'scorecard', 'leaderboard'];

/** Partida de stroke play (`GroupScoringPage`): quien juega y quien solo mira. */
export const PESTANAS_DE_LA_PARTIDA_DEL_JUGADOR = [
  'input',
  'standings',
  'cards',
];
export const PESTANAS_DE_LA_PARTIDA_DE_QUIEN_MIRA = ['cards', 'standings'];

/** Partida rápida (`QuickMatchScoringPage`). */
export const PESTANAS_DE_LA_RAPIDA = ['input', 'classification', 'scorecard'];

/** Todas, para validar lo guardado. */
export const TODAS_LAS_PESTANAS_DE_ANOTACION = new Set([
  ...PESTANAS_DEL_PARTIDO,
  ...PESTANAS_DE_LA_PARTIDA_DEL_JUGADOR,
  ...PESTANAS_DE_LA_PARTIDA_DE_QUIEN_MIRA,
  ...PESTANAS_DE_LA_RAPIDA,
]);
