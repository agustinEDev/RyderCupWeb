/**
 * Si en una partida rápida se puede anotar una raya (hoyo recogido sin acabar).
 *
 * Como `allows_picked_up_holes` del backend: en Stableford sí —recoger cuando
 * ya no se puntúa es lo normal— y en match play también, donde recoger es
 * conceder el hoyo. En Medal no: hay que embocar en todos los hoyos.
 *
 * Se dice qué SÍ la permite y no qué no: una partida que aún no ha cargado, o
 * sin formato, no la ofrece (Agustín, 23 oct 2026: «que la raya no salga ya en
 * Medal, no demos la oportunidad de que falle»).
 *
 * @param {?{scoringFormat: ?string, matchFormat: ?string}} partida
 * @returns {boolean}
 */
export const permiteLaRaya = (partida) =>
  partida != null && (partida.matchFormat != null || partida.scoringFormat === 'STABLEFORD');
