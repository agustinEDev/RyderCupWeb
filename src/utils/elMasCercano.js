const ORDEN_DE_FRANJA = { MORNING: 0, AFTERNOON: 1, EVENING: 2 };

/**
 * El que se juega antes de dos (FE #824, PR 7): el banner del panel enseña uno
 * solo, sea un partido de la Ryder o una partida de stroke play. Por día y,
 * en el mismo día, por franja; a igualdad, el primero.
 *
 * @param {{roundDate: string, sessionType: string}|null} a
 * @param {{roundDate: string, sessionType: string}|null} b
 */
export const elMasCercano = (a, b) => {
  if (!a || !b) return a ?? b ?? null;
  return porCuandoSeJuega(b, a) < 0 ? b : a;
};

/**
 * La misma regla como orden, para `sort` (FE #845): «Mis próximos partidos»
 * junta los de la Ryder y las partidas. Por día, franja y hora de salida; sin
 * hora (una sesión de la Ryder no la tiene) va antes que con ella.
 */
export const porCuandoSeJuega = (a, b) =>
  (a.roundDate || '').localeCompare(b.roundDate || '') ||
  // Sin franja conocida, la primera: como ordena la lista de la Ryder
  (ORDEN_DE_FRANJA[a.sessionType] ?? 0) - (ORDEN_DE_FRANJA[b.sessionType] ?? 0) ||
  (a.teeTime ?? '').localeCompare(b.teeTime ?? '');
