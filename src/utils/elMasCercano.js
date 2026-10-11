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
  const porDia = (a.roundDate || '').localeCompare(b.roundDate || '');
  if (porDia !== 0) return porDia < 0 ? a : b;
  return (ORDEN_DE_FRANJA[b.sessionType] ?? 9) < (ORDEN_DE_FRANJA[a.sessionType] ?? 9) ? b : a;
};
